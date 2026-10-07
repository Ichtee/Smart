const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');

const sendEmail = async ({ to, to_name, verify_url, subject, template_id }) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const defaultTemplateId = process.env.EMAILJS_TEMPLATE_ID;
  const forgotTemplateId = process.env.EMAILJS_FORGOT_TEMPLATE_ID || defaultTemplateId;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY; // Optional private key

  const targetTemplateId = template_id || defaultTemplateId;

  if (!serviceId || !targetTemplateId || !publicKey) {
    throw new Error('Chưa cấu hình EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID hoặc EMAILJS_PUBLIC_KEY trên Render!');
  }

  const payload = {
    service_id: serviceId,
    template_id: targetTemplateId,
    user_id: publicKey,
    template_params: {
      to_email: to,
      to: to,
      email: to,
      user_email: to,
      recipient: to,
      to_name: to_name || 'User',
      verify_url: verify_url || '',
      link: verify_url || '',
      message: verify_url || '',
      subject: subject || 'Smart App',
    },
  };

  if (privateKey) {
    payload.accessToken = privateKey;
  }

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`EmailJS (${res.status}): ${errorText || res.statusText}`);
  }
};

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
    let { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
    }

    // 1. Validate Name
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({ message: 'Họ và tên không được để trống khoảng trắng, độ dài từ 2 đến 50 ký tự.' });
    }

    // 2. Validate Username (cấm chứa khoảng trắng)
    const trimmedUsername = username.trim();
    if (/\s/.test(trimmedUsername) || trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      return res.status(400).json({ message: 'Tên đăng nhập không được chứa khoảng trắng, độ dài từ 3 đến 30 ký tự.' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      return res.status(400).json({ message: 'Tên đăng nhập chỉ được chứa chữ cái, chữ số, gạch dưới (_) và gạch nối (-).' });
    }

    // 3. Validate Email (cấm chứa khoảng trắng & kiểm tra regex)
    const trimmedEmail = email.trim().toLowerCase();
    if (/\s/.test(trimmedEmail) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 100) {
      return res.status(400).json({ message: 'Email không được chứa dấu cách và phải đúng định dạng (VD: user@example.com).' });
    }

    // 4. Validate Password (không chứa khoảng trắng ở 2 đầu, 8..100 ký tự)
    if (password !== password.trim()) {
      return res.status(400).json({ message: 'Mật khẩu không được chứa khoảng trắng ở đầu hoặc cuối.' });
    }
    if (password.length < 8 || password.length > 100) {
      return res.status(400).json({ message: 'Mật khẩu phải từ 8 đến 100 ký tự.' });
    }

    const userExists = await User.findOne({ $or: [{ email: trimmedEmail }, { username: trimmedUsername }] });
    if (userExists) {
      if (!userExists.isEmailVerified) {
        // Delete unverified account from previous failed attempt so user can re-register
        await User.deleteOne({ _id: userExists._id });
      } else {
        return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại trên hệ thống.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await User.create({
      name: trimmedName,
      username: trimmedUsername,
      email: trimmedEmail,
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
      await sendEmail({
        to: user.email,
        to_name: user.name,
        verify_url: verifyUrl,
        subject: 'Xác thực tài khoản Smart App',
      });
    } catch (emailErr) {
      console.error('Error sending verification email:', emailErr);
      // Clean up the created user so database doesn't stay blocked
      await User.deleteOne({ _id: user._id });
      return res.status(500).json({
        message: `Lỗi gửi email: ${emailErr.message}`
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
      const token = generateToken(user._id);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('token', token, cookieOptions).json({
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
        lastActiveRoutineId: user.lastActiveRoutineId || 'ppl',
        lastActiveRoutineName: user.lastActiveRoutineName || '',
        lastActiveDayIndex: user.lastActiveDayIndex || 0,
        token: token,
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
      await sendEmail({
        to: user.email,
        to_name: user.name,
        verify_url: verifyUrl,
        subject: 'Xác thực tài khoản Smart App (Gửi lại)',
      });
    } catch (emailErr) {
      console.error('resendVerification sendEmail error:', emailErr);
      return res.status(500).json({
        message: `Lỗi gửi email: ${emailErr.message}`
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
      if (req.body.name !== undefined) {
        const trimmedName = req.body.name.trim().replace(/\s+/g, ' ');
        if (trimmedName.length < 2 || trimmedName.length > 50) {
          return res.status(400).json({ message: 'Họ và tên không được để trống khoảng trắng, độ dài từ 2 đến 50 ký tự.' });
        }
        user.name = trimmedName;
      }
      
      if (req.body.age !== undefined && req.body.age !== null && req.body.age !== '') {
        const ageNum = Number(req.body.age);
        if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
          return res.status(400).json({ message: 'Tuổi phải là số dương hợp lệ (từ 1 đến 120 tuổi).' });
        }
        user.age = ageNum;
      }

      if (req.body.gender !== undefined) user.gender = req.body.gender;

      if (req.body.height !== undefined && req.body.height !== null && req.body.height !== '') {
        const heightNum = Number(req.body.height);
        if (isNaN(heightNum) || heightNum < 30 || heightNum > 300) {
          return res.status(400).json({ message: 'Chiều cao phải là số dương hợp lệ (từ 30cm đến 300cm).' });
        }
        user.height = heightNum;
      }

      if (req.body.weight !== undefined && req.body.weight !== null && req.body.weight !== '') {
        const weightNum = Number(req.body.weight);
        if (isNaN(weightNum) || weightNum < 10 || weightNum > 500) {
          return res.status(400).json({ message: 'Cân nặng phải là số dương hợp lệ (từ 10kg đến 500kg).' });
        }
        user.weight = weightNum;
      }

      if (req.body.goal !== undefined) user.goal = req.body.goal;
      if (req.body.activityLevel !== undefined) user.activityLevel = req.body.activityLevel;
      if (req.body.lastActiveRoutineId !== undefined) user.lastActiveRoutineId = req.body.lastActiveRoutineId;
      if (req.body.lastActiveRoutineName !== undefined) user.lastActiveRoutineName = req.body.lastActiveRoutineName;
      if (req.body.lastActiveDayIndex !== undefined) user.lastActiveDayIndex = req.body.lastActiveDayIndex;

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
        lastActiveRoutineId: updatedUser.lastActiveRoutineId,
        lastActiveRoutineName: updatedUser.lastActiveRoutineName,
        lastActiveDayIndex: updatedUser.lastActiveDayIndex,
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
        if (user.isEmailVerified) {
          // Clear token fields so the TTL index never auto-deletes a verified account
          user.verificationToken = undefined;
          user.verificationTokenExpires = undefined;
        }
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
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        to_name: user.name,
        verify_url: resetUrl,
        subject: 'Đặt lại mật khẩu Smart App',
        template_id: process.env.EMAILJS_FORGOT_TEMPLATE_ID,
      });
    } catch (emailErr) {
      console.error('forgotPassword sendEmail error:', emailErr);
      return res.status(500).json({
        message: `Lỗi gửi email: ${emailErr.message}`
      });
    }

    res.status(200).json({ message: 'Nếu email tồn tại trong hệ thống, link đặt lại mật khẩu đã được gửi tới hòm thư của bạn.' });
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
    const token = req.params.token || req.query.token || req.body.token;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Vui lòng cung cấp mã reset token hợp lệ.' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự' });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }, // token not expired (Date comparison)
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (hạn 60 phút).' });
    }

    // Set new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.' });
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
};

const logoutUser = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    res.status(200).json({ message: 'Đăng xuất thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
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

