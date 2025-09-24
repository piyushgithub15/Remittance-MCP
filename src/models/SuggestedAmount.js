import mongoose from 'mongoose';

const suggestedAmountSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'AED',
    length: 3,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Create index for efficient queries
suggestedAmountSchema.index({ isActive: 1, sortOrder: 1 });

const SuggestedAmount = mongoose.model('SuggestedAmount', suggestedAmountSchema);

export default SuggestedAmount;
