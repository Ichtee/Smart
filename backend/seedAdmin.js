const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to:', process.env.MONGO_URI);
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      await User.deleteOne({ username: 'admin' });
      console.log('Deleted existing admin user');
    }

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('admin123', salt);

    await User.create({
      name: 'Admin',
      username: 'admin',
      email: 'admin@myfitness.com',
      password,
      rawPassword: 'admin123',
      role: 'admin',
      isEmailVerified: true
    });

    console.log('Admin user successfully created in the correct database!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
