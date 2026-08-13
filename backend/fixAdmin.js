const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/myfitness').then(async () => {
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('admin123', salt);
  
  await User.updateOne({ username: 'admin' }, { password, rawPassword: 'admin123' });
  console.log('Password fixed and rawPassword added for admin123');
  process.exit();
});
