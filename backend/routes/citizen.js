const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const WasteReport = require('../models/WasteReport');
const User = require('../models/User');

// POST /api/citizen/report  — submit a waste report
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

      const report = await WasteReport.create({
        citizenId: req.user._id,
        photoUrl,
        wasteCategory,
        location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address: address || '' },
        description: description || '',
      });

      res.status(201).json({ message: 'Report submitted', report });
    } catch (err) {
      res.status(500).json({ message: err.message });
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
