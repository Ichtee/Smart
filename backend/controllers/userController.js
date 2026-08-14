const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_for_deploy');

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const registerUser = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User (email or username) already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      verificationToken
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        height: user.height,
        weight: user.weight,
        age: user.age,
        gender: user.gender,
        goal: user.goal,
        activityLevel: user.activityLevel,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('registerUser error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Please provide username and password' });
    }

    // Allow login with either username or email
    const user = await User.findOne({ 
      $or: [{ username: username }, { email: username }] 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (await bcrypt.compare(password, user.password)) {
      res.json({
        _id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        height: user.height,
        weight: user.weight,
        age: user.age,
        gender: user.gender,
        goal: user.goal,
        activityLevel: user.activityLevel,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('loginUser error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('verifyEmail error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.age !== undefined) user.age = req.body.age;
      if (req.body.gender !== undefined) user.gender = req.body.gender;
      if (req.body.height !== undefined) user.height = req.body.height;
      if (req.body.weight !== undefined) user.weight = req.body.weight;
      if (req.body.goal !== undefined) user.goal = req.body.goal;
      if (req.body.activityLevel !== undefined) user.activityLevel = req.body.activityLevel;

      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password, salt);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser.id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        age: updatedUser.age,
        gender: updatedUser.gender,
        height: updatedUser.height,
        weight: updatedUser.weight,
        goal: updatedUser.goal,
        activityLevel: updatedUser.activityLevel,
        role: updatedUser.role,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const users = await User.find({}).select('-password').skip(skip).limit(limit);
    const total = await User.countDocuments();
    res.json({ users, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      await User.deleteOne({ _id: user._id });
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role and status
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUserRoleAndStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Allow modifying role and isEmailVerified
      if (req.body.role) {
        // Prevent an admin from changing their own role (optional safety check)
        if (req.user._id.toString() === user._id.toString() && req.body.role !== 'admin') {
          return res.status(400).json({ message: 'Cannot demote yourself' });
        }
        user.role = req.body.role;
      }
      
      if (req.body.isEmailVerified !== undefined) {
        user.isEmailVerified = req.body.isEmailVerified;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password — send reset email
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    await resend.emails.send({
      from: 'Smart App <onboarding@resend.dev>',
      to: user.email,
      subject: 'Đặt lại mật khẩu Smart App',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0B0F19; color: #fff; padding: 40px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="font-size: 32px;">⚡</span>
            <h1 style="color: #00E5FF; margin: 8px 0 4px;">Smart App</h1>
            <p style="color: #94a3b8; font-size: 14px;">Đặt lại mật khẩu</p>
          </div>
          <p style="color: #cbd5e1;">Xin chào <strong style="color:#fff">${user.name}</strong>,</p>
          <p style="color: #cbd5e1;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Link dưới đây có hiệu lực trong <strong>1 giờ</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #00E5FF; color: #0B0F19; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; font-size: 15px;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
          <hr style="border-color: #1e293b; margin: 24px 0;" />
          <p style="color: #475569; font-size: 11px; text-align: center;">Link hết hạn sau 1 giờ. Smart App không bao giờ hỏi mật khẩu của bạn.</p>
        </div>
      `,
    });

    res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ message: 'Server error sending reset email' });
  }
};

// @desc    Reset password using token
// @route   POST /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // token not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  getProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
  updateUserRoleAndStatus,
  forgotPassword,
  resetPassword,
};
