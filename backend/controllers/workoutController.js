const WorkoutLog = require('../models/WorkoutLog');
const { parseDateRange, isValidDate } = require('../utils/dateRange');
const { sanitizeDetailsMap, computeRecords } = require('../utils/records');
const { computeWeeklyVolume } = require('../utils/volume');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toUtcDay = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

// Compute consecutive-day streaks from a sorted, de-duplicated list of YYYY-MM-DD dates.
// "current" is still alive if the last trained day is today or yesterday (relative to `today`).
const computeStreaks = (sortedDates, today) => {
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const d of sortedDates) {
    const day = toUtcDay(d);
    run = prev !== null && day - prev === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = day;
  }
  let current = 0;
  if (sortedDates.length > 0) {
    const last = toUtcDay(sortedDates[sortedDates.length - 1]);
    if (toUtcDay(today) - last <= 1) current = run;
  }
  return { current, longest };
};

// @desc    Get workout log for a specific date
// @route   GET /api/workouts
// @access  Private
const getWorkoutLog = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Định dạng ngày phải là YYYY-MM-DD' });
    }

    const log = await WorkoutLog.findOne({ user: req.user._id, date });

    if (!log) {
      return res.status(200).json({
        date,
        routineId: 'ppl',
        routineName: '',
        dayName: '',
        dayIndex: 0,
        selectedIds: [],
        completedIds: [],
        detailsMap: {},
        exercises: [],
        isSaved: false
      });
    }

    return res.status(200).json(log);
  } catch (error) {
    console.error('Error fetching workout log:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy nhật ký tập luyện' });
  }
};

// @desc    Save or update workout log for a specific date
// @route   POST /api/workouts
// @access  Private
const saveWorkoutLog = async (req, res) => {
  try {
    const {
      date,
      routineId,
      routineName,
      dayName,
      dayIndex,
      selectedIds,
      completedIds,
      detailsMap,
      exercises,
      isSaved
    } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Ngày (date) là bắt buộc' });
    }

    // Validate date format YYYY-MM-DD
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Định dạng ngày phải là YYYY-MM-DD' });
    }

    // Cannot log completed exercises for a future day (allow +1 day for client timezones ahead of UTC)
    const hasCompletion = Array.isArray(completedIds) && completedIds.length > 0;
    const todayUtc = Math.floor(Date.now() / 86400000);
    if (hasCompletion && toUtcDay(date) > todayUtc + 1) {
      return res.status(400).json({ message: 'Không thể đánh dấu hoàn thành bài tập cho ngày trong tương lai.' });
    }

    // A completed exercise must be one of the selected ones (drops stray ids that would inflate streaks/records)
    const selected = Array.isArray(selectedIds) ? selectedIds : [];
    const chosen = new Set(selected.map(String));
    const completed = Array.isArray(completedIds) ? completedIds.filter(id => chosen.has(String(id))) : [];

    const updatedLog = await WorkoutLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        user: req.user._id,
        date,
        routineId: routineId || 'ppl',
        routineName: routineName || '',
        dayName: dayName || '',
        dayIndex: dayIndex !== undefined ? dayIndex : 0,
        selectedIds: selected,
        completedIds: completed,
        detailsMap: sanitizeDetailsMap(detailsMap) || {},
        exercises: exercises || [],
        isSaved: isSaved !== undefined ? isSaved : false
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error('Error saving workout log:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lưu nhật ký tập luyện' });
  }
};

// @desc    Get streak history (list of dates trained with at least 1 completed exercise)
// @route   GET /api/workouts/streak
// @access  Private
const getStreakHistory = async (req, res) => {
  try {
    const logs = await WorkoutLog.find({
      user: req.user._id,
      'completedIds.0': { $exists: true }
    }).select('date');

    const streakDates = Array.from(new Set(logs.map(l => l.date))).sort();
    // Client sends its local date so "today" respects the user's timezone
    const today = DATE_RE.test(req.query.today || '')
      ? req.query.today
      : new Date().toISOString().slice(0, 10);
    const { current, longest } = computeStreaks(streakDates, today);

    return res.status(200).json({
      streakDates,
      current,
      longest,
      total: streakDates.length,
      count: current // consecutive-day streak (was total days before)
    });
  } catch (error) {
    console.error('Error fetching streak history:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy chuỗi streak' });
  }
};

// @desc    Get all workout logs map for progress timeline
// @route   GET /api/workouts/logs
// @access  Private
const getAllWorkoutLogs = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    if (range.error) return res.status(400).json({ message: range.error });

    const logs = await WorkoutLog.find({
      user: req.user._id,
      date: { $gte: range.from, $lte: range.to },
      $or: [
        { isSaved: true },
        { 'completedIds.0': { $exists: true } }
      ]
    }).sort({ date: -1 });

    const logsMap = {};
    logs.forEach(log => {
      logsMap[log.date] = {
        date: log.date,
        routineId: log.routineId,
        routineName: log.routineName,
        dayName: log.dayName,
        exercises: log.exercises,
        updatedAt: log.updatedAt
      };
    });

    return res.status(200).json(logsMap);
  } catch (error) {
    console.error('Error fetching all workout logs:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy lịch sử tập luyện' });
  }
};

// @desc    Personal records per exercise (heaviest completed set), with the weight history
// @route   GET /api/workouts/records
// @access  Private
const getRecords = async (req, res) => {
  try {
    const logs = await WorkoutLog.find({ user: req.user._id, 'completedIds.0': { $exists: true } })
      .select('date exercises detailsMap')
      .lean();
    return res.status(200).json(computeRecords(logs));
  } catch (error) {
    console.error('Error fetching records:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy kỷ lục tập luyện' });
  }
};

// @desc    Sets done per muscle group per week (from/to optional, same rules as /logs)
// @route   GET /api/workouts/volume
// @access  Private
const getWeeklyVolume = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    if (range.error) return res.status(400).json({ message: range.error });
    const logs = await WorkoutLog.find({ user: req.user._id, date: { $gte: range.from, $lte: range.to } })
      .select('date exercises completedIds detailsMap')
      .lean();
    return res.status(200).json({ from: range.from, to: range.to, ...computeWeeklyVolume(logs, range.from, range.to) });
  } catch (error) {
    console.error('Error computing weekly volume:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi tính khối lượng tập' });
  }
};

// @desc    Delete workout log for a specific date
// @route   DELETE /api/workouts
// @access  Private
const deleteWorkoutLog = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });
    }
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'Định dạng ngày phải là YYYY-MM-DD' });
    }

    await WorkoutLog.deleteOne({ user: req.user._id, date });

    return res.status(200).json({ success: true, message: `Đã xóa nhật ký tập luyện ngày ${date}` });
  } catch (error) {
    console.error('Error deleting workout log:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xóa nhật ký tập luyện' });
  }
};

module.exports = {
  getWorkoutLog,
  saveWorkoutLog,
  deleteWorkoutLog,
  getStreakHistory,
  getAllWorkoutLogs,
  getRecords,
  getWeeklyVolume,
  computeStreaks
};
