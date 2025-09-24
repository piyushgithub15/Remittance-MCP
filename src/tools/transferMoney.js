import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import Beneficiary from '../models/Beneficiary.js';
import SuggestedAmount from '../models/SuggestedAmount.js';
import ExchangeRate from '../models/ExchangeRate.js';

// Validation schema for transferMoney parameters
const transferMoneySchema = Joi.object({
  beneficiaryId: Joi.string().optional().allow(null, ''),
  beneficiaryName: Joi.string().optional().allow(null, ''),
  sendAmount: Joi.number().positive().optional().allow(null),
  callBackProvider: Joi.string().valid('voice', 'text').default('voice')
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

// Fee structure
const FEE_STRUCTURE = {
  baseFee: 10.00,
  percentageFee: 0.01, // 1%
  minFee: 5.00,
  maxFee: 50.00
};

/**
 * Transfer money with two-stage process
 * @param {Object} params - Parameters object
 * @param {string} [params.beneficiaryId] - Beneficiary ID from discovery call
 * @param {string} [params.beneficiaryName] - Beneficiary name for identification
 * @param {number} [params.sendAmount] - Amount to send in AED
 * @param {string} [params.callBackProvider] - Callback provider type ('voice' or 'text')
 * @returns {Object} ToolResult with transfer information
 */
export async function transferMoney(params) {
  try {
    // Validate input parameters
    const { error, value } = transferMoneySchema.validate(params);
    if (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Transfer money failed: ${error.details[0].message}`
          }
        ],
        isError: true
      };
    }

    const { beneficiaryId, beneficiaryName, sendAmount, callBackProvider } = value;

    // Stage 1: Discovery call (no beneficiaryId, beneficiaryName, or sendAmount)
    if (!beneficiaryId && !beneficiaryName && !sendAmount) {
      return await handleDiscoveryStage();
    }

    // Stage 2: Execution call (with selected parameters)
    if (!beneficiaryName || !sendAmount) {
      return {
        content: [
          {
            type: 'text',
            text: 'Transfer money failed: beneficiaryName and sendAmount are required.'
          }
        ],
        isError: true
      };
    }

    return await handleExecutionStage(beneficiaryId, beneficiaryName, sendAmount, callBackProvider);

  } catch (error) {
    console.error('Error in transferMoney:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Transfer money failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle discovery stage - return available beneficiaries and suggested amounts
 * @returns {Object} Discovery response
 */
async function handleDiscoveryStage() {
  try {
    // Get beneficiaries from database
    const beneficiaries = await Beneficiary.find({ 
      userId: DEFAULT_USER_ID, 
      isActive: true 
    }).select('id title name currency icon country transferModes');

    // Get suggested amounts from database
    const suggestedAmounts = await SuggestedAmount.find({ 
      isActive: true 
    }).sort({ sortOrder: 1 }).select('amount');

    // Get default exchange rate for display (CNY as example)
    const defaultExchangeRate = await ExchangeRate.findOne({
      fromCountry: 'AE',
      fromCurrency: 'AED',
      toCountry: 'CN',
      toCurrency: 'CNY',
      isActive: true
    });

    const response = {
      code: 200,
      message: 'Success',
      beneficiaries: beneficiaries.map(b => ({
        id: b.id,
        title: b.title,
        name: b.name,
        currency: b.currency,
        icon: b.icon
      })),
      sendAmounts: suggestedAmounts.map((sa, index) => ({
        id: index + 1,
        amount: sa.amount
      })),
      remToken: null,
      exchangeRate: defaultExchangeRate ? {
        fromAmount: {
          currency: defaultExchangeRate.fromCurrency,
          amount: 1000.00
        },
        fromIconUrl: defaultExchangeRate.fromCurrencyIcon,
        fromCountryName: defaultExchangeRate.fromCountryName,
        rate: defaultExchangeRate.rate.toString(),
        toAmount: {
          currency: defaultExchangeRate.toCurrency,
          amount: 1000.00 * defaultExchangeRate.rate
        },
        toIconUrl: defaultExchangeRate.toCurrencyIcon,
        toCountryName: defaultExchangeRate.toCountryName,
        fee: {
          currency: 'AED',
          amount: 10.00
        },
        feeItems: [
          {
            name: 'Service Fee',
            feeAmount: {
              currency: 'AED',
              amount: 10.00
            }
          }
        ],
        orderAmount: {
          currency: 'AED',
          amount: 1010.00
        },
        channelCode: 'BANK_TRANSFER',
        transactionMode: 'BANK_TRANSFER'
      } : null,
      description: 'Please select a beneficiary and amount to proceed with the transfer.',
      priceTitle: 'Transfer Details',
      callBackProviders: [
        {
          type: 'voice',
          url: getCallbackConfig('voice').url,
          token: getCallbackConfig('voice').token,
          description: 'Voice-based confirmation callbacks'
        },
        {
          type: 'text',
          url: getCallbackConfig('text').url,
          token: getCallbackConfig('text').token,
          description: 'Text-based confirmation callbacks'
        }
      ]
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ],
      isError: false
    };
  } catch (error) {
    console.error('Error in handleDiscoveryStage:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Discovery failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle execution stage - process the actual transfer
 * @param {string} beneficiaryId - Selected beneficiary ID
 * @param {string} beneficiaryName - Selected beneficiary name
 * @param {number} sendAmount - Amount to send
 * @param {string} callBackProvider - Callback provider type
 * @returns {Object} Execution response
 */
async function handleExecutionStage(beneficiaryId, beneficiaryName, sendAmount, callBackProvider) {
  try {
    // Find beneficiary in database
    const beneficiary = await Beneficiary.findOne({
      $or: [
        { id: parseInt(beneficiaryId) },
        { name: { $regex: beneficiaryName, $options: 'i' } }
      ],
      userId: DEFAULT_USER_ID,
      isActive: true
    });

    if (!beneficiary) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 608,
              message: 'Beneficiary not found, please change beneficiary name.',
              beneficiaries: [],
              sendAmounts: [],
              remToken: null,
              exchangeRate: null
            })
          }
        ],
        isError: false
      };
    }

    // Check amount limits
    if (sendAmount > 50000) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 607,
              message: 'Amount exceeded limit, please set a smaller amount.'
            })
          }
        ],
        isError: false
      };
    }

    // Check if KYC is required (mock condition)
    if (sendAmount > 10000) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 610,
              message: 'Please do KYC for member'
            })
          }
        ],
        isError: false
      };
    }

    // Get exchange rate from database
    const exchangeRateData = await ExchangeRate.findOne({
      fromCountry: 'AE',
      fromCurrency: 'AED',
      toCountry: beneficiary.country,
      toCurrency: beneficiary.currency,
      isActive: true
    });

    if (!exchangeRateData) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 400,
              message: 'Exchange rate not available for this currency pair.'
            })
          }
        ],
        isError: false
      };
    }

    // Calculate fees and exchange rate
    const exchangeRate = exchangeRateData.rate;
    const fee = calculateFee(sendAmount);
    const totalAmount = sendAmount + fee;
    const receivedAmount = sendAmount * exchangeRate;

    // Generate payment link
    const paymentToken = generatePaymentToken();
    const paymentLink = generatePaymentLink(paymentToken, totalAmount, beneficiaryName, callBackProvider);
    
    // Get callback configuration
    const callbackConfig = getCallbackConfig(callBackProvider);

    const response = {
      code: 200,
      message: 'Transfer initiated successfully',
      button: {
        title: 'Complete Payment',
        link: paymentLink
      },
      paymentLink: paymentLink,
      callBackProvider: callBackProvider,
      callBackUrl: callbackConfig.url,
      callBackToken: callbackConfig.token,
      transactionDetails: {
        beneficiary: {
          id: beneficiary.id,
          title: beneficiary.title,
          name: beneficiary.name,
          currency: beneficiary.currency,
          icon: beneficiary.icon,
          country: beneficiary.country,
          transferModes: beneficiary.transferModes,
          accountNumber: beneficiary.accountNumber,
          bankName: beneficiary.bankName
        },
        sendAmount: sendAmount,
        fee: fee,
        totalAmount: totalAmount,
        receivedAmount: receivedAmount,
        exchangeRate: exchangeRate,
        currency: beneficiary.currency
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ],
      isError: false
    };
  } catch (error) {
    console.error('Error in handleExecutionStage:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Transfer execution failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Calculate transfer fee
 * @param {number} amount - Transfer amount
 * @returns {number} Calculated fee
 */
function calculateFee(amount) {
  const percentageFee = amount * FEE_STRUCTURE.percentageFee;
  const fee = Math.max(percentageFee, FEE_STRUCTURE.minFee);
  return Math.min(fee, FEE_STRUCTURE.maxFee);
}

/**
 * Generate payment token
 * @returns {string} Payment token
 */
function generatePaymentToken() {
  return `pay_${uuidv4().replace(/-/g, '')}`;
}

/**
 * Generate payment link
 * @param {string} token - Payment token
 * @param {number} amount - Total amount
 * @param {string} beneficiaryName - Beneficiary name
 * @param {string} callBackProvider - Callback provider
 * @returns {string} Payment link
 */
function generatePaymentLink(token, amount, beneficiaryName, callBackProvider) {
  const baseUrl = 'botimapp://pay';
  const params = new URLSearchParams({
    token: token,
    amount: amount.toFixed(2),
    beneficiary: beneficiaryName,
    callback: callBackProvider
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Get callback configuration
 * @param {string} provider - Callback provider type
 * @returns {Object} Callback configuration
 */
export function getCallbackConfig(provider = 'voice') {
  const configs = {
    voice: {
      url: process.env.CALLBACK_VOICE_URL || 'http://localhost:8080/voice/',
      token: process.env.CALLBACK_VOICE_TOKEN || 'yourVoiceToken'
    },
    text: {
      url: process.env.CALLBACK_TEXT_URL || 'http://localhost:8080/text/',
      token: process.env.CALLBACK_TEXT_TOKEN || 'yourTextToken'
    }
  };
  
  return configs[provider] || configs.voice;
}

/**
 * Generate trace code for request tracking
 * @returns {string} Trace code
 */
function generateTraceCode() {
  return `TRC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
