const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Event = require('../models/Event');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC / CITIZEN
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/events  — get all active events
router.get('/', authenticate, async (req, res) => {
  try {
    const events = await Event.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ eventDate: 1 })
      .lean();

    const userId = req.user._id.toString();
    const result = events.map((e) => {
      const participant = e.participants.find(
        (p) => p.citizenId?.toString() === userId
      );
      return {
        ...e,
        hasJoined:    !!participant,
        isConfirmed:  participant?.confirmed || false,
        notAttended:  participant?.notAttended || false,
        pointsGiven:  participant?.pointsGiven || false,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/:id/join  — citizen registers for event
router.post('/:id/join', authenticate, authorize('citizen'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (!event.isActive) return res.status(400).json({ message: 'Event is no longer active' });

    const alreadyJoined = event.participants.some(
      (p) => p.citizenId?.toString() === req.user._id.toString()
    );
    if (alreadyJoined)
      return res.status(400).json({ message: 'You have already joined this event' });

    event.participants.push({ citizenId: req.user._id });
    await event.save();

    res.json({ message: 'Joined successfully!', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/events  — Admin creates a new event
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, eventDate, points } = req.body;
    if (!title || !eventDate || !points)
      return res.status(400).json({ message: 'Title, eventDate, and points are required' });

    const event = await Event.create({
      title,
      description: description || '',
      eventDate: new Date(eventDate),
      points: parseInt(points),
      createdBy: req.user._id,
    });

    res.status(201).json({ message: 'Event created', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/events/admin/all  — Admin views all events + participants
router.get('/admin/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const events = await Event.find()
      .populate('createdBy', 'name')
      .populate('participants.citizenId', 'name email behaviorScore')
      .sort({ createdAt: -1 })
      .lean();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/:id/confirm/:citizenId  — Admin confirms attendance → award points
router.post('/:id/confirm/:citizenId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const participant = event.participants.find(
      (p) => p.citizenId?.toString() === req.params.citizenId
    );
    if (!participant)
      return res.status(404).json({ message: 'Participant not found' });
    if (participant.pointsGiven)
      return res.status(400).json({ message: 'Points already given to this participant' });
    if (participant.notAttended)
      return res.status(400).json({ message: 'This participant was already marked as not attended' });

    participant.confirmed    = true;
    participant.pointsGiven  = true;
    participant.notAttended  = false;
    await event.save();

    await User.findByIdAndUpdate(req.params.citizenId, {
      $inc: { behaviorScore: event.points },
    });

    res.json({ message: `✅ Confirmed and gave +${event.points} points`, event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/events/:id/not-attended/:citizenId  — Admin marks as NOT attended → deduct 2x points
router.post('/:id/not-attended/:citizenId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const participant = event.participants.find(
      (p) => p.citizenId?.toString() === req.params.citizenId
    );
    if (!participant)
      return res.status(404).json({ message: 'Participant not found' });
    if (participant.pointsGiven)
      return res.status(400).json({ message: 'Points already given — cannot mark as not attended' });
    if (participant.notAttended)
      return res.status(400).json({ message: 'Already marked as not attended' });

    const deduction = event.points * 2;

    participant.notAttended = true;
    participant.confirmed   = false;
    await event.save();

    await User.findByIdAndUpdate(req.params.citizenId, {
      $inc: { behaviorScore: -deduction },
    });

    res.json({ message: `❌ Marked as not attended. -${deduction} points deducted`, event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/events/:id  — Admin updates event
router.patch('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { title, description, eventDate, points, isActive } = req.body;
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { title, description, eventDate, points, isActive },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event updated', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/events/:id  — Admin deletes event
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;