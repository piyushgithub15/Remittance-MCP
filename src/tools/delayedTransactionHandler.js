import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import { CUSTOMER_SATISFACTION_VALUES } from '../constants/enums.js';

// Validation schema for delayed transaction handling parameters
export const delayedTransactionHandlerSchema = z.object({
  orderNo: z.string().min(1, 'orderNo is required'),
  customerSatisfaction: z.enum(CUSTOMER_SATISFACTION_VALUES).optional()
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

// Pre-generated empathetic delay messages
const DELAY_MESSAGES = [
  "I completely understand your concern about the delay. Your transaction has already been processed successfully on our side. The updated delivery timeframe is shown in your app, and the delay is due to the beneficiary bank's processing schedule. Weekends and public holidays can cause additional delays, as many banks only process on working days. In most cases, the transfer completes earlier than shown — what you see is the maximum expected time.",
  
  "I sincerely apologize for any inconvenience this delay may have caused. Your money transfer has been successfully processed from our end and is now with the receiving bank. The extended timeframe you see reflects the beneficiary bank's processing schedule, which can be affected by weekends, holidays, and their internal processing times. Rest assured, most transfers arrive sooner than the maximum time indicated.",
  
  "Thank you for your patience. I understand how important this transfer is to you. The good news is that your transaction has been completed successfully on our platform. The delay you're experiencing is due to the receiving bank's processing timeline, which unfortunately is outside our control. The timeframe shown in your app is the maximum expected time, but transfers often arrive much sooner."
];

// Thank you and apology messages
const THANK_YOU_MESSAGES = [
  "Thank you for your understanding and patience. We truly appreciate your trust in our service. If you have any other questions or need assistance with future transfers, please don't hesitate to reach out to us.",
  
  "We're grateful for your patience during this time. Your understanding means a lot to us, and we're committed to providing you with the best possible service. Please feel free to contact us anytime if you need further assistance.",
  
  "Thank you for being so understanding. We know delays can be frustrating, and we really appreciate your patience. We're here to help with any future transfers or questions you might have."
];

// Escalation messages
const ESCALATION_MESSAGES = [
  "I understand your frustration, and I want to make sure you receive the best possible assistance. Let me connect you with one of our senior agents who can provide more detailed information about your specific transaction and explore additional options.",
  
  "I can see that this situation requires immediate attention. I'm escalating your case to our specialized team who has access to additional resources and can provide more comprehensive support for your delayed transaction.",
  
  "Your concern is completely valid, and I want to ensure you get the resolution you deserve. I'm transferring you to our escalation team who can provide more detailed assistance and potentially expedite the resolution process."
];

/**
 * Handle delayed transaction scenarios with empathetic responses
 * @param {Object} params - Parameters object
 * @param {string} params.orderNo - Order number to check
 * @param {string} [params.customerSatisfaction] - Customer satisfaction level
 * @returns {Object} ToolResult with appropriate response
 */
export async function handleDelayedTransaction(params) {
  try {
    // Validate input parameters
    const validation = delayedTransactionHandlerSchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${validation.error.errors[0].message}`
          }
        ],
        isError: true
      };
    }

    const { orderNo, customerSatisfaction } = validation.data;

    // Find the order
    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 404,
              message: 'Order not found',
              data: null
            })
          }
        ],
        isError: false
      };
    }

    // Calculate delay information
    const transactionTime = new Date(order.date);
    const currentTime = new Date();
    const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));
    const isDelayed = timeElapsedMinutes > 10; // 10 minutes threshold

    if (!isDelayed) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 200,
              message: 'Transaction is not delayed',
              data: {
                orderNo: order.orderNo,
                timeElapsedMinutes: timeElapsedMinutes,
                isDelayed: false,
                message: 'Your transaction is within the expected timeframe.'
              }
            })
          }
        ],
        isError: false
      };
    }

    // Handle different customer satisfaction scenarios
    let response;
    
    switch (customerSatisfaction) {
      case 'satisfied':
        response = handleSatisfiedCustomer(order, timeElapsedMinutes);
        break;
      case 'unsatisfied':
        response = handleUnsatisfiedCustomer(order, timeElapsedMinutes);
        break;
      case 'escalate':
        response = handleEscalation(order, timeElapsedMinutes);
        break;
      default:
        response = handleInitialDelayInquiry(order, timeElapsedMinutes);
    }

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
    console.error('Error in handleDelayedTransaction:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Delayed transaction handling failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle initial delay inquiry
 * @param {Object} order - Remittance order object
 * @param {number} timeElapsedMinutes - Minutes elapsed since transaction
 * @returns {Object} Response object
 */
function handleInitialDelayInquiry(order, timeElapsedMinutes) {
  const randomMessage = DELAY_MESSAGES[Math.floor(Math.random() * DELAY_MESSAGES.length)];
  
  return {
    code: 200,
    message: 'Delay inquiry handled',
    data: {
      orderNo: order.orderNo,
      timeElapsedMinutes: timeElapsedMinutes,
      isDelayed: true,
      response: randomMessage,
      nextSteps: [
        'Verify your identity if needed',
        'Check updated timeframe in the app',
        'Contact us if you need further assistance'
      ],
      escalationAvailable: true
    }
  };
}

/**
 * Handle satisfied customer
 * @param {Object} order - Remittance order object
 * @param {number} timeElapsedMinutes - Minutes elapsed since transaction
 * @returns {Object} Response object
 */
function handleSatisfiedCustomer(order, timeElapsedMinutes) {
  const randomMessage = THANK_YOU_MESSAGES[Math.floor(Math.random() * THANK_YOU_MESSAGES.length)];
  
  return {
    code: 200,
    message: 'Customer satisfied',
    data: {
      orderNo: order.orderNo,
      timeElapsedMinutes: timeElapsedMinutes,
      isDelayed: true,
      response: randomMessage,
      customerSatisfied: true,
      caseClosed: true
    }
  };
}

/**
 * Handle unsatisfied customer
 * @param {Object} order - Remittance order object
 * @param {number} timeElapsedMinutes - Minutes elapsed since transaction
 * @returns {Object} Response object
 */
function handleUnsatisfiedCustomer(order, timeElapsedMinutes) {
  // Provide additional reassurance and options
  const additionalReassurance = "I understand your frustration completely. Let me provide you with some additional information: Your transaction is confirmed as processed on our end, and we're monitoring it closely. While we cannot control the receiving bank's processing time, we can offer you a few options to help resolve this situation.";

  return {
    code: 200,
    message: 'Customer unsatisfied - providing options',
    data: {
      orderNo: order.orderNo,
      timeElapsedMinutes: timeElapsedMinutes,
      isDelayed: true,
      response: additionalReassurance,
      options: [
        'Escalate to senior agent for detailed investigation',
        'Request expedited processing (if available)',
        'Set up monitoring alerts for status updates',
        'Provide alternative contact methods for updates'
      ],
      escalationRecommended: true
    }
  };
}

/**
 * Handle escalation request
 * @param {Object} order - Remittance order object
 * @param {number} timeElapsedMinutes - Minutes elapsed since transaction
 * @returns {Object} Response object
 */
function handleEscalation(order, timeElapsedMinutes) {
  const randomMessage = ESCALATION_MESSAGES[Math.floor(Math.random() * ESCALATION_MESSAGES.length)];
  
  // Generate escalation summary
  const escalationSummary = generateEscalationSummary(order, timeElapsedMinutes);
  
  return {
    code: 200,
    message: 'Escalation initiated',
    data: {
      orderNo: order.orderNo,
      timeElapsedMinutes: timeElapsedMinutes,
      isDelayed: true,
      response: randomMessage,
      escalationSummary: escalationSummary,
      escalationId: generateEscalationId(),
      estimatedResponseTime: 'Within 2 hours',
      escalationInitiated: true
    }
  };
}


/**
 * Generate escalation summary
 * @param {Object} order - Remittance order object
 * @param {number} timeElapsedMinutes - Minutes elapsed since transaction
 * @returns {Object} Escalation summary
 */
function generateEscalationSummary(order, timeElapsedMinutes) {
  return {
    orderNo: order.orderNo,
    transferMode: order.transferMode,
    country: order.country,
    currency: order.currency,
    amount: order.fromAmount.toString(),
    transactionTime: order.date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
    delayMinutes: timeElapsedMinutes - 10,
    status: order.status,
    customerConcerns: [
      'Transaction delay beyond expected timeframe',
      'Request for faster delivery',
      'Need for detailed status update'
    ],
    previousActions: [
      'Identity verification completed',
      'Timeframe explanation provided',
      'Empathetic response delivered'
    ]
  };
}

/**
 * Generate escalation ID
 * @returns {string} Escalation ID
 */
function generateEscalationId() {
  return `ESC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

/**
 * Get all delayed transactions for a user
 * @param {string} userId - User ID
 * @returns {Array} List of delayed transactions
 */
export async function getDelayedTransactions(userId = DEFAULT_USER_ID) {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const delayedOrders = await RemittanceOrder.find({
      userId,
      date: { $lt: tenMinutesAgo },
      status: { $in: ['PENDING', 'PROCESSING'] }
    }).sort({ date: -1 });

    return delayedOrders.map(order => ({
      orderNo: order.orderNo,
      delayMinutes: Math.floor((new Date() - order.date) / (1000 * 60)) - 10,
      transferMode: order.transferMode,
      country: order.country,
      amount: order.fromAmount.toString(),
      transactionTime: order.date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' })
    }));

  } catch (error) {
    console.error('Error getting delayed transactions:', error);
    return [];
  }
}
