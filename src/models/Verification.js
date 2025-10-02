import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  beneficiaryId: {
    type: String,
    required: true,
    index: true
  },
  lastFourDigits: {
    type: String,
    required: true
  },
  expiryDate: {
    type: String,
    required: true
  },
  verifiedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
verificationSchema.index({ userId: 1, isActive: 1 });
verificationSchema.index({ expiresAt: 1, isActive: 1 });
verificationSchema.index({ userId: 1, beneficiaryId: 1, isActive: 1 });

// TTL index to automatically remove expired documents
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Verification = mongoose.model('Verification', verificationSchema);

export default Verification;
