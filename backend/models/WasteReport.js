const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema(
  {
    // ── Reporter identity ─────────────────────────────────────────────────
    // For registered citizens citizenId is set; for guests it is null.
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,       // NOT required — guests have no account
    },

    // ── Guest identity fields (only populated when isGuest === true) ──────
    isGuest:    { type: Boolean, default: false },
    guestName:  { type: String,  default: '' },
    guestPhone: { type: String,  default: '' },
    guestEmail: { type: String,  default: '' },
    isVerified: { type: Boolean, default: false },

    // ── Report content ────────────────────────────────────────────────────
    photoUrl: { type: String, required: true },

    // Stored as an array — supports multi-category selection.
    // The API always wraps into an array before saving for backward compat.
    wasteCategory: {
      type: [String],
      enum: ['organic', 'recyclable', 'hazardous', 'other'],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one waste category is required',
      },
    },

    location: {
      latitude:  { type: Number, required: true },
      longitude: { type: Number, required: true },
      address:   { type: String, default: '' },
    },
    description: { type: String, default: '' },

    // ── Workflow ──────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'verified', 'completed', 'rejected'],
      default: 'pending',
    },
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    weights: {
      organic:    { type: Number, default: 0 },
      recyclable: { type: Number, default: 0 },
      hazardous:  { type: Number, default: 0 },
    },
    aiAnalysis: {
      isFake:           { type: Boolean, default: false },
      confidence:       { type: Number,  default: 0 },
      detectedCategory: { type: String,  default: '' },
      categoryMatch:    { type: Boolean, default: false },
      notes:            { type: String,  default: '' },
    },
    rejectionReason: { type: String, default: '' },
    collectionFee:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WasteReport', wasteReportSchema);
