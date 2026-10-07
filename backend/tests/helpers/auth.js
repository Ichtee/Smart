const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');

let counter = 0;

/**
 * Insert a user straight into the DB (bypasses the register + email flow) and return a valid JWT.
 * Pass overrides such as { role: 'admin' } or { isEmailVerified: false }.
 */
const createUser = async (overrides = {}) => {
  counter += 1;
  const password = overrides.password || 'password123';
  const user = await User.create({
    name: `Test User ${counter}`,
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    isEmailVerified: true,
    ...overrides,
    password: await bcrypt.hash(password, 4),
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token, password, auth: { Authorization: `Bearer ${token}` } };
};

module.exports = { createUser };
