const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const WorkoutLog = require('../models/WorkoutLog');
const NutritionLog = require('../models/NutritionLog');
const Food = require('../models/Food');

// Never expose these fields in API responses (reset/verification tokens would allow account takeover)
const SECRET_FIELDS = '-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires';

// Request bodies are untrusted JSON: a field expected to be text may arrive as an object/array
// (e.g. { "$ne": null }). Reject those instead of letting them reach a query or a string method.
const allStrings = (...values) => values.every(v => typeof v === 'string');

// 8..100 characters, no leading/trailing whitespace. Returns an error message or null.
const passwordRuleError = (password) => {
  if (typeof password !== 'string' || !password) return 'Vui lòng nhập mật khẩu.';
  if (password !== password.trim()) return 'Mật khẩu không được chứa khoảng trắng ở đầu hoặc cuối.';
  if (password.length < 8 || password.length > 100) return 'Mật khẩu phải từ 8 đến 100 ký tự.';
  return null;
};

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
    // NOTE: a "password" field in the body is ignored on purpose. The password is chosen by whoever
    // opens the emailed link, which is what stops someone pre-registering another person's email.
    let { name, username, email } = req.body;

    if (!allStrings(name, username, email) || !name || !username || !email) {
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

    // The username and the email can belong to two different existing accounts, so look at all matches.
    const matches = await User.find({ $or: [{ email: trimmedEmail }, { username: trimmedUsername }] });

    if (matches.some(u => u.isEmailVerified)) {
      return res.status(400).json({ message: 'Tên đăng nhập hoặc Email đã tồn tại trên hệ thống.' });
    }

    // An account that is still waiting for its verification email must NOT be replaced by a new
    // sign-up (that would let anyone wipe someone's pending registration). Only stale ones (token
    // expired, the TTL index just has not removed them yet) are cleaned up.
    const now = Date.now();
    const stillPending = matches.some(u => !u.verificationTokenExpires || u.verificationTokenExpires.getTime() > now);
    if (stillPending) {
      return res.status(409).json({
        message: 'Tên đăng nhập hoặc Email này đang chờ xác thực. Hãy đăng nhập để gửi lại email xác thực, hoặc đợi tối đa 10 phút rồi đăng ký lại.',
        pendingVerification: true,
      });
    }
    if (matches.length > 0) {
      await User.deleteMany({ _id: { $in: matches.map(u => u._id) } });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    let user;
    try {
      user = await User.create({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });
    } catch (createErr) {
      // Two sign-ups for the same username/email raced past the checks above: the unique index decides
      if (createErr && createErr.code === 11000) {
        return res.status(409).json({
          message: 'Tên đăng nhập hoặc Email này vừa được đăng ký. Vui lòng thử lại hoặc chọn thông tin khác.',
          pendingVerification: true,
        });
      }
      throw createErr;
    }

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
        subject: 'Xác thực email & đặt mật khẩu Smart App',
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
      message: 'Đã gửi email xác thực! Vui lòng mở link trong email (hiệu lực 10 phút) để đặt mật khẩu và kích hoạt tài khoản.',
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

    if (!allStrings(username, password) || !username || !password) {
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

    // verified but never given a password (e.g. verified by hand by an admin): nothing to compare with
    if (!user.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
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


// Finds the pending account for an emailed sign-up token, or explains why there is none.
// Used by both steps of the flow (check the link, then complete it).
const findPendingByToken = async (token) => {
  if (typeof token !== 'string' || !token) return { error: 'Token is required' };
  const user = await User.findOne({ verificationToken: token });
  if (!user || user.isEmailVerified) {
    return { error: 'Liên kết xác thực không hợp lệ hoặc đã được sử dụng. Vui lòng đăng ký lại.' };
  }
  if (user.verificationTokenExpires && user.verificationTokenExpires.getTime() <= Date.now()) {
    return { error: 'Liên kết xác thực đã hết hạn. Vui lòng đăng ký lại.' };
  }
  return { user };
};

// @desc    Check an email verification link (does NOT activate anything: link scanners / prefetchers
//          that open the URL must not be able to consume the token)
// @route   GET /api/users/verify/:token
// @access  Public
const checkVerificationToken = async (req, res) => {
  try {
    const { user, error } = await findPendingByToken(req.params.token);
    if (error) return res.status(400).json({ message: error });
    res.status(200).json({ valid: true, name: user.name, email: user.email });
  } catch (error) {
    console.error('checkVerificationToken error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// @desc    Finish sign-up: the owner of the email picks a password, which also verifies the account
// @route   POST /api/users/verify/:token
// @access  Public
const completeRegistration = async (req, res) => {
  try {
    const passwordError = passwordRuleError(req.body && req.body.password);
    if (passwordError) return res.status(400).json({ message: passwordError });

    const { user, error } = await findPendingByToken(req.params.token);
    if (error) return res.status(400).json({ message: error });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.password, salt);
    // Mark verified and clear both token fields to prevent TTL auto-deletion; the token is single-use
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Đã đặt mật khẩu và kích hoạt tài khoản! Bạn có thể đăng nhập ngay bây giờ.' });
  } catch (error) {
    console.error('completeRegistration error:', error);
    res.status(500).json({ message: 'Server error during email verification' });
  }
};

// @desc    Resend verification email
// @route   POST /api/users/resend-verification
// @access  Public
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!allStrings(email) || !email) {
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
    const user = await User.findById(req.user.id).select(SECRET_FIELDS);
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

      if (req.body.gender !== undefined) {
        if (!['Nam', 'Nữ', 'Khác', ''].includes(req.body.gender)) {
          return res.status(400).json({ message: 'Giới tính không hợp lệ.' });
        }
        user.gender = req.body.gender;
      }

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

      if (req.body.goal !== undefined) {
        if (!['Tăng cơ', 'Giảm mỡ', 'Tăng cân', 'Giữ dáng', ''].includes(req.body.goal)) {
          return res.status(400).json({ message: 'Mục tiêu không hợp lệ.' });
        }
        user.goal = req.body.goal;
      }
      if (req.body.activityLevel !== undefined) {
        if (!['Ít vận động', 'Vận động nhẹ', 'Vận động vừa', 'Vận động nhiều', 'Vận động cực nhiều', ''].includes(req.body.activityLevel)) {
          return res.status(400).json({ message: 'Mức độ vận động không hợp lệ.' });
        }
        user.activityLevel = req.body.activityLevel;
      }
      if (req.body.lastActiveRoutineId !== undefined) user.lastActiveRoutineId = req.body.lastActiveRoutineId;
      if (req.body.lastActiveRoutineName !== undefined) user.lastActiveRoutineName = req.body.lastActiveRoutineName;
      if (req.body.lastActiveDayIndex !== undefined) {
        const idx = Number(req.body.lastActiveDayIndex);
        if (!Number.isInteger(idx) || idx < 0 || idx > 6) {
          return res.status(400).json({ message: 'Chỉ số ngày không hợp lệ.' });
        }
        user.lastActiveDayIndex = idx;
      }

      if (req.body.password) {
        const { password: newPassword, currentPassword } = req.body;
        if (typeof newPassword !== 'string' || newPassword !== newPassword.trim() || newPassword.length < 8 || newPassword.length > 100) {
          return res.status(400).json({ message: 'Mật khẩu mới phải từ 8 đến 100 ký tự và không có khoảng trắng ở đầu/cuối.' });
        }
        // 400 (not 401) on purpose: the client treats 401 as "session expired" and logs out
        if (typeof currentPassword !== 'string' || !currentPassword) {
          return res.status(400).json({ message: 'Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.' });
        }
        if (!(await bcrypt.compare(currentPassword, user.password))) {
          return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
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
    const users = await User.find({}).select(SECRET_FIELDS);
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
      // Remove the account first, then its data: a failure in between leaves harmless orphans
      // instead of an account whose history was wiped.
      await User.deleteOne({ _id: user._id });
      await Promise.all([
        WorkoutLog.deleteMany({ user: user._id }),
        NutritionLog.deleteMany({ user: user._id }),
        Food.deleteMany({ user: user._id, isCustom: true }),
      ]);
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
        if (req.body.isEmailVerified && !user.password) {
          return res.status(400).json({ message: 'Tài khoản này chưa đặt mật khẩu: người dùng cần hoàn tất đăng ký qua link trong email.' });
        }
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
    if (!allStrings(email) || !email.trim()) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    // emails are stored trimmed + lowercase (see registerUser)
    const user = await User.findOne({ email: email.trim().toLowerCase() });

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

    if (!allStrings(token || '', password || '')) {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
    }

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
  checkVerificationToken,
  completeRegistration,
  resendVerification,
  getProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
  updateUserRoleAndStatus,
  forgotPassword,
  resetPassword,
};

