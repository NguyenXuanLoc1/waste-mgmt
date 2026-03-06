const mongoose = require('mongoose');

const collectionRecordSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WasteReport',
      required: true,
    },
    collectorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organicWeight: { type: Number, default: 0 },
    recyclableWeight: { type: Number, default: 0 },
    hazardousWeight: { type: Number, default: 0 },
    totalWeight: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CollectionRecord', collectionRecordSchema);
