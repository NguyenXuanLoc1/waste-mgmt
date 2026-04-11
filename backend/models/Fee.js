const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
  {
    reportId:    { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', required: true, unique: true },
    citizenId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    citizenName: { type: String, required: true },
    kgOfTrash:   { type: Number, required: true },
    amountToPay: { type: Number, required: true },
    status:      { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fee', feeSchema);