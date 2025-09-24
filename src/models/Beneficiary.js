import mongoose from 'mongoose';

const beneficiarySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  id: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  currency: {
    type: String,
    required: true,
    length: 3,
    uppercase: true
  },
  icon: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    required: true,
    length: 2,
    uppercase: true
  },
  transferModes: [{
    type: String,
    enum: ['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI'],
    required: true
  }],
  accountNumber: {
    type: String,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  bankCode: {
    type: String,
    default: ''
  },
  branchCode: {
    type: String,
    default: ''
  },
  swiftCode: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
beneficiarySchema.index({ userId: 1, isActive: 1 });
beneficiarySchema.index({ userId: 1, country: 1, currency: 1 });

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

export default Beneficiary;
