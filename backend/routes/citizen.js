const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/citizen/report  — NỘP BÁO CÁO & TỰ ĐỘNG CHẠY AI NGẦM
router.post(
  '/report',
  authenticate,
  authorize('citizen'),
  upload.single('photo'),
  async (req, res) => {
    try {
      const { wasteCategory, latitude, longitude, address, description } = req.body;
      if (!req.file) return res.status(400).json({ message: 'Photo is required' });
      if (!wasteCategory || !latitude || !longitude)
        return res.status(400).json({ message: 'Category and location required' });

      const photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

      // 1. Lưu report vào Database với trạng thái Pending ngay lập tức
      const report = await WasteReport.create({
        citizenId: req.user._id,
        photoUrl,
        wasteCategory,
        location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address: address || '' },
        description: description || '',
      });

      // 2. TRẢ KẾT QUẢ NGAY CHO APP ĐIỆN THOẠI (Không bắt người dùng chờ)
      res.status(201).json({ message: 'Report submitted successfully! AI is analyzing.', report });

      // =========================================================================
      // 3. HÀM CHẠY NGẦM: TỰ ĐỘNG PHÂN TÍCH VÀ DUYỆT/TỪ CHỐI (Background Task)
      // =========================================================================
      const runAutoAI = async () => {
        try {
          console.log(`\n--- 🤖 [AUTO] BẮT ĐẦU PHÂN TÍCH NGẦM (ID: ${report._id}) ---`);
          const filePath = path.join(__dirname, '../uploads', req.file.filename);
          const base64Image = fs.readFileSync(filePath, { encoding: 'base64' });

          const prompt = `Bạn là chuyên gia phân loại rác thải. Hãy phân tích ảnh này.
          Loại rác khai báo: "${wasteCategory}".
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

          const imageParts = [{ inlineData: { data: base64Image, mimeType: "image/jpeg" } }];
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          
          const result = await model.generateContent([prompt, ...imageParts]);
          let responseText = result.response.text();
          let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
          const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);

          const updatedReport = await WasteReport.findById(report._id);
          updatedReport.aiAnalysis = analysis;

          // =======================================================
          // LUỒNG AUTO-APPROVE / AUTO-REJECT MỚI NHẤT
          // =======================================================
          if (analysis.isFake === false) {
            // RÁC THẬT: Tự động Approve
            updatedReport.status = 'verified';
            await User.findByIdAndUpdate(req.user._id, { $inc: { behaviorScore: 10 } }); 
            console.log('✅ [AUTO] RÁC THẬT! Đã tự động DUYỆT (Verified) và cộng 10 điểm.');
          } else {
            // RÁC GIẢ / PHONG CẢNH: Tự động Reject
            updatedReport.status = 'rejected';
            updatedReport.rejectionReason = 'AI Auto-Reject: Bức ảnh không chứa rác thải.';
            await User.findByIdAndUpdate(req.user._id, { $inc: { behaviorScore: -20 } }); 
            console.log('❌ [AUTO] ẢNH FAKE! Đã tự động TỪ CHỐI (Rejected) và trừ 20 điểm.');
          }

          await updatedReport.save();
          console.log('🎉 [AUTO] XỬ LÝ HOÀN TẤT!');

        } catch (error) {
          console.error('❌ [AUTO] LỖI AI NGẦM:', error.message);
        }
      };

      runAutoAI(); // Chạy ngầm

    } catch (err) {
      if (!res.headersSent) res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/citizen/my-reports
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

// GET /api/citizen/my-score
router.get('/my-score', authenticate, authorize('citizen'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('name email behaviorScore');
    const reports = await WasteReport.find({ citizenId: req.user._id });

    const totalFee = reports.reduce((sum, r) => sum + (r.collectionFee || 0), 0);
    const reportCounts = {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      completed: reports.filter((r) => r.status === 'completed').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
    };

    res.json({ ...user.toObject(), totalFee, reportCounts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;