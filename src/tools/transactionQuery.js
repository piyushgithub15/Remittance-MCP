import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import { TRANSFER_MODE_VALUES } from '../constants/enums.js';
import { verifyUser } from '../utils/verificationStore.js';

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
  includeDelayInfo: z.boolean().optional().default(false),
  
  // Verification parameters
  lastFourDigits: z.string().length(4, 'Verification is required: lastFourDigits must be exactly 4 digits').regex(/^\d{4}$/, 'Verification is required: lastFourDigits must contain only digits'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Verification is required: expiryDate must be in DD/MM/YYYY format')
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

    const { orderNo, transferMode, country, currency, orderDate, orderCount, includeDelayInfo, lastFourDigits, expiryDate } = validation.data;

    // Verify user identity
    const verification = await verifyUser(DEFAULT_USER_ID, lastFourDigits, expiryDate);
    if (!verification.verified) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 401,
              message: 'Verification failed',
              data: {
                verified: false,
                message: verification.message
              }
            })
          }
        ],
        isError: true
      };
    }

    // If orderNo is provided, check specific order timeframe
    if (orderNo) {
      return await handleSpecificOrderQuery(orderNo, includeDelayInfo);
    } else {
      // Otherwise, return list of orders with timeframe info
      return await handleOrderListQuery(transferMode, country, currency, orderDate, orderCount);
    }

  } catch (error) {
    console.error('Query failed');
    return {
      content: [
        {
          type: 'text',
          text: 'Query failed'
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
            message: 'Not found',
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


  // Calculate expected arrival time based on transfer mode and country
  const expectedArrivalTime = calculateExpectedArrivalTime(order, transactionTime);

  // Generate timeframe message
  const timeframeMessage = generateTimeframeMessage(order, timeElapsedMinutes, expectedArrivalTime, isDelayed);

  // Format expected delivery date with hour and minute
  const expectedDeliveryDate = expectedArrivalTime.toLocaleString('en-US', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const response = {
    code: 200,
    message: 'OK',
    data: {
      orderNo: order.orderNo,
      status: order.status,
      amount: order.fromAmount,
      timeElapsedMinutes: timeElapsedMinutes,
      isDelayed: isDelayed,
      expectedDeliveryDate: expectedDeliveryDate
    }
  };

  // Add delay information if requested
  if (includeDelayInfo && isDelayed) {
    response.data.delayInfo = {
      delayMinutes: timeElapsedMinutes - DELAY_THRESHOLD_MINUTES,
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


  const orderList = orders.map(order => ({
    orderNo: order.orderNo,
    status: order.status,
    amount: order.fromAmount,
    date: order.dateDesc
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          code: 200,
          message: 'OK',
          data: {
            orders: orderList,
            total: orderList.length
          }
        })
      }
    ],
    isError: false
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
    minute: '2-digit',
    hour12: true
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
    console.error('Delay check failed');
    return {
      isDelayed: false,
      delayMinutes: 0,
      message: 'Failed'
    };
  }
}
