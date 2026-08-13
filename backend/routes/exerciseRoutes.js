const express = require('express');
const router = express.Router();
const Exercise = require('../models/Exercise');
const { protect, admin } = require('../middleware/authMiddleware');

// GET all exercises
router.get('/', async (req, res) => {
  try {
    const exercises = await Exercise.find({});
    res.json(exercises);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy bài tập', error: err.message });
  }
});

// POST new exercise
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, muscle, defaultSets, defaultReps } = req.body;
    const exercise = new Exercise({ name, muscle, defaultSets, defaultReps });
    const saved = await exercise.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi khi tạo bài tập', error: err.message });
  }
});

// PUT update exercise
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, muscle, defaultSets, defaultReps } = req.body;
    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      { name, muscle, defaultSets, defaultReps },
      { new: true, runValidators: true }
    );
    if (!exercise) return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    res.json(exercise);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi khi cập nhật bài tập', error: err.message });
  }
});

// DELETE exercise
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);
    if (!exercise) return res.status(404).json({ message: 'Không tìm thấy bài tập' });
    res.json({ message: 'Xóa bài tập thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xóa bài tập', error: err.message });
  }
});

module.exports = router;
