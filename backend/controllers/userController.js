const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  connectionTimeout: 8000, // 8 second timeout to prevent hanging
  greetingTimeout: 8000,
  socketTimeout: 8000,
});

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
      if (!userExists.isEmailVerified) {
        // Delete unverified account from previous failed attempt so user can re-register
        await User.deleteOne({ _id: userExists._id });
      } else {
        return res.status(400).json({ message: 'User (email or username) already exists' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid user data' });
    }

    // Send verification email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        from: `"Smart App" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Xác thực email - Smart App',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0B0F19; color: #fff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="font-size: 32px;">⚡</span>
              <h1 style="color: #00E5FF; margin: 8px 0 4px;">Smart App</h1>
              <p style="color: #94a3b8; font-size: 14px;">Xác thực tài khoản</p>
            </div>
            <p style="color: #cbd5e1;">Xin chào <strong style="color:#fff">${user.name}</strong>,</p>
            <p style="color: #cbd5e1;">Cảm ơn bạn đã đăng ký! Nhấn nút bên dưới để xác thực email trong vòng <strong style="color:#facc15">10 phút</strong>.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="background: #00E5FF; color: #0B0F19; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; font-size: 15px;">
                Xác thực Email
              </a>
            </div>
            <p style="color: #64748b; font-size: 12px;">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
            <hr style="border-color: #1e293b; margin: 24px 0;" />
            <p style="color: #ef4444; font-size: 11px; text-align: center;">⚠️ Link hết hạn sau 10 phút. Tài khoản chưa xác thực sẽ bị xóa tự động.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Error sending verification email:', emailErr);
      // Clean up the created user so database doesn't stay blocked
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({ 
        message: 'Lỗi gửi email xác thực. Vui lòng kiểm tra lại cấu hình GMAIL_USER và GMAIL_PASS trên Render server.' 
      });
    }

    res.status(201).json({
      message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trong 10 phút.',
      email: user.email,
    });
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

    const user = await User.findOne({
      $or: [{ username: username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Block login if email not verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: 'Email chưa được xác thực. Vui lòng kiểm tra hộp thư của bạn.',
        notVerified: true,
        email: user.email,
      });
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
      return res.status(400).json({ message: 'Invalid or expired verification token. Please register again.' });
    }

    // Mark verified and clear both token fields to prevent TTL auto-deletion
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    console.error('verifyEmail error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// @desc    Resend verification email
// @route   POST /api/users/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address or username' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
      return res.status(500).json({ 
        message: 'Server chưa được cấu hình GMAIL_USER và GMAIL_PASS trên Render Environment Variables!' 
      });
    }

    const searchStr = email.trim();
    const user = await User.findOne({ 
      $or: [{ email: searchStr.toLowerCase() }, { email: searchStr }, { username: searchStr }], 
      isEmailVerified: false 
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản chưa xác thực phù hợp với thông tin này.' });
    }

    // Generate new token and extend expiry by 10 minutes
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify?token=${verificationToken}`;

    try {
      await transporter.sendMail({
        from: `"Smart App" <${process.env.GMAIL_USER}>`,
        to: user.email,
        subject: 'Xác thực email (gửi lại) - Smart App',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; background: #0B0F19; color: #fff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <span style="font-size: 32px;">⚡</span>
              <h1 style="color: #00E5FF; margin: 8px 0 4px;">Smart App</h1>
            </div>
            <p style="color: #cbd5e1;">Xin chào <strong style="color:#fff">${user.name}</strong>,</p>
            <p style="color: #cbd5e1;">Chúng tôi đã gửi lại link xác thực. Link có hiệu lực trong <strong style="color:#facc15">10 phút</strong>.</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="background: #00E5FF; color: #0B0F19; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; font-size: 15px;">
                Xác thực Email
              </a>
            </div>
            <p style="color: #ef4444; font-size: 11px; text-align: center;">Link hết hạn sau 10 phút.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('resendVerification sendMail error:', emailErr);
      return res.status(500).json({ 
        message: 'Lỗi gửi email. Vui lòng kiểm tra lại GMAIL_USER và GMAIL_PASS (App Password) trên Render.' 
      });
    }

    res.status(200).json({ message: 'Email xác thực đã được gửi lại thành công! Vui lòng kiểm tra hộp thư.' });
  } catch (error) {
    console.error('resendVerification error:', error);
    res.status(500).json({ message: 'Server error resending verification email' });
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
    const users = await User.find({}).select('-password');
    res.json(users);
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

    await transporter.sendMail({
      from: `"Smart App" <${process.env.GMAIL_USER}>`,
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
  resendVerification,
  getProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
  updateUserRoleAndStatus,
  forgotPassword,
  resetPassword,
};

