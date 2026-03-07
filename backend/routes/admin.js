const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');
const CollectionRecord = require('../models/CollectionRecord');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.get('/all-reports', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};
    const reports = await WasteReport.find(filter)
      .populate('citizenId', 'name email behaviorScore')
      .populate('collectorId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await WasteReport.countDocuments(filter);
    res.json({ reports, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/dashboard-stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [totalReports, pending, completed, rejected, totalUsers] = await Promise.all([
      WasteReport.countDocuments(),
      WasteReport.countDocuments({ status: 'pending' }),
      WasteReport.countDocuments({ status: 'completed' }),
      WasteReport.countDocuments({ status: 'rejected' }),
      User.countDocuments({ role: 'citizen' }),
    ]);

    const weightAgg = await CollectionRecord.aggregate([
      {
        $group: {
          _id: null,
          organic: { $sum: '$organicWeight' },
          recyclable: { $sum: '$recyclableWeight' },
          hazardous: { $sum: '$hazardousWeight' },
          total: { $sum: '$totalWeight' },
        },
      },
    ]);

    res.json({
      totalReports, pending, completed, rejected, totalUsers,
      weights: weightAgg[0] || { organic: 0, recyclable: 0, hazardous: 0, total: 0 },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/analyze-report  — TÍCH HỢP GEMINI 2.5 VÀ TỰ ĐỘNG DUYỆT
router.post('/analyze-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reportId } = req.body;
    console.log(`\n--- 🚀 BẮT ĐẦU PHÂN TÍCH ẢNH (ID: ${reportId}) ---`);

    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    let base64Image = "";
    
    // Đọc ảnh từ local hoặc internet
    if (report.photoUrl.includes('/uploads/')) {
      const filename = report.photoUrl.split('/uploads/')[1];
      const filePath = path.join(__dirname, '../uploads', filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`❌ LỖI: Không tìm thấy file ảnh gốc tại: ${filePath}`);
        return res.status(400).json({ message: 'Không tìm thấy file ảnh' });
      }
      base64Image = fs.readFileSync(filePath, { encoding: 'base64' });
      console.log('✅ 1. Đã lấy được ảnh từ máy tính.');
    } else {
      const imageResp = await fetch(report.photoUrl);
      const arrayBuffer = await imageResp.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
      console.log('✅ 1. Đã lấy được ảnh từ Internet.');
    }

    // Yêu cầu AI phân tích rác và tính năng tái chế
    const prompt = `Bạn là chuyên gia phân loại rác thải. Hãy phân tích ảnh này.
    Loại rác do người dân khai báo là: "${report.wasteCategory}".

    Nhiệm vụ của bạn:
    1. Xác định ảnh có rác hay không (isFake).
    2. Xác định chính xác loại rác (hữu cơ, tái chế, độc hại, khác).
    3. Phân tích vật liệu (nhựa, giấy, nilon, đồ ăn...) và đánh giá xem rác này CÓ THỂ TÁI CHẾ ĐƯỢC KHÔNG.

    Trả về CHỈ ĐÚNG 1 JSON theo cấu trúc sau (không dùng markdown):
    {
      "isFake": boolean (true nếu KHÔNG CÓ RÁC hoặc là ảnh phong cảnh, con người, false nếu CÓ RÁC),
      "confidence": number (từ 0 đến 100),
      "detectedCategory": string (bắt buộc chọn 1: "organic", "recyclable", "hazardous", "other"),
      "categoryMatch": boolean (true nếu detectedCategory giống với loại khai báo),
      "notes": string (BẮT BUỘC MỞ ĐẦU bằng "[TÁI CHẾ ĐƯỢC]" hoặc "[KHÔNG TÁI CHẾ ĐƯỢC]". Sau đó mô tả rõ vật thể trong ảnh là gì và giải thích ngắn gọn).
    }`;

    const imageParts = [{ inlineData: { data: base64Image, mimeType: "image/jpeg" } }];

    console.log('🧠 2. Đang gửi ảnh cho Gemini 2.5 Flash...');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([prompt, ...imageParts]);
    let responseText = result.response.text();

    let cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : cleanedText);

    // Lưu kết quả phân tích vào báo cáo
    report.aiAnalysis = analysis;

    // --- LOGIC TỰ ĐỘNG DUYỆT (AUTO-APPROVE) ---
    let autoApproved = false;
    if (analysis.isFake === false) {
      // Nếu có rác thật -> Tự động chuyển trạng thái thành Verified
      report.status = 'verified';
      autoApproved = true;
      
      // Tự động cộng 10 điểm cho người dân
      await User.findByIdAndUpdate(report.citizenId, { $inc: { behaviorScore: 10 } });
      console.log('✅ 3. TỰ ĐỘNG DUYỆT: Ảnh hợp lệ, đã chuyển sang Verified và cộng 10 điểm cho người dân!');
    } else {
      console.log('⚠️ 3. CẦN ADMIN XEM XÉT: AI phát hiện ảnh Fake (không có rác), giữ nguyên trạng thái Pending.');
    }

    // Lưu lại toàn bộ vào Database
    await report.save();

    console.log('🎉 4. HOÀN TẤT! Kết quả AI trả về:', analysis);
    
    // Trả về cho Frontend biết là đã tự động duyệt hay chưa
    res.json({ message: 'AI analysis complete', analysis, autoApproved, newStatus: report.status });
  } catch (err) {
    console.error('❌ LỖI GEMINI CUỐI CÙNG:', err.message);
    res.status(500).json({ message: 'Lỗi chạy AI: ' + err.message });
  }
});

router.post('/approve-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reportId } = req.body;
    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.status = 'verified';
    await report.save();
    await User.findByIdAndUpdate(report.citizenId, { $inc: { behaviorScore: 10 } });
    res.json({ message: 'Report approved', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reject-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reportId, reason } = req.body;
    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    report.status = 'rejected';
    report.rejectionReason = reason || 'Does not meet reporting criteria';
    await report.save();
    await User.findByIdAndUpdate(report.citizenId, { $inc: { behaviorScore: -20 } });
    res.json({ message: 'Report rejected', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/adjust-score', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { citizenId, delta, reason } = req.body;
    if (!citizenId || delta === undefined) return res.status(400).json({ message: 'citizenId and delta required' });
    const user = await User.findByIdAndUpdate(citizenId, { $inc: { behaviorScore: parseInt(delta) } }, { new: true }).select('name email behaviorScore');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `Score adjusted by ${delta}`, user, reason });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/citizens', authenticate, authorize('admin'), async (req, res) => {
  try {
    const citizens = await User.find({ role: 'citizen' }).select('name email behaviorScore createdAt').sort({ behaviorScore: -1 }).lean();
    res.json(citizens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/calculate-fee', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { citizenId } = req.body;
    const citizen = await User.findById(citizenId);
    if (!citizen) return res.status(404).json({ message: 'Citizen not found' });
    const reports = await WasteReport.find({ citizenId, status: 'completed' });
    let totalOrganic = 0, totalRecyclable = 0, totalHazardous = 0;
    reports.forEach((r) => {
      totalOrganic += r.weights.organic || 0;
      totalRecyclable += r.weights.recyclable || 0;
      totalHazardous += r.weights.hazardous || 0;
    });
    let baseFee = totalOrganic * 1 + totalRecyclable * 0.5 + totalHazardous * 3;
    const scoreBonus = Math.min((citizen.behaviorScore - 100) / 10 * 0.02, 0.3);
    const discount = scoreBonus > 0 ? scoreBonus : 0;
    const finalFee = Math.max(baseFee * (1 - discount), 0).toFixed(2);
    res.json({ citizen: { name: citizen.name, behaviorScore: citizen.behaviorScore }, weights: { organic: totalOrganic, recyclable: totalRecyclable, hazardous: totalHazardous }, baseFee: baseFee.toFixed(2), discount: (discount * 100).toFixed(1) + '%', finalFee });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;