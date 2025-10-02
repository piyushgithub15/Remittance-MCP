import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import { TRANSFER_MODE_VALUES } from '../constants/enums.js';
import { checkVerificationRequired } from '../utils/verificationStore.js';

// Validation schema for transaction query parameters
export const transactionQuerySchema = z.object({
  // For specific order timeframe check
  orderNo: z.string().min(1, 'orderNo must be provided for specific order check').optional(),
  
  // For list mode - filtering options
  transferMode: z.enum(TRANSFER_MODE_VALUES).optional(),
  country: z.string().length(2, 'country must be a 2-character ISO 3166 country code').optional(),
  currency: z.string().length(3, 'currency must be a 3-character ISO 4217 currency code').optional(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'orderDate must be in YYYY-MM-DD format').optional(),
  orderCount: z.number().int().min(1).max(50).default(10),
  
  // For delay information
  includeDelayInfo: z.boolean().optional().default(false)
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

// Transaction delay threshold in minutes
const DELAY_THRESHOLD_MINUTES = 10;

/**
 * Query transaction history or check specific transaction timeframe
 * @param {Object} params - Parameters object
 * @param {string} [params.orderNo] - Order number for specific order check
 * @param {string} [params.transferMode] - Filter by transfer mode
 * @param {string} [params.country] - Filter by destination country
 * @param {string} [params.currency] - Filter by destination currency
 * @param {string} [params.orderDate] - Filter by order creation date
 * @param {number} [params.orderCount] - Maximum number of orders to return
 * @param {boolean} [params.includeDelayInfo] - Whether to include delay information
 * @returns {Object} ToolResult with transaction information
 */
export async function transactionQuery(params) {
  try {
    // Validate input parameters
    const validation = transactionQuerySchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${validation.error.errors[0].message}`
          }
        ],
        isError: true,
        code: -32602
      };
    }

    const { orderNo, transferMode, country, currency, orderDate, orderCount, includeDelayInfo } = validation.data;

    // If orderNo is provided, check specific order timeframe
    if (orderNo) {
      return await handleSpecificOrderQuery(orderNo, includeDelayInfo);
    } else {
      // Otherwise, return list of orders with timeframe info
      return await handleOrderListQuery(transferMode, country, currency, orderDate, orderCount);
    }

  } catch (error) {
    console.error('Error in transactionQuery:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Transaction query failed: ${error.message}`
        }
      ],
      isError: true,
      code: -32603
    };
  }
}

/**
 * Handle specific order query with timeframe information
 * @param {string} orderNo - Order number to check
 * @param {boolean} includeDelayInfo - Whether to include delay information
 * @returns {Object} ToolResult with timeframe information
 */
async function handleSpecificOrderQuery(orderNo, includeDelayInfo) {
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
      isError: true
    };
  }

  // Calculate time elapsed since transaction
  const transactionTime = new Date(order.date);
  const currentTime = new Date();
  const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));

  // Check if transaction is delayed
  const isDelayed = timeElapsedMinutes > DELAY_THRESHOLD_MINUTES;

  // If transaction is delayed, check verification status
  if (isDelayed && order.status === 'PENDING') {
    const verificationCheck = checkVerificationRequired(DEFAULT_USER_ID, 'delayed_transaction');
    if (verificationCheck.requiresVerification) {
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
                reason: verificationCheck.status.reason,
                message: 'Your transaction appears to be delayed. For security reasons, I need to verify your identity before providing detailed information. Please provide the last 4 digits of your Emirates ID and expiry date.',
                verificationPrompt: verificationCheck.verificationPrompt
              }
            })
          }
        ],
        isError: true
      };
    }
  }

  // Calculate expected arrival time based on transfer mode and country
  const expectedArrivalTime = calculateExpectedArrivalTime(order, transactionTime);

  // Generate timeframe message
  const timeframeMessage = generateTimeframeMessage(order, timeElapsedMinutes, expectedArrivalTime, isDelayed);

  const response = {
    code: 200,
    message: 'Success',
    data: {
      orders: [{
        orderNo: order.orderNo,
        status: order.status,
        actual_status: order.actual_status,
        transactionTime: transactionTime.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
        timeElapsedMinutes: timeElapsedMinutes,
        isDelayed: isDelayed,
        expectedArrivalTime: expectedArrivalTime,
        timeframeMessage: timeframeMessage,
        transferMode: order.transferMode,
        country: order.country,
        currency: order.currency,
        fromAmount: order.fromAmount.toString(),
        toAmount: order.toAmount ? order.toAmount.toString() : null,
        dateDesc: order.dateDesc,
        failReason: order.failReason,
        amlHoldUrl: order.amlHoldUrl,
        orderDetailUrl: order.orderDetailUrl
      }],
      totalCount: 1,
      query: {
        mode: 'timeframe',
        orderNo: order.orderNo,
        includeDelayInfo: includeDelayInfo
      }
    }
  };

  // Add delay information if requested
  if (includeDelayInfo && isDelayed) {
    response.data.orders[0].delayInfo = {
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
    isError: true
  };
}

/**
 * Handle list query for order history
 * @param {string} transferMode - Filter by transfer mode
 * @param {string} country - Filter by destination country
 * @param {string} currency - Filter by destination currency
 * @param {string} orderDate - Filter by order creation date
 * @param {number} orderCount - Maximum number of orders to return
 * @returns {Object} ToolResult with order list
 */
async function handleOrderListQuery(transferMode, country, currency, orderDate, orderCount) {
  // Build query filters
  const query = { userId: DEFAULT_USER_ID };
  
  if (transferMode) {
    query.transferMode = transferMode;
  }
  
  if (country) {
    query.country = country.toUpperCase();
  }
  
  if (currency) {
    query.currency = currency.toUpperCase();
  }
  
  if (orderDate) {
    const startDate = new Date(orderDate);
    const endDate = new Date(orderDate);
    endDate.setDate(endDate.getDate() + 1);
    
    query.date = {
      $gte: startDate,
      $lt: endDate
    };
  }

  // Execute query
  const orders = await RemittanceOrder.find(query)
    .sort({ date: -1 })
    .limit(orderCount)
    .select('orderNo fromAmount toAmount status dateDesc date failReason amlHoldUrl orderDetailUrl transferMode country currency');

  // If orderCount is 1 and we have exactly one order, check if it's delayed
  if (orderCount === 1 && orders.length === 1) {
    const order = orders[0];
    const transactionTime = new Date(order.date);
    const currentTime = new Date();
    const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));
    const isDelayed = timeElapsedMinutes > DELAY_THRESHOLD_MINUTES;
    
    // If the single order is delayed and pending, check verification status
    if (isDelayed && order.status === 'PENDING') {
      const verificationCheck = checkVerificationRequired(DEFAULT_USER_ID, 'delayed_transaction');
      if (verificationCheck.requiresVerification) {
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
                  reason: verificationCheck.status.reason,
                  message: 'Your transaction appears to be delayed. For security reasons, I need to verify your identity before providing detailed information. Please provide the last 4 digits of your Emirates ID and expiry date.',
                  verificationPrompt: verificationCheck.verificationPrompt
                }
              })
            }
          ],
          isError: true
        };
      }
    }
  }

  const orderList = orders.map(order => {
    // Calculate time elapsed for each order
    const transactionTime = new Date(order.date);
    const currentTime = new Date();
    const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));
    const isDelayed = timeElapsedMinutes > DELAY_THRESHOLD_MINUTES;
    
    // Calculate expected arrival time
    const expectedArrivalTime = calculateExpectedArrivalTime(order, transactionTime);
    const timeframeMessage = generateTimeframeMessage(order, timeElapsedMinutes, expectedArrivalTime, isDelayed);
    
    return {
      orderNo: order.orderNo,
      status: order.status,
      actual_status: order.actual_status,
      transactionTime: order.date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
      timeElapsedMinutes: timeElapsedMinutes,
      isDelayed: isDelayed,
      expectedArrivalTime: expectedArrivalTime,
      timeframeMessage: timeframeMessage,
      transferMode: order.transferMode,
      country: order.country,
      currency: order.currency,
      fromAmount: order.fromAmount.toString(),
      toAmount: order.toAmount ? order.toAmount.toString() : null,
      dateDesc: order.dateDesc,
      failReason: order.failReason,
      amlHoldUrl: order.amlHoldUrl,
      orderDetailUrl: order.orderDetailUrl
    };
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          code: 200,
          message: 'Success',
          data: {
            orders: orderList,
            totalCount: orderList.length,
            query: {
              mode: 'list',
              transferMode: transferMode || null,
              country: country || null,
              currency: currency || null,
              orderDate: orderDate || null,
              orderCount: orderCount
            }
          }
        })
      }
    ],
    isError: true
  };
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
