const mongoose = require('mongoose');
const { productSchema } = require('./product');
const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  chargeId: {
    type: String,
    required: true
  }
  

}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
