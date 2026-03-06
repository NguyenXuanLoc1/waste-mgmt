const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');
const CollectionRecord = require('../models/CollectionRecord');

// ── Mock AI Image Analysis ─────────────────────────────────────────────────
function mockAiAnalysis(photoUrl, declaredCategory) {
  const categories = ['organic', 'recyclable', 'hazardous', 'other'];
  const detectedCategory = categories[Math.floor(Math.random() * categories.length)];
  const confidence = Math.round(60 + Math.random() * 40); // 60–100%
  const isFake = Math.random() < 0.15; // 15% chance flagged as fake

  const categoryMatch = detectedCategory === declaredCategory;
  const notes = isFake
    ? 'Image appears unrelated to waste or heavily manipulated.'
    : categoryMatch
    ? `Detected category matches declared category (${detectedCategory}).`
    : `Declared "${declaredCategory}" but detected "${detectedCategory}". Manual review recommended.`;

  return { isFake, confidence, detectedCategory, notes, categoryMatch };
}

// GET /api/admin/all-reports
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

// GET /api/admin/dashboard-stats
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

// POST /api/admin/analyze-report  — run mock AI on a report
router.post('/analyze-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reportId } = req.body;
    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    const analysis = mockAiAnalysis(report.photoUrl, report.wasteCategory);
    report.aiAnalysis = analysis;
    await report.save();

    res.json({ message: 'AI analysis complete', analysis });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/approve-report
router.post('/approve-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reportId } = req.body;
    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'verified';
    await report.save();

    // Reward citizen +10 for approved proper report
    await User.findByIdAndUpdate(report.citizenId, { $inc: { behaviorScore: 10 } });

    res.json({ message: 'Report approved', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/reject-report
router.post('/reject-report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { reportId, reason } = req.body;
    const report = await WasteReport.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    report.status = 'rejected';
    report.rejectionReason = reason || 'Does not meet reporting criteria';
    await report.save();

    // Penalise citizen -20 for fake/rejected report
    await User.findByIdAndUpdate(report.citizenId, { $inc: { behaviorScore: -20 } });

    res.json({ message: 'Report rejected', report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/adjust-score
router.post('/adjust-score', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { citizenId, delta, reason } = req.body;
    if (!citizenId || delta === undefined)
      return res.status(400).json({ message: 'citizenId and delta required' });

    const user = await User.findByIdAndUpdate(
      citizenId,
      { $inc: { behaviorScore: parseInt(delta) } },
      { new: true }
    ).select('name email behaviorScore');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `Score adjusted by ${delta}`, user, reason });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/citizens  — list all citizens with scores
router.get('/citizens', authenticate, authorize('admin'), async (req, res) => {
  try {
    const citizens = await User.find({ role: 'citizen' })
      .select('name email behaviorScore createdAt')
      .sort({ behaviorScore: -1 })
      .lean();
    res.json(citizens);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/calculate-fee  — recalculate fee for a citizen
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

    // Base rates per kg
    let baseFee = totalOrganic * 1 + totalRecyclable * 0.5 + totalHazardous * 3;

    // Score discount: every 10 points above 100 = 2% discount, max 30%
    const scoreBonus = Math.min((citizen.behaviorScore - 100) / 10 * 0.02, 0.3);
    const discount = scoreBonus > 0 ? scoreBonus : 0;
    const finalFee = Math.max(baseFee * (1 - discount), 0).toFixed(2);

    res.json({
      citizen: { name: citizen.name, behaviorScore: citizen.behaviorScore },
      weights: { organic: totalOrganic, recyclable: totalRecyclable, hazardous: totalHazardous },
      baseFee: baseFee.toFixed(2),
      discount: (discount * 100).toFixed(1) + '%',
      finalFee,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
