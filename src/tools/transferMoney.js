import { v4 as uuidv4 } from 'uuid';
import Beneficiary from '../models/Beneficiary.js';
import SuggestedAmount from '../models/SuggestedAmount.js';
import ExchangeRate from '../models/ExchangeRate.js';
import RemittanceOrder from '../models/RemittanceOrder.js';

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
    const { beneficiaryId, beneficiaryName, sendAmount, callBackProvider } = params;

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
    // Convert beneficiaryId to number (already validated by Zod)
    const beneficiaryIdNum = parseInt(beneficiaryId);

    // Find beneficiary in database
    const beneficiary = await Beneficiary.findOne({
      $or: [
        { id: beneficiaryIdNum },
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

    // Generate order number
    const orderNo = generateOrderNumber();
    
    // Create remittance order in database
    const remittanceOrder = new RemittanceOrder({
      orderNo: orderNo,
      userId: DEFAULT_USER_ID,
      beneficiaryId: beneficiary._id,
      fromAmount: sendAmount,
      feeAmount: fee,
      totalPayAmount: totalAmount,
      status: 'PENDING', // Initial status
      dateDesc: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      date: new Date(),
      failReason: null,
      amlHoldUrl: null,
      orderDetailUrl: `https://order-detail.example.com/${orderNo}`,
      transferMode: beneficiary.transferModes[0], // Use first available transfer mode
      country: beneficiary.country,
      currency: beneficiary.currency,
      beneficiaryName: beneficiary.name,
      description: `Transfer to ${beneficiary.bankName}`,
      exchangeRate: exchangeRate,
      receivedAmount: receivedAmount,
      paymentToken: paymentToken,
      paymentLink: paymentLink,
      callbackProvider: callBackProvider,
      callbackUrl: callbackConfig.url,
      callbackToken: callbackConfig.token,
      traceCode: generateTraceCode()
    });

    // Save the order to database
    await remittanceOrder.save();

    const response = {
      code: 200,
      message: 'Transfer initiated successfully',
      orderNo: orderNo,
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
 * Generate order number
 * @returns {string} Order number
 */
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${timestamp}${random}`;
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

/**
 * Update remittance order status
 * @param {string} orderNo - Order number
 * @param {string} status - New status
 * @param {string} [failReason] - Failure reason if status is FAILED
 * @returns {Object|null} Updated order or null if not found
 */
export async function updateOrderStatus(orderNo, status, failReason = null) {
  try {
    const updateData = { status };
    if (failReason) {
      updateData.failReason = failReason;
    }
    
    const updatedOrder = await RemittanceOrder.findOneAndUpdate(
      { orderNo },
      updateData,
      { new: true }
    );
    
    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status:', error);
    return null;
  }
}

/**
 * Get order by order number
 * @param {string} orderNo - Order number
 * @returns {Object|null} Order details or null if not found
 */
export async function getOrderByNumber(orderNo) {
  try {
    return await RemittanceOrder.findOne({ orderNo }).populate('beneficiaryId');
  } catch (error) {
    console.error('Error getting order by number:', error);
    return null;
  }
}
