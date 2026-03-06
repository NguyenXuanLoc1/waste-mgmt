const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
      user: { id: user._id, name: user.name, email: user.email, role: user.role, behaviorScore: user.behaviorScore },
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
      user: { id: user._id, name: user.name, email: user.email, role: user.role, behaviorScore: user.behaviorScore },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/seed  — create admin & collector for dev
router.post('/seed', async (req, res) => {
  try {
    const seeds = [
      { name: 'Admin User', email: 'admin@waste.com', password: 'admin123', role: 'admin' },
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

module.exports = router;
