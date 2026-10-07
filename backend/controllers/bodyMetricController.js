const BodyMetric = require('../models/BodyMetric');
const { parseDateRange, isValidDate } = require('../utils/dateRange');
const { syncProfileFromMetrics, isTooFarAhead } = require('../utils/bodyMetrics');

// A number from the body, or undefined when absent/blank. NaN (garbage, objects, arrays) is returned as NaN.
const optionalNumber = (v) => (v === undefined || v === null || v === '' ? undefined : (typeof v === 'number' || typeof v === 'string' ? Number(v) : NaN));

const inRange = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

const serialize = (m) => ({
  date: m.date,
  weight: m.weight,
  bodyFat: m.bodyFat ?? null,
  waist: m.waist ?? null,
  neck: m.neck ?? null,
  hip: m.hip ?? null,
});

// @desc    Measurements in a date range, oldest first
// @route   GET /api/body-metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
// @access  Private
const getBodyMetrics = async (req, res) => {
  try {
    const range = parseDateRange(req.query);
    if (range.error) return res.status(400).json({ message: range.error });

    const metrics = await BodyMetric.find({
      user: req.user._id,
      date: { $gte: range.from, $lte: range.to },
    }).sort({ date: 1 });

    return res.status(200).json(metrics.map(serialize));
  } catch (error) {
    console.error('Error fetching body metrics:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lấy số đo cơ thể' });
  }
};

// @desc    Save (or replace) the measurement of one day, then follow it with the profile weight
// @route   POST /api/body-metrics
// @access  Private
const saveBodyMetric = async (req, res) => {
  try {
    const { date } = req.body;
    if (!isValidDate(date)) return res.status(400).json({ message: 'Ngày (date) phải có dạng YYYY-MM-DD hợp lệ' });
    if (isTooFarAhead(date)) return res.status(400).json({ message: 'Không thể ghi số đo cho ngày trong tương lai' });

    const weight = optionalNumber(req.body.weight);
    if (weight === undefined || !inRange(weight, 10, 500)) {
      return res.status(400).json({ message: 'Cân nặng phải là số hợp lệ (từ 10kg đến 500kg).' });
    }
    const bodyFat = optionalNumber(req.body.bodyFat);
    if (bodyFat !== undefined && !inRange(bodyFat, 2, 70)) {
      return res.status(400).json({ message: 'Tỷ lệ mỡ phải từ 2% đến 70%.' });
    }
    const waist = optionalNumber(req.body.waist);
    if (waist !== undefined && !inRange(waist, 30, 250)) {
      return res.status(400).json({ message: 'Vòng eo phải từ 30cm đến 250cm.' });
    }
    const neck = optionalNumber(req.body.neck);
    if (neck !== undefined && !inRange(neck, 20, 80)) {
      return res.status(400).json({ message: 'Vòng cổ phải từ 20cm đến 80cm.' });
    }
    const hip = optionalNumber(req.body.hip);
    if (hip !== undefined && !inRange(hip, 40, 200)) {
      return res.status(400).json({ message: 'Vòng hông phải từ 40cm đến 200cm.' });
    }

    const saved = await BodyMetric.findOneAndUpdate(
      { user: req.user._id, date },
      { user: req.user._id, date, weight, bodyFat: bodyFat ?? null, waist: waist ?? null, neck: neck ?? null, hip: hip ?? null },
      { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
    );
    const profileWeight = await syncProfileFromMetrics(req.user._id);

    return res.status(200).json({ metric: serialize(saved), profileWeight });
  } catch (error) {
    console.error('Error saving body metric:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi lưu số đo cơ thể' });
  }
};

// @desc    Delete the measurement of one day
// @route   DELETE /api/body-metrics?date=YYYY-MM-DD
// @access  Private
const deleteBodyMetric = async (req, res) => {
  try {
    const { date } = req.query;
    if (!isValidDate(date)) return res.status(400).json({ message: 'Tham số date phải có dạng YYYY-MM-DD hợp lệ' });

    const result = await BodyMetric.deleteOne({ user: req.user._id, date });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Không có số đo nào cho ngày này' });

    const profileWeight = await syncProfileFromMetrics(req.user._id);
    return res.status(200).json({ message: 'Đã xóa số đo', profileWeight });
  } catch (error) {
    console.error('Error deleting body metric:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xóa số đo cơ thể' });
  }
};

module.exports = { getBodyMetrics, saveBodyMetric, deleteBodyMetric };
