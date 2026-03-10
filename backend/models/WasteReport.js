const mongoose = require('mongoose');

const wasteReportSchema = new mongoose.Schema(
  {
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photoUrl: { type: String, required: true },
    wasteCategory: {
      type: [String],
      enum: ['organic', 'recyclable', 'hazardous', 'other'],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'At least one waste category is required',
      },
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, default: '' },
    },
    description: { type: String, default: '' },
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
      organic: { type: Number, default: 0 },
      recyclable: { type: Number, default: 0 },
      hazardous: { type: Number, default: 0 },
    },
    aiAnalysis: {
      isFake: { type: Boolean, default: false },
      confidence: { type: Number, default: 0 },
      detectedCategory: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    rejectionReason: { type: String, default: '' },
    collectionFee: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WasteReport', wasteReportSchema);
