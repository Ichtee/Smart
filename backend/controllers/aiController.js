const { generate, AiError } = require('../utils/gemini');
const { buildUserContext } = require('../utils/aiContext');
const { sanitizeItem } = require('../utils/nutrition');
const { cleanMealPlan } = require('../utils/mealPlan');
const { cleanUserRoutine, DAYS } = require('../utils/userRoutine');
const Exercise = require('../models/Exercise');

const handleError = (res, err, label) => {
  if (err instanceof AiError) return res.status(err.status).json({ message: err.message });
  console.error(`${label} error:`, err);
  return res.status(500).json({ message: 'Server error' });
};

const MAX_CHAT_MESSAGES = 20;
const MAX_CHAT_TEXT = 2000;

const CHAT_SYSTEM = `Bạn là huấn luyện viên thể hình và dinh dưỡng trong ứng dụng MyFitness. Trả lời ngắn gọn, thực tế, bằng ngôn ngữ người dùng đang dùng. Dựa vào dữ liệu người dùng bên dưới khi liên quan. Không chẩn đoán bệnh; khi có dấu hiệu vấn đề sức khỏe, khuyên gặp bác sĩ. Từ chối lịch sự các câu hỏi không liên quan đến tập luyện, dinh dưỡng, sức khỏe.

Dữ liệu người dùng:
`;

// @desc    Ask the AI coach (the client sends the whole conversation each time)
// @route   POST /api/ai/chat
// @access  Private
const chat = async (req, res) => {
  try {
    const { messages } = req.body;
    const valid = Array.isArray(messages)
      && messages.length >= 1 && messages.length <= MAX_CHAT_MESSAGES
      && messages.every(m => m && (m.role === 'user' || m.role === 'model')
        && typeof m.text === 'string' && m.text.trim() !== '' && m.text.length <= MAX_CHAT_TEXT)
      && messages[messages.length - 1].role === 'user';
    if (!valid) {
      return res.status(400).json({ message: `Cần 1-${MAX_CHAT_MESSAGES} tin nhắn (mỗi tin tối đa ${MAX_CHAT_TEXT} ký tự), tin cuối là của người dùng.` });
    }

    const reply = await generate({
      system: CHAT_SYSTEM + await buildUserContext(req.user),
      contents: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      maxOutputTokens: 2048, // a ceiling, not a target: larger models write longer Vietnamese replies and got cut off at 800
    });
    return res.status(200).json({ reply });
  } catch (err) {
    return handleError(res, err, 'chat');
  }
};

const MAX_MEAL_TEXT = 500;
const MAX_IMAGE_CHARS = 1500000;
const MAX_MEAL_ITEMS = 20;
const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const MEAL_SYSTEM = 'Bạn ước tính dinh dưỡng món ăn. Liệt kê từng món riêng, ước tính khẩu phần thực tế và calo, protein, carbs, fat (gram) cho đúng khẩu phần đó. Tên món bằng tiếng Việt.';

const MEAL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' }, quantity: { type: 'STRING' }, calories: { type: 'NUMBER' },
          protein: { type: 'NUMBER' }, carbs: { type: 'NUMBER' }, fat: { type: 'NUMBER' },
        },
        required: ['name', 'quantity', 'calories'],
      },
    },
  },
  required: ['items'],
};

const roundTo = (v, decimals) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(decimals)) : v);

// AI food list -> clean items without ids (the caller assigns them); invalid items are dropped
const cleanAiItems = (list) => {
  const items = [];
  for (const raw of Array.isArray(list) ? list : []) {
    if (!raw || typeof raw !== 'object') continue;
    const { item } = sanitizeItem({
      ...raw,
      calories: roundTo(raw.calories, 0),
      protein: roundTo(raw.protein, 1),
      carbs: roundTo(raw.carbs, 1),
      fat: roundTo(raw.fat, 1),
    }, 'AI');
    if (!item) continue;
    delete item.id;
    items.push(item);
    if (items.length === MAX_MEAL_ITEMS) break;
  }
  return items;
};

// @desc    Estimate foods + macros from a description and/or a photo (nothing is saved)
// @route   POST /api/ai/meal
// @access  Private
const parseMeal = async (req, res) => {
  try {
    const { text, image } = req.body;
    const hasText = typeof text === 'string' && text.trim() !== '';
    if (!hasText && !image) return res.status(400).json({ message: 'Hãy nhập mô tả món ăn hoặc chọn ảnh.' });
    if (text !== undefined && (typeof text !== 'string' || text.length > MAX_MEAL_TEXT)) {
      return res.status(400).json({ message: `Mô tả tối đa ${MAX_MEAL_TEXT} ký tự.` });
    }

    const parts = [];
    if (image !== undefined) {
      const match = typeof image === 'string' && image.length <= MAX_IMAGE_CHARS + 50 ? IMAGE_RE.exec(image) : null;
      if (!match || match[2].length > MAX_IMAGE_CHARS) {
        return res.status(400).json({ message: 'Ảnh không hợp lệ hoặc quá lớn (jpeg/png/webp).' });
      }
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (hasText) parts.push({ text: text.trim() });

    const result = await generate({
      system: MEAL_SYSTEM,
      contents: [{ role: 'user', parts }],
      schema: MEAL_SCHEMA,
      maxOutputTokens: 2048, // thinking models spend ~500-800 of these before answering
    });

    const items = cleanAiItems(result.items); // the client assigns ids
    if (items.length === 0) return res.status(422).json({ message: 'Không nhận ra món ăn nào, hãy thử mô tả rõ hơn.' });
    return res.status(200).json({ items });
  } catch (err) {
    return handleError(res, err, 'parseMeal');
  }
};

const EQUIPMENT = {
  gym: 'phòng gym đầy đủ',
  dumbbells: 'chỉ có tạ đơn ở nhà',
  bodyweight: 'không dụng cụ',
};
const MAX_ROUTINE_NOTES = 300;

const ROUTINE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    description: { type: 'STRING' },
    schedule: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'STRING', enum: DAYS },
          name: { type: 'STRING' },
          isRestDay: { type: 'BOOLEAN' },
          exercises: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                exerciseId: { type: 'STRING' }, sets: { type: 'INTEGER' },
                repsRange: { type: 'STRING' }, restTimeSeconds: { type: 'INTEGER' },
              },
              required: ['exerciseId', 'sets', 'repsRange', 'restTimeSeconds'],
            },
          },
        },
        required: ['day', 'name', 'isRestDay', 'exercises'],
      },
    },
  },
  required: ['name', 'description', 'schedule'],
};

// @desc    Draft a routine from the exercise library (nothing is saved; the client saves it via /api/routines/mine)
// @route   POST /api/ai/routine
// @access  Private
const generateRoutine = async (req, res) => {
  try {
    const { daysPerWeek, equipment, notes } = req.body;
    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 6
      || !Object.prototype.hasOwnProperty.call(EQUIPMENT, equipment)
      || (notes !== undefined && (typeof notes !== 'string' || notes.length > MAX_ROUTINE_NOTES))) {
      return res.status(400).json({ message: `Cần daysPerWeek từ 1 đến 6, equipment (${Object.keys(EQUIPMENT).join('/')}), ghi chú tối đa ${MAX_ROUTINE_NOTES} ký tự.` });
    }

    const exercises = await Exercise.find().select('name muscle equipment').lean();
    const byId = new Map(exercises.map(e => [String(e._id), e]));
    const library = exercises.map(e => `${e._id}|${e.name}|${e.muscle}|${e.equipment || ''}`).join('\n');
    const goal = req.user.goal || 'chưa đặt';

    const system = `Bạn là huấn luyện viên tạo lịch tập tuần. Tạo đúng ${daysPerWeek} ngày tập (các ngày còn lại bỏ trống hoặc là ngày nghỉ). Chỉ dùng exerciseId có trong danh sách bài tập (định dạng id|tên|nhóm cơ|dụng cụ). Số lần mỗi hiệp (repsRange) phải là MỘT SỐ CỐ ĐỊNH (VD "10"), tuyệt đối không dùng khoảng như "8-12". Chọn số hiệp, số lần và thời gian nghỉ phù hợp mục tiêu. Tên lịch và tên buổi tập bằng tiếng Việt.

Mục tiêu người dùng: ${goal}
Dụng cụ: ${EQUIPMENT[equipment]}
Ghi chú: ${(notes || '').trim() || 'không'}

Danh sách bài tập:
${library}`;

    const result = await generate({
      system,
      contents: [{ role: 'user', parts: [{ text: 'Hãy tạo lịch tập.' }] }],
      schema: ROUTINE_SCHEMA,
      maxOutputTokens: 8192, // thinking models spend ~500-800 of these before answering
    });

    const schedule = (Array.isArray(result.schedule) ? result.schedule : []).map(d => ({
      ...d,
      exercises: (Array.isArray(d && d.exercises) ? d.exercises : []).flatMap(e => {
        const known = e && byId.get(String(e.exerciseId));
        return known ? [{ ...e, exerciseName: known.name, muscle: known.muscle }] : [];
      }),
    }));
    const { routine, error } = cleanUserRoutine({ name: result.name, description: result.description, schedule });
    if (error) {
      console.error('generateRoutine: AI routine rejected:', error);
      throw new AiError(502, 'AI không phản hồi hợp lệ, vui lòng thử lại.');
    }
    return res.status(200).json({ routine });
  } catch (err) {
    return handleError(res, err, 'generateRoutine');
  }
};

const MAX_PLAN_NOTES = 300;
const PLAN_MEALS = { breakfast: 'Bữa Sáng', lunch: 'Bữa Trưa', dinner: 'Bữa Tối', snack: 'Ăn Vặt' };

const ITEMS_SCHEMA = { type: 'ARRAY', items: MEAL_SCHEMA.properties.items.items };
const MEAL_PLAN_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    description: { type: 'STRING' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: Object.fromEntries(Object.keys(PLAN_MEALS).map(key => [key, ITEMS_SCHEMA])),
        required: Object.keys(PLAN_MEALS),
      },
    },
  },
  required: ['name', 'description', 'days'],
};

const intBetween = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const BAD_PLAN = 'AI không phản hồi hợp lệ, vui lòng thử lại.';

// @desc    Draft a meal plan (nothing is saved; the client saves it via /api/meal-plans)
// @route   POST /api/ai/meal-plan
// @access  Private
const generateMealPlan = async (req, res) => {
  try {
    const { days, targetCalories, proteinG, budgetPerDay, notes } = req.body;
    if (!intBetween(days, 1, 7) || !intBetween(targetCalories, 1000, 6000)
      || (proteinG !== undefined && !intBetween(proteinG, 0, 400))
      || (budgetPerDay !== undefined && !intBetween(budgetPerDay, 10000, 2000000))
      || (notes !== undefined && (typeof notes !== 'string' || notes.length > MAX_PLAN_NOTES))) {
      return res.status(400).json({ message: `Cần days từ 1 đến 7, targetCalories từ 1000 đến 6000, budgetPerDay (tùy chọn, 10000 đến 2000000 đồng), ghi chú tối đa ${MAX_PLAN_NOTES} ký tự.` });
    }

    const system = `Bạn là chuyên gia dinh dưỡng tạo thực đơn ${days} ngày cho người Việt. Mỗi ngày có bữa sáng, bữa trưa, bữa tối và ăn vặt (mảng có thể rỗng). Dùng món ăn Việt Nam quen thuộc, dễ nấu, khẩu phần thực tế. Tổng calo mỗi ngày sát ${targetCalories} kcal (lệch tối đa 10%)${proteinG ? `, protein khoảng ${proteinG} g mỗi ngày` : ''}. Các ngày phải khác món nhau. Tuyệt đối không dùng nguyên liệu hoặc món mà người dùng dị ứng hay không ăn được (xem ghi chú). Mỗi món có tên tiếng Việt, khẩu phần (quantity) và calories, protein, carbs, fat (gram) cho đúng khẩu phần đó. Tên thực đơn và mô tả ngắn bằng tiếng Việt. Trả về đúng ${days} ngày.

Ngân sách: ${budgetPerDay ? `tối đa khoảng ${budgetPerDay.toLocaleString('vi-VN')} đồng mỗi ngày cho toàn bộ món ăn, chọn món và nguyên liệu hợp giá thị trường Việt Nam` : 'không giới hạn'}
Mục tiêu người dùng: ${req.user.goal || 'chưa đặt'}
Ghi chú: ${(notes || '').trim() || 'không'}

Dữ liệu người dùng:
${await buildUserContext(req.user)}`;

    const result = await generate({
      system,
      contents: [{ role: 'user', parts: [{ text: 'Hãy tạo thực đơn.' }] }],
      schema: MEAL_PLAN_SCHEMA,
      maxOutputTokens: 16384, // thinking models spend a good part of this before answering; 7 days of food is long
    });

    const rawDays = Array.isArray(result.days) ? result.days : [];
    if (rawDays.length !== days) {
      console.error(`generateMealPlan: asked for ${days} days, got ${rawDays.length}`);
      throw new AiError(502, BAD_PLAN);
    }

    const planDays = rawDays.map((d, i) => ({
      name: `Ngày ${i + 1}`,
      meals: Object.fromEntries(Object.entries(PLAN_MEALS).map(([key, label]) => [
        label,
        cleanAiItems(d && d[key]).map((item, n) => ({ ...item, id: `ai-${i}-${key}-${n}` })), // unique inside the plan
      ])),
    }));
    const { plan, error } = cleanMealPlan({
      name: String(result.name || '').slice(0, 100) || 'Thực đơn AI',
      description: String(result.description || '').slice(0, 300),
      targetCalories,
      days: planDays,
    });
    if (error) {
      console.error('generateMealPlan: AI plan rejected:', error);
      throw new AiError(502, BAD_PLAN);
    }
    return res.status(200).json({ plan });
  } catch (err) {
    return handleError(res, err, 'generateMealPlan');
  }
};

module.exports = { chat, parseMeal, generateRoutine, generateMealPlan, handleError };
