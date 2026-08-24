const WorkoutLog = require('../models/WorkoutLog');

// @desc    Get workout log for a specific date
// @route   GET /api/workouts
// @access  Private
const getWorkoutLog = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });
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

    const updatedLog = await WorkoutLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        user: req.user._id,
        date,
        routineId: routineId || 'ppl',
        routineName: routineName || '',
        dayName: dayName || '',
        dayIndex: dayIndex !== undefined ? dayIndex : 0,
        selectedIds: selectedIds || [],
        completedIds: completedIds || [],
        detailsMap: detailsMap || {},
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
    return res.status(200).json({
      streakDates,
      count: streakDates.length
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
    const logs = await WorkoutLog.find({
      user: req.user._id,
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

// @desc    Delete workout log for a specific date
// @route   DELETE /api/workouts
// @access  Private
const deleteWorkoutLog = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });
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
  getAllWorkoutLogs
};
