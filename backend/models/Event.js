const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    eventDate:   { type: Date, required: true },
    points:      { type: Number, required: true, min: 1 },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive:    { type: Boolean, default: true },

    participants: [
      {
        citizenId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        joinedAt:    { type: Date, default: Date.now },
        confirmed:   { type: Boolean, default: false }, // Admin confirmed attendance
        notAttended: { type: Boolean, default: false }, // Admin marked as not attended → -2x points
        pointsGiven: { type: Boolean, default: false }, // Points already awarded
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);