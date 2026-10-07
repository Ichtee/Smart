const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Food = require('../models/Food');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// Escape user input before using it inside a RegExp (prevents 500s on '(' and ReDoS patterns)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

// Seed initial system foods if collection is empty
const seedFoodsIfEmpty = async () => {
  try {
    const count = await Food.countDocuments({ isCustom: false });
    if (count === 0) {
      await Food.insertMany(initialFoods.map(f => ({ ...f, isCustom: false, user: null })));
    }
  } catch (e) {
    console.error('Failed to seed initial foods:', e);
  }
};

// Optional user extractor middleware from Auth Header / Cookie
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (e) {
    // Ignore invalid token in optional auth
  }
  next();
};

// GET all food items (System foods + User's own custom foods)
router.get('/', optionalAuth, async (req, res) => {
  try {
    await seedFoodsIfEmpty();
    // Query params can arrive as arrays/objects (?search[$ne]=x) - only accept plain strings
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const { onlyCustom } = req.query;
    let queryConditions = [];

    // Filter by user ownership (Global System Foods + User Custom Foods)
    if (onlyCustom === 'true' && req.user) {
      queryConditions.push({ user: req.user._id, isCustom: true });
    } else if (req.user) {
      queryConditions.push({ user: null });
      queryConditions.push({ user: req.user._id });
    } else {
      queryConditions.push({ user: null });
    }

    let mainQuery = { $or: queryConditions };

    if (category && category !== 'Tất cả') {
      mainQuery.category = category;
    }

    if (search.trim()) {
      mainQuery.name = { $regex: escapeRegex(search.trim().slice(0, 100)), $options: 'i' };
    }

    const foods = await Food.find(mainQuery).sort({ createdAt: -1 });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách món ăn', error: err.message });
  }
});

// POST create custom food item (User endpoint)
router.post('/custom', protect, async (req, res) => {
  try {
    const { name, servingSize, calories, protein, carbs, fat, category, image } = req.body;

    // Validation
    if (!name || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Tên món ăn phải từ 2 đến 100 ký tự.' });
    }
    if (calories === undefined || isNaN(Number(calories)) || Number(calories) <= 0 || Number(calories) > 10000) {
      return res.status(400).json({ message: 'Lượng Calo phải là số dương hợp lệ (1 - 10,000 kcal).' });
    }
    if (protein !== undefined && (isNaN(Number(protein)) || Number(protein) < 0)) {
      return res.status(400).json({ message: 'Protein phải là số không âm.' });
    }
    if (carbs !== undefined && (isNaN(Number(carbs)) || Number(carbs) < 0)) {
      return res.status(400).json({ message: 'Carbs phải là số không âm.' });
    }
    if (fat !== undefined && (isNaN(Number(fat)) || Number(fat) < 0)) {
      return res.status(400).json({ message: 'Fat phải là số không âm.' });
    }

    const customFood = new Food({
      user: req.user._id,
      isCustom: true,
      name: name.trim(),
      servingSize: servingSize || '1 phần',
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      category: category || 'Tất cả',
      image: image || ''
    });

    const saved = await customFood.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: 'Lỗi khi tạo món ăn cá nhân', error: err.message });
  }
});

// DELETE custom food item (User endpoint - only own custom food)
router.delete('/custom/:id', protect, async (req, res) => {
  try {
    const food = await Food.findOneAndDelete({ _id: req.params.id, user: req.user._id, isCustom: true });
    if (!food) return res.status(404).json({ message: 'Không tìm thấy món ăn cá nhân của bạn để xóa' });
    res.json({ message: 'Đã xóa món ăn cá nhân thành công' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi khi xóa món ăn cá nhân', error: err.message });
  }
});

// POST create system food item (Admin only)
router.post('/', protect, admin, async (req, res) => {
  try {
    const { name, servingSize, calories, protein, carbs, fat, category, image } = req.body;

    // Validation
    if (!name || !name.trim() || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ message: 'Tên món ăn phải từ 2 đến 100 ký tự.' });
    }
    if (calories === undefined || isNaN(Number(calories)) || Number(calories) <= 0 || Number(calories) > 10000) {
      return res.status(400).json({ message: 'Lượng Calo phải là số dương hợp lệ (1 - 10,000 kcal).' });
    }
    if (protein !== undefined && (isNaN(Number(protein)) || Number(protein) < 0)) {
      return res.status(400).json({ message: 'Protein phải là số không âm.' });
    }
    if (carbs !== undefined && (isNaN(Number(carbs)) || Number(carbs) < 0)) {
      return res.status(400).json({ message: 'Carbs phải là số không âm.' });
    }
    if (fat !== undefined && (isNaN(Number(fat)) || Number(fat) < 0)) {
      return res.status(400).json({ message: 'Fat phải là số không âm.' });
    }

    const food = new Food({
      user: null,
      isCustom: false,
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
      { returnDocument: 'after', runValidators: true }
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
