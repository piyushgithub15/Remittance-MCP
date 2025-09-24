import mongoose from 'mongoose';

const remittanceOrderSchema = new mongoose.Schema({
  orderNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Beneficiary',
    required: true
  },
  fromAmount: {
    type: Number,
    required: true,
    min: 0
  },
  feeAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalPayAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'AML_HOLD'],
    default: 'PENDING',
    index: true
  },
  dateDesc: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  failReason: {
    type: String,
    default: null
  },
  amlHoldUrl: {
    type: String,
    default: null
  },
  orderDetailUrl: {
    type: String,
    default: null
  },
  transferMode: {
    type: String,
    enum: ['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI'],
    required: true,
    index: true
  },
  country: {
    type: String,
    required: true,
    length: 2,
    uppercase: true,
    index: true
  },
  currency: {
    type: String,
    required: true,
    length: 3,
    uppercase: true,
    index: true
  },
  beneficiaryName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  exchangeRate: {
    type: Number,
    required: true
  },
  receivedAmount: {
    type: Number,
    required: true
  },
  paymentToken: {
    type: String,
    default: null
  },
  paymentLink: {
    type: String,
    default: null
  },
  callbackProvider: {
    type: String,
    enum: ['voice', 'text'],
    default: 'voice'
  },
  callbackUrl: {
    type: String,
    default: null
  },
  callbackToken: {
    type: String,
    default: null
  },
  traceCode: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
remittanceOrderSchema.index({ userId: 1, status: 1 });
remittanceOrderSchema.index({ userId: 1, date: -1 });
remittanceOrderSchema.index({ userId: 1, transferMode: 1 });
remittanceOrderSchema.index({ userId: 1, country: 1 });
remittanceOrderSchema.index({ userId: 1, currency: 1 });
remittanceOrderSchema.index({ userId: 1, dateDesc: 1 });

const RemittanceOrder = mongoose.model('RemittanceOrder', remittanceOrderSchema);

export default RemittanceOrder;
