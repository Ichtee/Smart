const { generate, AiError } = require('../utils/gemini');
const { buildUserContext } = require('../utils/aiContext');

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
      maxOutputTokens: 800,
    });
    return res.status(200).json({ reply });
  } catch (err) {
    return handleError(res, err, 'chat');
  }
};

module.exports = { chat, handleError };
