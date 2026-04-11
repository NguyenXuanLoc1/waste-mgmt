const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true }, // ZaloPay zp_trans_id
    reportId:      { type: mongoose.Schema.Types.ObjectId, ref: 'WasteReport', required: true, unique: true },
    citizenId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaid:    { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
