const express = require('express');
const router = express.Router();
const Food = require('../models/Food');
const { protect, admin } = require('../middleware/authMiddleware');

const initialFoods = [
  { name: 'Phở bò', servingSize: '1 tô', calories: 450, protein: 22, carbs: 55, fat: 12, category: 'Bữa Sáng' },
  { name: 'Cơm tấm sườn bì chả', servingSize: '1 dĩa', calories: 650, protein: 30, carbs: 75, fat: 22, category: 'Bữa Trưa' },
  { name: 'Ức gà luộc', servingSize: '200g', calories: 220, protein: 46, carbs: 0, fat: 3.6, category: 'Bữa Tối' },
  { name: 'Trứng ốp la', servingSize: '2 quả', calories: 150, protein: 12, carbs: 1, fat: 10, category: 'Bữa Sáng' },
  { name: 'Bánh mì thịt', servingSize: '1 ổ', calories: 380, protein: 16, carbs: 45, fat: 14, category: 'Bữa Sáng' },
  { name: 'Sữa chua không đường', servingSize: '1 hộp (100g)', calories: 60, protein: 3.5, carbs: 4.7, fat: 3, category: 'Ăn Vặt' },
  { name: 'Chuối chín', servingSize: '1 quả (100g)', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, category: 'Ăn Vặt' },
  { name: 'Cơm trắng', servingSize: '1 chén (150g)', calories: 200, protein: 4.2, carbs: 44, fat: 0.4, category: 'Bữa Trưa' },
  { name: 'Bò né trứng xíu mại', servingSize: '1 phần', calories: 580, protein: 35, carbs: 30, fat: 32, category: 'Bữa Tối' },
  { name: 'Hạt hạnh nhân', servingSize: '30g', calories: 170, protein: 6, carbs: 6, fat: 15, category: 'Ăn Vặt' }
];

// Seed initial foods if collection is empty
const seedFoodsIfEmpty = async () => {
  try {
    const count = await Food.countDocuments({});
    if (count === 0) {
      await Food.insertMany(initialFoods);
    }
  } catch (e) {
    console.error('Failed to seed initial foods:', e);
  }
};

// GET all food items (supports ?search=...&category=...)
router.get('/', async (req, res) => {
  try {
    await seedFoodsIfEmpty();
    const { search, category } = req.query;
    let query = {};

    if (category && category !== 'Tất cả') {
      query.category = category;
    }

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const foods = await Food.find(query).sort({ createdAt: -1 });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách món ăn', error: err.message });
  }
});

// GET single food item
router.get('/:id', async (req, res) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json(food);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy chi tiết món ăn', error: err.message });
  }
});

// POST create new food item (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, servingSize, calories, protein, carbs, fat, category, image } = req.body;
    if (!name || calories === undefined) {
      return res.status(400).json({ message: 'Tên món ăn và lượng Calo là bắt buộc' });
    }

    const food = new Food({
      name: name.trim(),
      servingSize: servingSize || '1 phần',
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      category: category || 'Tất cả',
      image: image || ''
    });

    const saved = await food.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi khi tạo món ăn mới', error: err.message });
  }
});

// PUT update food item (Admin only)
router.put('/:id', protect, admin, async (req, res) => {
  try {
    const { name, servingSize, calories, protein, carbs, fat, category, image } = req.body;
    const food = await Food.findByIdAndUpdate(
      req.params.id,
      {
        name: name ? name.trim() : undefined,
        servingSize,
        calories: calories !== undefined ? Number(calories) : undefined,
        protein: protein !== undefined ? Number(protein) : undefined,
        carbs: carbs !== undefined ? Number(carbs) : undefined,
        fat: fat !== undefined ? Number(fat) : undefined,
        category,
        image
      },
      { new: true, runValidators: true }
    );

    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json(food);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi khi cập nhật món ăn', error: err.message });
  }
});

// DELETE food item (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const food = await Food.findByIdAndDelete(req.params.id);
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn' });
    res.json({ message: 'Xóa món ăn thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xóa món ăn', error: err.message });
  }
});

module.exports = router;
