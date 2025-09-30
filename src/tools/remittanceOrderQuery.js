import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import { TRANSFER_MODE_VALUES } from '../constants/enums.js';

// Validation schema for remittanceOrderQuery parameters
export const remittanceOrderQuerySchema = z.object({
  transferMode: z.enum(TRANSFER_MODE_VALUES).optional(),
  country: z.string().length(2, 'country must be a 2-character ISO 3166 country code').optional(),
  currency: z.string().length(3, 'currency must be a 3-character ISO 4217 currency code').optional(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'orderDate must be in YYYY-MM-DD format').optional(),
  orderCount: z.number().int().min(1).max(50).default(10)
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

/**
 * Query remittance transaction history and status
 * @param {Object} params - Parameters object
 * @param {string} [params.transferMode] - Filter by transfer mode
 * @param {string} [params.country] - Filter by destination country
 * @param {string} [params.currency] - Filter by destination currency
 * @param {string} [params.orderDate] - Filter by order creation date (YYYY-MM-DD)
 * @param {number} [params.orderCount] - Maximum number of orders to return (1-50, default: 10)
 * @returns {Object} ToolResult with order information
 */
export async function remittanceOrderQuery(params) {
  try {
    // Validate input parameters
    const validation = remittanceOrderQuerySchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Missing required parameter: ${validation.error.errors[0].message}`
          }
        ],
        isError: true
      };
    }

    const { transferMode, country, currency, orderDate, orderCount } = validation.data;

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
      query.dateDesc = orderDate;
    }

    // Query orders from database
    const orders = await RemittanceOrder.find(query)
      .sort({ date: -1 }) // Sort by date (newest first)
      .limit(orderCount)
      .select('orderNo fromAmount feeAmount totalPayAmount status dateDesc date failReason amlHoldUrl orderDetailUrl');

    // Check if no orders found
    if (orders.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 602,
              message: 'You have never send order successfully, please open international transfer mini app.',
              data: []
            })
          }
        ],
        isError: false
      };
    }

    // Format response
    const response = {
      code: 200,
      message: 'Success',
      data: orders.map(order => ({
        orderNo: order.orderNo,
        fromAmount: order.fromAmount.toString(),
        feeAmount: order.feeAmount.toString(),
        totalPayAmount: order.totalPayAmount.toString(),
        status: order.status,
        dateDesc: order.dateDesc,
        date: order.date.toLocaleString('en-US', { timeZone: 'Asia/Dubai' }),
        failReason: order.failReason,
        amlHoldUrl: order.amlHoldUrl,
        orderDetailUrl: order.orderDetailUrl
      }))
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
    console.error('Error in remittanceOrderQuery:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Remittance order query failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Get order statistics
 * @param {string} userId - User ID
 * @returns {Object} Order statistics
 */
export async function getOrderStatistics(userId = DEFAULT_USER_ID) {
  try {
    const userOrders = await RemittanceOrder.find({ userId });
    
    const stats = {
      totalOrders: userOrders.length,
      successfulOrders: userOrders.filter(order => order.status === 'SUCCESS').length,
      pendingOrders: userOrders.filter(order => order.status === 'PENDING').length,
      failedOrders: userOrders.filter(order => order.status === 'FAILED').length,
      cancelledOrders: userOrders.filter(order => order.status === 'CANCELLED').length,
      amlHoldOrders: userOrders.filter(order => order.status === 'AML_HOLD').length,
      totalAmount: userOrders
        .filter(order => order.status === 'SUCCESS')
        .reduce((sum, order) => sum + order.fromAmount, 0),
      totalFees: userOrders
        .filter(order => order.status === 'SUCCESS')
        .reduce((sum, order) => sum + order.feeAmount, 0)
    };

    return stats;
  } catch (error) {
    console.error('Error getting order statistics:', error);
    return {
      totalOrders: 0,
      successfulOrders: 0,
      pendingOrders: 0,
      failedOrders: 0,
      cancelledOrders: 0,
      amlHoldOrders: 0,
      totalAmount: 0,
      totalFees: 0
    };
  }
}

/**
 * Get order by order number
 * @param {string} orderNo - Order number
 * @returns {Object|null} Order details or null if not found
 */
export async function getOrderByNumber(orderNo) {
  try {
    return await RemittanceOrder.findOne({ orderNo });
  } catch (error) {
    console.error('Error getting order by number:', error);
    return null;
  }
}

/**
 * Get orders by status
 * @param {string} status - Order status
 * @param {string} userId - User ID
 * @returns {Array} Orders with specified status
 */
export async function getOrdersByStatus(status, userId = DEFAULT_USER_ID) {
  try {
    return await RemittanceOrder.find({ userId, status });
  } catch (error) {
    console.error('Error getting orders by status:', error);
    return [];
  }
}

/**
 * Get orders by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} userId - User ID
 * @returns {Array} Orders within date range
 */
export async function getOrdersByDateRange(startDate, endDate, userId = DEFAULT_USER_ID) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return await RemittanceOrder.find({
      userId,
      date: {
        $gte: start,
        $lte: end
      }
    });
  } catch (error) {
    console.error('Error getting orders by date range:', error);
    return [];
  }
}

/**
 * Generate trace code for request tracking
 * @returns {string} Trace code
 */
function generateTraceCode() {
  return `TRC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
