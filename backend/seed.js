require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/myfitnessapp');
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    await User.findOneAndUpdate(
      { email: 'test@example.com' },
      {
        name: 'Tester',
        username: 'tester',
        email: 'test@example.com',
        password: hashedPassword,
        isEmailVerified: true,
        age: 25,
        gender: 'Nam',
        height: 175,
        weight: 70,
        goal: 'Tăng cơ'
      },
      { upsert: true, new: true }
    );

    console.log('---------------------------------');
    console.log('✅ TEST USER SEEDED SUCCESSFULLY!');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('---------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedUser();
