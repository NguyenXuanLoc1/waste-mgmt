const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const WasteReport = require('../models/WasteReport');
const CollectionRecord = require('../models/CollectionRecord');
const User = require('../models/User');

// GET /api/collector/reports  — all pending/verified reports
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

    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (!['pending', 'verified'].includes(report.status))
      return res.status(400).json({ message: 'Report cannot be updated' });

    const organic = parseFloat(organicWeight) || 0;
    const recyclable = parseFloat(recyclableWeight) || 0;
    const hazardous = parseFloat(hazardousWeight) || 0;
    const total = organic + recyclable + hazardous;

    // Save collection record
    await CollectionRecord.create({
      reportId,
      collectorId: req.user._id,
      organicWeight: organic,
      recyclableWeight: recyclable,
      hazardousWeight: hazardous,
      totalWeight: total,
    });

    // Calculate fee: organic=1/kg, recyclable=0.5/kg, hazardous=3/kg
    const fee = organic * 1 + recyclable * 0.5 + hazardous * 3;

    report.weights = { organic, recyclable, hazardous };
    report.status = 'completed';
    report.collectionFee = fee;
    report.collectorId = req.user._id;
    await report.save();

    // Award citizen +5 points for completing
    await User.findByIdAndUpdate(report.citizenId, { $inc: { behaviorScore: 5 } });

    res.json({ message: 'Collection recorded', fee, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
