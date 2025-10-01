import mongoose from 'mongoose';
import { 
  TRANSACTION_STATUS_VALUES, 
  TRANSFER_MODE_VALUES, 
  CALLBACK_PROVIDER_VALUES, 
  UPDATE_SOURCE_VALUES, 
  DELIVERY_STATUS_VALUES, 
  PAYMENT_METHOD_VALUES 
} from '../constants/enums.js';

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
    enum: TRANSACTION_STATUS_VALUES,
    default: 'PENDING',
    index: true
  },
  actual_status: {
    type: String,
    enum: TRANSACTION_STATUS_VALUES,
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
    enum: TRANSFER_MODE_VALUES,
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
    enum: CALLBACK_PROVIDER_VALUES,
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
  },
  
  // Status tracking fields
  statusHistory: [{
    status: {
      type: String,
      enum: TRANSACTION_STATUS_VALUES,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: null
    },
    updatedBy: {
      type: String,
      enum: UPDATE_SOURCE_VALUES,
      default: 'system'
    }
  }],
  
  // Delivery tracking
  expectedDeliveryTime: {
    type: Date,
    default: null
  },
  actualDeliveryTime: {
    type: Date,
    default: null
  },
  deliveryStatus: {
    type: String,
    enum: DELIVERY_STATUS_VALUES,
    default: 'pending'
  },
  
  // Customer service fields
  lastCustomerInquiry: {
    type: Date,
    default: null
  },
  inquiryCount: {
    type: Number,
    default: 0
  },
  escalationLevel: {
    type: Number,
    min: 0,
    max: 3,
    default: 0
  },
  escalationReason: {
    type: String,
    default: null
  },
  conversationSummary: {
    type: String,
    default: null
  },
  
  // Bank processing details
  bankProcessingTime: {
    type: Date,
    default: null
  },
  bankReference: {
    type: String,
    default: null
  },
  bankResponseCode: {
    type: String,
    default: null
  },
  
  // Timeframe management
  originalTimeframe: {
    type: String,
    default: null
  },
  updatedTimeframe: {
    type: String,
    default: null
  },
  timeframeReason: {
    type: String,
    default: null
  },
  
  // Payment method tracking
  paymentMethod: {
    type: String,
    enum: PAYMENT_METHOD_VALUES,
    default: 'CARD'
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient queries
remittanceOrderSchema.index({ userId: 1, status: 1 });
remittanceOrderSchema.index({ userId: 1, actual_status: 1 });
remittanceOrderSchema.index({ userId: 1, date: -1 });
remittanceOrderSchema.index({ userId: 1, transferMode: 1 });
remittanceOrderSchema.index({ userId: 1, country: 1 });
remittanceOrderSchema.index({ userId: 1, currency: 1 });
remittanceOrderSchema.index({ userId: 1, dateDesc: 1 });

const RemittanceOrder = mongoose.model('RemittanceOrder', remittanceOrderSchema);

export default RemittanceOrder;
