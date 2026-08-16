const NutritionLog = require('../models/NutritionLog');

// @desc    Get nutrition log for a specific date
// @route   GET /api/nutrition
// @access  Private
const getNutritionLog = async (req, res) => {
  try {
    const date = req.query.date;
    if (!date) {
      return res.status(400).json({ message: 'Vui lòng cung cấp tham số date (YYYY-MM-DD)' });
    }

    const log = await NutritionLog.findOne({ user: req.user._id, date });

    if (!log) {
      return res.status(200).json({
        date,
        waterGlasses: 0,
        mlPerGlass: 250,
        meals: {
          'Bữa Sáng': [],
          'Bữa Trưa': [],
          'Bữa Tối': [],
          'Ăn Vặt': []
        }
      });
    }

    return res.status(200).json(log);
  } catch (error) {
    console.error('Error fetching nutrition log:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy dữ liệu dinh dưỡng' });
  }
};

// @desc    Save or update nutrition log for a specific date
// @route   POST /api/nutrition
// @access  Private
const saveNutritionLog = async (req, res) => {
  try {
    const { date, waterGlasses, mlPerGlass, meals } = req.body;

    if (!date) {
      return res.status(400).json({ message: 'Ngày (date) là bắt buộc' });
    }

    const updatedLog = await NutritionLog.findOneAndUpdate(
      { user: req.user._id, date },
      {
        user: req.user._id,
        date,
        waterGlasses: waterGlasses !== undefined ? waterGlasses : 0,
        mlPerGlass: mlPerGlass || 250,
        meals: meals || {
          'Bữa Sáng': [],
          'Bữa Trưa': [],
          'Bữa Tối': [],
          'Ăn Vặt': []
        }
      },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json(updatedLog);
  } catch (error) {
    console.error('Error saving nutrition log:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lưu dữ liệu dinh dưỡng' });
  }
};

module.exports = {
  getNutritionLog,
  saveNutritionLog
};
