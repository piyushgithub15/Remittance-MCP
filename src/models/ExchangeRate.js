import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  fromCountry: {
    type: String,
    required: true,
    length: 2,
    uppercase: true
  },
  fromCurrency: {
    type: String,
    required: true,
    length: 3,
    uppercase: true
  },
  toCountry: {
    type: String,
    required: true,
    length: 2,
    uppercase: true
  },
  toCurrency: {
    type: String,
    required: true,
    length: 3,
    uppercase: true
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  fromCountryName: {
    type: String,
    required: true
  },
  toCountryName: {
    type: String,
    required: true
  },
  fromCurrencyIcon: {
    type: String,
    default: ''
  },
  toCurrencyIcon: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
exchangeRateSchema.index({ fromCountry: 1, fromCurrency: 1, toCountry: 1, toCurrency: 1 }, { unique: true });
exchangeRateSchema.index({ isActive: 1 });

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);

export default ExchangeRate;
