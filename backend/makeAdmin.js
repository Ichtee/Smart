const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const makeAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    // Update all users to be admin
    const result = await User.updateMany({}, { role: 'admin' });
    
    console.log(`Successfully updated ${result.modifiedCount} users to ADMIN role!`);
    
    process.exit();
  } catch (err) {
    console.error('Error updating user', err);
    process.exit(1);
  }
};

makeAdmin();
