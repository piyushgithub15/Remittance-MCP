import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';

// Validation schema for transaction timeframe parameters
export const transactionTimeframeSchema = z.object({
  orderNo: z.string().min(1, 'orderNo is required'),
  includeDelayInfo: z.boolean().optional().default(false)
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

// Transaction delay threshold in minutes
const DELAY_THRESHOLD_MINUTES = 10;

/**
 * Get transaction timeframe and expected arrival time
 * @param {Object} params - Parameters object
 * @param {string} params.orderNo - Order number to check
 * @param {boolean} [params.includeDelayInfo] - Whether to include delay information
 * @returns {Object} ToolResult with timeframe information
 */
export async function getTransactionTimeframe(params) {
  try {
    // Validate input parameters
    const validation = transactionTimeframeSchema.safeParse(params);
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

    const { orderNo, includeDelayInfo } = validation.data;

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

    // Calculate time elapsed since transaction
    const transactionTime = new Date(order.date);
    const currentTime = new Date();
    const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));

    // Check if transaction is delayed
    const isDelayed = timeElapsedMinutes > DELAY_THRESHOLD_MINUTES;

    // If transaction is delayed, request verification first
    if (isDelayed && order.status ==='PENDING') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 401,
              message: 'Identity verification required for delayed transactions',
              data: {
                orderNo: order.orderNo,
                isDelayed: true,
                requiresVerification: true,
                message: 'Your transaction appears to be delayed. For security reasons, I need to verify your identity before providing detailed information. Please provide the last 4 digits of your Emirates ID.'
              }
            })
          }
        ],
        isError: false
      };
    }

    // Calculate expected arrival time based on transfer mode and country
    const expectedArrivalTime = calculateExpectedArrivalTime(order, transactionTime);

    // Generate timeframe message
    const timeframeMessage = generateTimeframeMessage(order, timeElapsedMinutes, expectedArrivalTime, isDelayed);

    const response = {
      code: 200,
      message: 'Success',
      data: {
        orderNo: order.orderNo,
        status: order.status,
        transactionTime: transactionTime.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
        timeElapsedMinutes: timeElapsedMinutes,
        isDelayed: isDelayed,
        expectedArrivalTime: expectedArrivalTime,
        timeframeMessage: timeframeMessage,
        transferMode: order.transferMode,
        country: order.country,
        currency: order.currency,
        fromAmount: order.fromAmount.toString(),
        toAmount: order.toAmount ? order.toAmount.toString() : null
      }
    };

    // Add delay information if requested
    if (includeDelayInfo && isDelayed) {
      response.data.delayInfo = {
        delayMinutes: timeElapsedMinutes - DELAY_THRESHOLD_MINUTES,
        delayThreshold: DELAY_THRESHOLD_MINUTES,
        possibleReasons: getDelayReasons(order)
      };
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
    console.error('Error in getTransactionTimeframe:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Transaction timeframe query failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Calculate expected arrival time based on transfer mode and country
 * @param {Object} order - Remittance order object
 * @param {Date} transactionTime - When the transaction was made
 * @returns {Date} Expected arrival time
 */
function calculateExpectedArrivalTime(order, transactionTime) {
  const baseTime = new Date(transactionTime);
  
  // Different processing times based on transfer mode and country
  let processingHours = 2; // Default 2 hours
  
  switch (order.transferMode) {
    case 'BANK_TRANSFER':
      // Bank transfers typically take 1-4 hours for most countries
      if (['AE', 'SA', 'KW', 'QA', 'BH', 'OM'].includes(order.country)) {
        processingHours = 1; // GCC countries are faster
      } else if (['IN', 'PK', 'BD', 'LK'].includes(order.country)) {
        processingHours = 2; // South Asian countries
      } else if (['US', 'CA', 'GB', 'AU'].includes(order.country)) {
        processingHours = 4; // Western countries
      } else {
        processingHours = 6; // Other countries
      }
      break;
      
    case 'CASH_PICK_UP':
      processingHours = 0.5; // Cash pickups are usually instant to 30 minutes
      break;
      
    case 'MOBILE_WALLET':
      processingHours = 0.25; // Mobile wallets are usually instant to 15 minutes
      break;
      
    case 'UPI':
      processingHours = 0.1; // UPI is usually instant to 5 minutes
      break;
  }

  // Add processing time
  const expectedTime = new Date(baseTime.getTime() + (processingHours * 60 * 60 * 1000));
  
  // Adjust for weekends and holidays (simplified logic)
  const dayOfWeek = expectedTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
    // Add 1-2 days for weekend processing
    expectedTime.setDate(expectedTime.getDate() + (dayOfWeek === 0 ? 1 : 2));
  }
  
  return expectedTime;
}

/**
 * Generate appropriate timeframe message
 * @param {Object} order - Remittance order object
 * @param {number} timeElapsedMinutes - Minutes elapsed since transaction
 * @param {Date} expectedArrivalTime - Expected arrival time
 * @param {boolean} isDelayed - Whether transaction is delayed
 * @returns {string} Timeframe message
 */
function generateTimeframeMessage(order, timeElapsedMinutes, expectedArrivalTime, isDelayed) {
  const expectedTimeStr = expectedArrivalTime.toLocaleString('en-US', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isDelayed) {
    return `Your transaction was made ${timeElapsedMinutes} minutes ago. It is expected to arrive by ${expectedTimeStr}. The delay is due to the beneficiary bank's processing schedule.`;
  } else {
    return `Your transaction was made ${timeElapsedMinutes} minutes ago. It is expected to arrive by ${expectedTimeStr}.`;
  }
}

/**
 * Get possible reasons for delay
 * @param {Object} order - Remittance order object
 * @returns {Array} Array of possible delay reasons
 */
function getDelayReasons(order) {
  const reasons = [
    'Beneficiary bank processing delays',
    'Weekend or public holiday processing schedule',
    'International banking cut-off times',
    'Additional compliance checks'
  ];

  // Add specific reasons based on country
  if (['US', 'CA', 'GB', 'AU'].includes(order.country)) {
    reasons.push('Time zone differences affecting processing');
  }

  if (order.transferMode === 'BANK_TRANSFER') {
    reasons.push('SWIFT network processing time');
  }

  return reasons;
}

/**
 * Check if a transaction is delayed
 * @param {string} orderNo - Order number
 * @returns {Object} Delay status information
 */
export async function checkTransactionDelay(orderNo) {
  try {
    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return {
        isDelayed: false,
        delayMinutes: 0,
        message: 'Order not found'
      };
    }

    const transactionTime = new Date(order.date);
    const currentTime = new Date();
    const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));
    const isDelayed = timeElapsedMinutes > DELAY_THRESHOLD_MINUTES;

    return {
      isDelayed,
      delayMinutes: isDelayed ? timeElapsedMinutes - DELAY_THRESHOLD_MINUTES : 0,
      timeElapsedMinutes,
      threshold: DELAY_THRESHOLD_MINUTES,
      message: isDelayed ? 
        `Transaction is delayed by ${timeElapsedMinutes - DELAY_THRESHOLD_MINUTES} minutes` :
        'Transaction is within expected timeframe'
    };

  } catch (error) {
    console.error('Error checking transaction delay:', error);
    return {
      isDelayed: false,
      delayMinutes: 0,
      message: `Error: ${error.message}`
    };
  }
}
