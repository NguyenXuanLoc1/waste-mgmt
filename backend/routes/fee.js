const express = require('express');
const router  = express.Router();
const Fee     = require('../models/Fee');
const { authenticate } = require('../middleware/auth');  // fix: protect → authenticate

// GET /api/fee/me
// Trả về unpaid fee mới nhất của citizen đang login
router.get('/me', authenticate, async (req, res) => {
  try {
    const fee = await Fee.findOne({
      citizenId: req.user._id,
      status: 'unpaid',
    }).sort({ createdAt: -1 });

    if (!fee) return res.json({ fee: null }); // UI sẽ ẩn Pay Now

    res.json({ fee });
  } catch (err) {
    console.error('fee/me error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;