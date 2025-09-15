import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

// Validation schema for transferMoney parameters
const transferMoneySchema = Joi.object({
  beneficiaryId: Joi.string().optional().allow(null, ''),
  beneficiaryName: Joi.string().optional().allow(null, ''),
  sendAmount: Joi.number().positive().optional().allow(null),
  callBackProvider: Joi.string().valid('voice', 'text').default('voice')
});

// Mock beneficiary data - in a real implementation, this would come from a database
const MOCK_BENEFICIARIES = [
  {
    id: 123,
    title: 'Bank of China 1234567890',
    name: '张三',
    currency: 'CNY',
    icon: 'https://icon.bank.png',
    country: 'CN',
    transferModes: ['BANK_TRANSFER'],
    accountNumber: '1234567890',
    bankName: 'Bank of China'
  },
  {
    id: 124,
    title: 'ICBC - 6543210987',
    name: '李四',
    currency: 'CNY',
    icon: 'https://icon.icbc.png',
    country: 'CN',
    transferModes: ['BANK_TRANSFER'],
    accountNumber: '6543210987',
    bankName: 'ICBC'
  },
  {
    id: 125,
    title: 'John Smith - Wells Fargo',
    name: 'John Smith',
    currency: 'USD',
    icon: 'https://icon.wellsfargo.png',
    country: 'US',
    transferModes: ['BANK_TRANSFER'],
    accountNumber: '9876543210',
    bankName: 'Wells Fargo'
  },
  {
    id: 126,
    title: 'Mary Johnson - Chase',
    name: 'Mary Johnson',
    currency: 'USD',
    icon: 'https://icon.chase.png',
    country: 'US',
    transferModes: ['BANK_TRANSFER', 'CASH_PICK_UP'],
    accountNumber: '1234567890',
    bankName: 'Chase Bank'
  },
  {
    id: 127,
    title: 'Raj Patel - SBI',
    name: 'Raj Patel',
    currency: 'INR',
    icon: 'https://icon.sbi.png',
    country: 'IN',
    transferModes: ['BANK_TRANSFER', 'UPI'],
    accountNumber: '1122334455',
    bankName: 'State Bank of India'
  }
];

// Mock suggested amounts
const SUGGESTED_AMOUNTS = [
  { id: 1, amount: 1000.00 },
  { id: 2, amount: 2000.00 },
  { id: 3, amount: 5000.00 },
  { id: 4, amount: 10000.00 }
];

// Exchange rate data (simplified)
const EXCHANGE_RATES = {
  'CNY': 1.89,
  'USD': 0.27,
  'INR': 22.50,
  'GBP': 0.21,
  'EUR': 0.25
};

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
  const response = {
    code: 200,
    message: 'Success',
    beneficiaries: MOCK_BENEFICIARIES.map(b => ({
      id: b.id,
      title: b.title,
      name: b.name,
      currency: b.currency,
      icon: b.icon
    })),
    sendAmounts: SUGGESTED_AMOUNTS,
    remToken: null,
    exchangeRate: {
      fromAmount: {
        currency: 'AED',
        amount: 1000.00
      },
      fromIconUrl: 'https://icon.ae.png',
      fromCountryName: 'UAE',
      rate: '1.89',
      toAmount: {
        currency: 'CNY',
        amount: 1890.00
      },
      toIconUrl: 'https://icon.cn.png',
      toCountryName: 'China',
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
    },
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
  // Find beneficiary
  const beneficiary = MOCK_BENEFICIARIES.find(b => 
    b.id.toString() === beneficiaryId || 
    b.name.toLowerCase().includes(beneficiaryName.toLowerCase())
  );

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

  // Calculate fees and exchange rate
  const exchangeRate = EXCHANGE_RATES[beneficiary.currency] || 1.0;
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
      beneficiary: beneficiary,
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
