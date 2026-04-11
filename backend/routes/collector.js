const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const WasteReport = require('../models/WasteReport');
const CollectionRecord = require('../models/CollectionRecord');
const User = require('../models/User');
const Fee = require('../models/Fee');   // ← THÊM

// GET /api/collector/reports
router.get('/reports', authenticate, authorize('collector'), async (req, res) => {
  try {
    const reports = await WasteReport.find({
      status: { $in: ['pending', 'verified'] },
    })
      .populate('citizenId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/collector/verify-report
router.post('/verify-report', authenticate, authorize('collector'), async (req, res) => {
  try {
    const { reportId } = req.body;
    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.status !== 'pending')
      return res.status(400).json({ message: 'Report already processed' });

    report.status = 'verified';
    report.collectorId = req.user._id;
    await report.save();

    res.json({ message: 'Report verified', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/collector/submit-weight
router.post('/submit-weight', authenticate, authorize('collector'), async (req, res) => {
  try {
    const { reportId, organicWeight, recyclableWeight, hazardousWeight } = req.body;

    const report = await WasteReport.findById(reportId).populate('citizenId', 'name behaviorScore');
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (!['pending', 'verified'].includes(report.status))
      return res.status(400).json({ message: 'Report cannot be updated' });

    const organic    = parseFloat(organicWeight)    || 0;
    const recyclable = parseFloat(recyclableWeight) || 0;
    const hazardous  = parseFloat(hazardousWeight)  || 0;
    const total      = organic + recyclable + hazardous;

    // Save collection record
    await CollectionRecord.create({
      reportId,
      collectorId:     req.user._id,
      organicWeight:   organic,
      recyclableWeight: recyclable,
      hazardousWeight: hazardous,
      totalWeight:     total,
    });

    // Tính fee gốc
    const baseFee = organic * 1 + recyclable * 0.5 + hazardous * 3;

    // Tính discount từ behaviorScore của citizen
    const score = report.citizenId?.behaviorScore || 100;
    const scoreBonus = Math.min((score - 100) / 10 * 0.02, 0.3);
    const discount   = scoreBonus > 0 ? scoreBonus : 0;
    const finalFee   = parseFloat(Math.max(baseFee * (1 - discount), 0).toFixed(2));

    // Cập nhật report
    report.weights       = { organic, recyclable, hazardous };
    report.status        = 'completed';
    report.collectionFee = finalFee;
    report.collectorId   = req.user._id;
    await report.save();

    // ── TẠO FEE RECORD (FIX CHÍNH) ──────────────────────────────
    const existingFee = await Fee.findOne({ reportId });
    if (!existingFee) {
      console.log('Creating fee for report:', reportId);
      await Fee.create({
        reportId:    report._id,
        citizenId:   report.citizenId._id,
        citizenName: report.citizenId.name,
        kgOfTrash:   total,
        amountToPay: finalFee,
        status:      'unpaid',
      });
      console.log('Fee created successfully:', finalFee);
    } else {
      console.log('Fee already exists for report:', reportId, '— skipping');
    }
    // ─────────────────────────────────────────────────────────────

    // Cộng 5 điểm cho citizen
    await User.findByIdAndUpdate(report.citizenId._id, { $inc: { behaviorScore: 5 } });

    res.json({ message: 'Collection recorded', fee: finalFee, total });
  } catch (err) {
    console.error('submit-weight error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;