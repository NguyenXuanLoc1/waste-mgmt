const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── Helper: format user object đầy đủ để trả về client ──────────────────────
const formatUser = (user) => ({
  id:            user._id,
  name:          user.name,
  email:         user.email,
  role:          user.role,
  behaviorScore: user.behaviorScore,
  phone:         user.phone     || '',    // ← FIX: thêm phone
  avatarUrl:     user.avatarUrl || null,  // ← FIX: thêm avatarUrl
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    // Only allow citizen self-registration; admin/collector must be created manually
    const allowedRole = role === 'citizen' || !role ? 'citizen' : 'citizen';
    const user = await User.create({ name, email, password, role: allowedRole });

    res.status(201).json({
      token: signToken(user._id),
      user:  formatUser(user),  // ← FIX: dùng formatUser
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({
      token: signToken(user._id),
      user:  formatUser(user),  // ← FIX: dùng formatUser
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/seed  — create admin & collector for dev
router.post('/seed', async (req, res) => {
  try {
    const seeds = [
      { name: 'Admin User',    email: 'admin@waste.com',     password: 'admin123',     role: 'admin' },
      { name: 'Collector Joe', email: 'collector@waste.com', password: 'collector123', role: 'collector' },
    ];
    const created = [];
    for (const s of seeds) {
      const exists = await User.findOne({ email: s.email });
      if (!exists) {
        const u = await User.create(s);
        created.push(u.email);
      }
    }
    res.json({ message: 'Seed done', created });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/leaderboard — Public, không cần token
router.get('/leaderboard', async (req, res) => {
  try {
    const citizens = await User.find({ role: 'citizen' })
      .select('name behaviorScore')
      .sort({ behaviorScore: -1 })
      .lean();
    res.json(citizens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Lưu OTP tạm trong memory ──────────────────────────────────────────────────
const otpStore = new Map();

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: 'Email not found. Please check and try again.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStore.set(email.trim().toLowerCase(), { otp, expiresAt });

    console.log(`\n🔑 [FORGOT PASSWORD] OTP cho ${email}: ${otp} (hết hạn sau 10 phút)`);

    if (process.env.MAIL_USER && process.env.MAIL_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
        });
        await transporter.sendMail({
          from: `"WasteMgmt" <${process.env.MAIL_USER}>`,
          to: email,
          subject: '🔐 Password Reset Code — WasteMgmt',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
              <h2 style="color:#22c55e">♻️ WasteMgmt</h2>
              <p>You requested a password reset. Use the code below:</p>
              <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#111;text-align:center;padding:24px 0">
                ${otp}
              </div>
              <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
        console.log(`📧 [FORGOT PASSWORD] Đã gửi email OTP tới ${email}`);
      } catch (mailErr) {
        console.warn('⚠️ [FORGOT PASSWORD] Không gửi được email:', mailErr.message);
      }
    }

    res.json({
      message: 'Reset code sent. Check your email.',
      ...(process.env.NODE_ENV !== 'production' && { devCode: otp }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ message: 'Email, OTP and new password are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const key    = email.trim().toLowerCase();
    const stored = otpStore.get(key);

    if (!stored)
      return res.status(400).json({ message: 'No reset code found. Please request a new one.' });

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    if (stored.otp !== otp.trim())
      return res.status(400).json({ message: 'Invalid code. Please check and try again.' });

    const user = await User.findOne({ email: key });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = newPassword;
    await user.save();

    otpStore.delete(key);

    console.log(`✅ [RESET PASSWORD] Mật khẩu của ${email} đã được cập nhật`);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;