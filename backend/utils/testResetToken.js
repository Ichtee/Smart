const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

const token = 'c28b2d239c4b287bdadceda63ad95959af2bc45034649f72931e7fcbaf47f540';

async function testQuery() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Querying with token:', token);
  console.log('Current Date():', new Date());

  const user1 = await User.findOne({ resetPasswordToken: token });
  console.log('1. User found by token only:', user1 ? user1.email : 'NOT FOUND');

  const user2 = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() }
  });
  console.log('2. User found by token AND $gt new Date():', user2 ? user2.email : 'NOT FOUND');

  await mongoose.disconnect();
}

testQuery().catch(console.error);
