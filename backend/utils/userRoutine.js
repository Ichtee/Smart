// Validation and cleaning of a routine submitted by a regular user (admins keep the unrestricted path).
// Only whitelisted fields are copied, so nothing else (owner, id, mongoose internals) can be injected.

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const MAX_ROUTINES_PER_USER = 10;
const MAX_EXERCISES_PER_DAY = 30;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v, max) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const whole = (v) => (typeof v === 'number' || typeof v === 'string') && String(v).trim() !== '' ? Number(v) : NaN;

const cleanExercise = (raw, dayLabel, index) => {
  const where = `${dayLabel}, bài ${index + 1}`;
  if (!isObj(raw)) return { error: `${where}: dữ liệu bài tập không hợp lệ.` };

  const name = text(raw.exerciseName, 100);
  if (name.length < 2) return { error: `${where}: tên bài tập phải từ 2 ký tự.` };

  const muscle = text(raw.muscle, 40);
  if (!muscle) return { error: `${where}: thiếu nhóm cơ.` };

  const sets = raw.sets === undefined ? 3 : whole(raw.sets);
  if (!Number.isInteger(sets) || sets < 1 || sets > 50) return { error: `${where}: số hiệp phải từ 1 đến 50.` };

  const repsRange = raw.repsRange === undefined ? '10' : text(String(raw.repsRange), 20);
  if (!/^\d{1,3}(\s*-\s*\d{1,3})?$/.test(repsRange)) return { error: `${where}: số lần phải là một số hoặc khoảng (VD: 8-12).` };

  const rest = raw.restTimeSeconds === undefined ? 90 : whole(raw.restTimeSeconds);
  if (!Number.isInteger(rest) || rest < 0 || rest > 600) return { error: `${where}: thời gian nghỉ phải từ 0 đến 600 giây.` };

  return {
    exercise: {
      exerciseId: text(raw.exerciseId, 60),
      exerciseName: name,
      muscle,
      sets,
      repsRange,
      rir: text(raw.rir === undefined ? '1' : String(raw.rir), 10),
      restTimeSeconds: rest,
    },
  };
};

/** Returns { error } with a user-facing message, or { routine } ready to store (without id/owner). */
const cleanUserRoutine = (body) => {
  if (!isObj(body)) return { error: 'Dữ liệu lịch tập không hợp lệ.' };

  const name = text(body.name, 100);
  if (name.length < 2) return { error: 'Tên lịch tập phải từ 2 đến 100 ký tự.' };
  if (body.description !== undefined && typeof body.description !== 'string') return { error: 'Mô tả không hợp lệ.' };
  const description = text(body.description || '', 300);

  if (!Array.isArray(body.schedule) || body.schedule.length < 1 || body.schedule.length > 7) {
    return { error: 'Lịch tập phải có từ 1 đến 7 ngày.' };
  }

  const seen = new Set();
  const schedule = [];
  for (const rawDay of body.schedule) {
    if (!isObj(rawDay)) return { error: 'Dữ liệu ngày tập không hợp lệ.' };
    const day = text(rawDay.day, 20);
    if (!DAYS.includes(day)) return { error: `Ngày "${day}" không hợp lệ (Thứ 2 ... Chủ nhật).` };
    if (seen.has(day)) return { error: `${day} bị trùng trong lịch.` };
    seen.add(day);

    const isRestDay = rawDay.isRestDay === true;
    const dayName = text(rawDay.name, 50) || (isRestDay ? 'Nghỉ ngơi' : '');
    if (!dayName) return { error: `${day}: thiếu tên buổi tập.` };

    const rawExercises = rawDay.exercises === undefined ? [] : rawDay.exercises;
    if (!Array.isArray(rawExercises)) return { error: `${day}: danh sách bài tập không hợp lệ.` };
    if (rawExercises.length > MAX_EXERCISES_PER_DAY) return { error: `${day}: tối đa ${MAX_EXERCISES_PER_DAY} bài tập mỗi ngày.` };
    if (!isRestDay && rawExercises.length === 0) return { error: `${day}: ngày tập cần ít nhất một bài (hoặc đánh dấu là ngày nghỉ).` };

    const exercises = [];
    for (let i = 0; i < rawExercises.length; i++) {
      if (isRestDay) break; // a rest day keeps no exercises
      const { exercise, error } = cleanExercise(rawExercises[i], day, i);
      if (error) return { error };
      exercises.push(exercise);
    }

    // muscle targets are derived from the exercises, never trusted from the client
    const counts = new Map();
    for (const ex of exercises) counts.set(ex.muscle, (counts.get(ex.muscle) || 0) + 1);
    const targets = [...counts.entries()].map(([id, count]) => ({ id, label: id, count }));

    schedule.push({ day, name: dayName, isRestDay, targets, exercises });
  }

  schedule.sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day));
  const trainingDays = schedule.filter(d => !d.isRestDay).length;
  if (trainingDays === 0) return { error: 'Lịch tập cần ít nhất một ngày tập.' };

  return {
    routine: { name, type: 'Custom', description, frequencyDaysPerWeek: trainingDays, generalNotes: [], schedule },
  };
};

const newRoutineId = (userId) =>
  `u${String(userId).slice(-6)}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

module.exports = { cleanUserRoutine, newRoutineId, MAX_ROUTINES_PER_USER, MAX_EXERCISES_PER_DAY, DAYS };
