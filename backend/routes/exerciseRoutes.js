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
    const { name, muscle, defaultSets, defaultReps, equipment, description, videoUrl, secondaryMuscles } = req.body;

    // Validation
    if (!name || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Tên bài tập phải từ 2 đến 100 ký tự.' });
    }
    if (!muscle || !muscle.trim()) {
      return res.status(400).json({ message: 'Nhóm cơ chính (muscle) là bắt buộc.' });
    }
    if (defaultSets !== undefined && (isNaN(Number(defaultSets)) || Number(defaultSets) < 1 || Number(defaultSets) > 50)) {
      return res.status(400).json({ message: 'Số hiệp mặc định phải từ 1 đến 50.' });
    }
    if (defaultReps !== undefined && (!String(defaultReps).trim())) {
      return res.status(400).json({ message: 'Số lần mặc định không được để trống.' });
    }

    const exercise = new Exercise({ name: name.trim(), muscle: muscle.trim(), defaultSets, defaultReps, equipment, description, videoUrl, secondaryMuscles });
    const saved = await exercise.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi khi tạo bài tập', error: err.message });
  }
});

// PUT update exercise
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, muscle, defaultSets, defaultReps, equipment, description, videoUrl, secondaryMuscles } = req.body;

    // Validation
    if (name !== undefined && (!name.trim() || name.trim().length < 2 || name.trim().length > 100)) {
      return res.status(400).json({ message: 'Tên bài tập phải từ 2 đến 100 ký tự.' });
    }
    if (muscle !== undefined && !muscle.trim()) {
      return res.status(400).json({ message: 'Nhóm cơ chính (muscle) không được để trống.' });
    }
    if (defaultSets !== undefined && (isNaN(Number(defaultSets)) || Number(defaultSets) < 1 || Number(defaultSets) > 50)) {
      return res.status(400).json({ message: 'Số hiệp mặc định phải từ 1 đến 50.' });
    }
    if (defaultReps !== undefined && (!String(defaultReps).trim())) {
      return res.status(400).json({ message: 'Số lần mặc định không được để trống.' });
    }

    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      {
        name: name ? name.trim() : undefined,
        muscle: muscle ? muscle.trim() : undefined,
        defaultSets, defaultReps, equipment, description, videoUrl, secondaryMuscles
      },
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
