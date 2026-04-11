const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true },
    reportId:      { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', required: true, unique: true },
    citizenId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaid:    { type: Number, required: true },
    status:        { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    paidAt:        { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);