const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const token = 'c28b2d239c4b287bdadceda63ad95959af2bc45034649f72931e7fcbaf47f540';

async function testResetApi() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Testing reset with token:', token);

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }
  });

  if (!user) {
    console.log('RESULT: User NOT FOUND or EXPIRED');
  } else {
    console.log('RESULT: SUCCESS! Found user:', user.email, 'Role:', user.role);
  }

  await mongoose.disconnect();
}

testResetApi().catch(console.error);
