const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Helper: format user object nhất quán với auth.js ─────────────────────────
// auth.js dùng formatUser trả về `id` (không phải `_id`).
// Tất cả route trả user đều phải dùng hàm này để frontend không bị lệch.
const formatUser = (user) => ({
  id:            user._id,
  name:          user.name,
  email:         user.email,
  role:          user.role,
  behaviorScore: user.behaviorScore,
  phone:         user.phone     || '',
  avatarUrl:     user.avatarUrl || null,
});

// ── In-memory OTP store (mock — replace with Redis / SMS provider in prod) ──
const otpStore = new Map();
const generateOTP = () => String(Math.floor(100000 + Math.random() * 900000));

// ============================================================
// POST /api/citizen/send-otp
// ============================================================
router.post('/send-otp', async (req, res) => {
  try {
    const { contact } = req.body;
    if (!contact) return res.status(400).json({ message: 'Phone or email is required' });

    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    otpStore.set(contact.trim().toLowerCase(), { code, expiresAt });

    console.log(`📨 OTP for ${contact}: ${code}`);
    res.json({ message: 'OTP sent successfully', devCode: code });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/citizen/verify-otp
// ============================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { contact, code } = req.body;
    if (!contact || !code) return res.status(400).json({ message: 'Contact and code are required' });

    const key = contact.trim().toLowerCase();
    const record = otpStore.get(key);

    if (!record) return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
    if (new Date() > record.expiresAt) {
      otpStore.delete(key);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }
    if (record.code !== code.trim()) {
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    otpStore.delete(key);
    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/citizen/guest-report
// ============================================================
router.post(
  '/guest-report',
  upload.single('photo'),
  async (req, res) => {
    try {
      const {
        wasteCategory: wasteCategoryRaw,
        latitude, longitude, address, description,
        guestName, guestPhone, guestEmail, isVerified,
      } = req.body;

      if (!req.file) return res.status(400).json({ message: 'Photo is required' });
      if (!guestName?.trim()) return res.status(400).json({ message: 'Guest name is required' });
      if (!guestPhone?.trim() && !guestEmail?.trim())
        return res.status(400).json({ message: 'At least phone or email is required' });
      if (isVerified !== 'true')
        return res.status(400).json({ message: 'OTP verification required before submitting' });

      const wasteCategory = wasteCategoryRaw
        ? wasteCategoryRaw.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      if (!wasteCategory.length || !latitude || !longitude)
        return res.status(400).json({ message: 'Category and location required' });

      const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      const report = await WasteReport.create({
        citizenId:  null,
        isGuest:    true,
        guestName:  guestName.trim(),
        guestPhone: guestPhone?.trim() || '',
        guestEmail: guestEmail?.trim() || '',
        isVerified: true,
        photoUrl,
        wasteCategory,
        location: {
          latitude:  parseFloat(latitude),
          longitude: parseFloat(longitude),
          address:   address || '',
        },
        description: description || '',
      });

      res.status(201).json({ message: 'Guest report submitted! AI is analyzing.', report });

      const runAutoAI = async () => {
        try {
          console.log(`\n--- 🤖 [GUEST AUTO AI] ID: ${report._id} ---`);
          const filePath = path.join(__dirname, '../uploads', req.file.filename);
          const base64Image = fs.readFileSync(filePath, { encoding: 'base64' });

          const prompt = `Bạn là chuyên gia phân loại rác thải. Hãy phân tích ảnh này.
          Loại rác khai báo: "${wasteCategory.join(', ')}".
          1. Xác định ảnh có rác hay không (isFake). Nếu ảnh phong cảnh/người/không có rác -> isFake: true.
          2. Loại rác (organic, recyclable, hazardous, other).
          3. Đánh giá xem CÓ THỂ TÁI CHẾ ĐƯỢC KHÔNG.

          Trả về 1 JSON:
          {
            "isFake": boolean,
            "confidence": number,
            "detectedCategory": string,
            "categoryMatch": boolean,
            "notes": string (MỞ ĐẦU bằng "[TÁI CHẾ ĐƯỢC]" hoặc "[KHÔNG TÁI CHẾ ĐƯỢC]", sau đó giải thích.)
          }`;

          const imageParts = [{ inlineData: { data: base64Image, mimeType: 'image/jpeg' } }];
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent([prompt, ...imageParts]);
          let cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);

          const updatedReport = await WasteReport.findById(report._id);
          updatedReport.aiAnalysis = analysis;
          updatedReport.status = analysis.isFake === false ? 'verified' : 'rejected';
          if (analysis.isFake !== false) {
            updatedReport.rejectionReason = 'AI Auto-Reject: Bức ảnh không chứa rác thải.';
          }
          await updatedReport.save();
          console.log(`🎉 [GUEST AUTO AI] Xử lý xong: ${updatedReport.status}`);
        } catch (error) {
          console.error('❌ [GUEST AUTO AI] Lỗi:', error.message);
        }
      };
      runAutoAI();

    } catch (err) {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    }
  }
);

// ============================================================
// POST /api/citizen/report
// ============================================================
router.post(
  '/report',
  authenticate,
  authorize('citizen'),
  upload.single('photo'),
  async (req, res) => {
    try {
      const { wasteCategory: wasteCategoryRaw, latitude, longitude, address, description } = req.body;
      if (!req.file) return res.status(400).json({ message: 'Photo is required' });

      const wasteCategory = wasteCategoryRaw
        ? wasteCategoryRaw.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      if (!wasteCategory.length || !latitude || !longitude)
        return res.status(400).json({ message: 'Category and location required' });

      const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      const report = await WasteReport.create({
        citizenId: req.user._id,
        photoUrl,
        wasteCategory,
        location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address: address || '' },
        description: description || '',
      });

      res.status(201).json({ message: 'Report submitted successfully! AI is analyzing.', report });

      const runAutoAI = async () => {
        try {
          console.log(`\n--- 🤖 [AUTO] BẮT ĐẦU PHÂN TÍCH NGẦM (ID: ${report._id}) ---`);
          const filePath = path.join(__dirname, '../uploads', req.file.filename);
          const base64Image = fs.readFileSync(filePath, { encoding: 'base64' });

          const prompt = `Bạn là chuyên gia phân loại rác thải. Hãy phân tích ảnh này.
          Loại rác khai báo: "${wasteCategory.join(', ')}".
          1. Xác định ảnh có rác hay không (isFake). Nếu ảnh phong cảnh/người/không có rác -> isFake: true.
          2. Loại rác (organic, recyclable, hazardous, other).
          3. Đánh giá xem CÓ THỂ TÁI CHẾ ĐƯỢC KHÔNG.

          Trả về 1 JSON:
          {
            "isFake": boolean,
            "confidence": number,
            "detectedCategory": string,
            "categoryMatch": boolean,
            "notes": string (MỞ ĐẦU bằng "[TÁI CHẾ ĐƯỢC]" hoặc "[KHÔNG TÁI CHẾ ĐƯỢC]", sau đó giải thích.)
          }`;

          const imageParts = [{ inlineData: { data: base64Image, mimeType: 'image/jpeg' } }];
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          const result = await model.generateContent([prompt, ...imageParts]);
          let cleanedText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);

          const updatedReport = await WasteReport.findById(report._id);
          updatedReport.aiAnalysis = analysis;

          if (analysis.isFake === false) {
            updatedReport.status = 'verified';
            await User.findByIdAndUpdate(req.user._id, { $inc: { behaviorScore: 10 } });
            console.log('✅ [AUTO] RÁC THẬT! Đã tự động DUYỆT và cộng 10 điểm.');
          } else {
            updatedReport.status = 'rejected';
            updatedReport.rejectionReason = 'AI Auto-Reject: Bức ảnh không chứa rác thải.';
            await User.findByIdAndUpdate(req.user._id, { $inc: { behaviorScore: -20 } });
            console.log('❌ [AUTO] ẢNH FAKE! Đã tự động TỪ CHỐI và trừ 20 điểm.');
          }

          await updatedReport.save();
          console.log('🎉 [AUTO] XỬ LÝ HOÀN TẤT!');
        } catch (error) {
          console.error('❌ [AUTO] LỖI AI NGẦM:', error.message);
        }
      };
      runAutoAI();

    } catch (err) {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    }
  }
);

// ============================================================
// GET /api/citizen/my-reports
// ============================================================
router.get('/my-reports', authenticate, authorize('citizen'), async (req, res) => {
  try {
    const reports = await WasteReport.find({ citizenId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// GET /api/citizen/my-score
// ============================================================
router.get('/my-score', authenticate, authorize('citizen'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email phone avatarUrl behaviorScore');
    const reports = await WasteReport.find({ citizenId: req.user._id });

    const totalFee = reports.reduce((sum, r) => sum + (r.collectionFee || 0), 0);
    const reportCounts = {
      total:     reports.length,
      pending:   reports.filter((r) => r.status === 'pending').length,
      completed: reports.filter((r) => r.status === 'completed').length,
      rejected:  reports.filter((r) => r.status === 'rejected').length,
    };

    res.json({ ...user.toObject(), totalFee, reportCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// PUT /api/citizen/profile  — cập nhật tên, số điện thoại
// ============================================================
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ message: 'Name is required' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim(), phone: phone?.trim() || '' },
      { new: true }
    ).select('name email phone avatarUrl role behaviorScore');

    // ✅ FIX: formatUser → trả `id` thay vì `_id`, nhất quán với auth.js
    res.json({ message: 'Profile updated successfully', user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ============================================================
// POST /api/citizen/avatar  — upload ảnh đại diện
// ============================================================
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

      const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { avatarUrl },
        { new: true }
      ).select('name email phone avatarUrl role behaviorScore');

      // ✅ FIX: formatUser → trả `id` thay vì `_id`, nhất quán với auth.js
      res.json({ message: 'Avatar updated successfully', user: formatUser(user) });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;