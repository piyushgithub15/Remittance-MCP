import Joi from 'joi';

// Validation schema for remittanceOrderQuery parameters
const remittanceOrderQuerySchema = Joi.object({
  transferMode: Joi.string().valid('BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI').optional(),
  country: Joi.string().length(2).optional(),
  currency: Joi.string().length(3).optional(),
  orderDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'orderDate must be in YYYY-MM-DD format'
  }),
  orderCount: Joi.number().integer().min(1).max(50).default(10)
});

// Mock order data - in a real implementation, this would come from a database
const MOCK_ORDERS = [
  {
    orderNo: '1234567890',
    fromAmount: '1000.00',
    feeAmount: '10.00',
    totalPayAmount: '1010.00',
    status: 'SUCCESS',
    dateDesc: '2024-06-01',
    date: '2024-06-01T12:00:00Z',
    failReason: null,
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567890',
    transferMode: 'BANK_TRANSFER',
    country: 'CN',
    currency: 'CNY',
    beneficiaryName: '张三',
    description: 'Transfer to Bank of China'
  },
  {
    orderNo: '1234567891',
    fromAmount: '2000.00',
    feeAmount: '15.00',
    totalPayAmount: '2015.00',
    status: 'PENDING',
    dateDesc: '2024-06-02',
    date: '2024-06-02T14:30:00Z',
    failReason: null,
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567891',
    transferMode: 'BANK_TRANSFER',
    country: 'US',
    currency: 'USD',
    beneficiaryName: 'John Smith',
    description: 'Transfer to Wells Fargo'
  },
  {
    orderNo: '1234567892',
    fromAmount: '500.00',
    feeAmount: '8.00',
    totalPayAmount: '508.00',
    status: 'FAILED',
    dateDesc: '2024-06-03',
    date: '2024-06-03T09:15:00Z',
    failReason: 'Insufficient funds',
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567892',
    transferMode: 'CASH_PICK_UP',
    country: 'IN',
    currency: 'INR',
    beneficiaryName: 'Raj Patel',
    description: 'Cash pickup at SBI branch'
  },
  {
    orderNo: '1234567893',
    fromAmount: '5000.00',
    feeAmount: '25.00',
    totalPayAmount: '5025.00',
    status: 'AML_HOLD',
    dateDesc: '2024-06-04',
    date: '2024-06-04T16:45:00Z',
    failReason: null,
    amlHoldUrl: 'https://aml-review.example.com/1234567893',
    orderDetailUrl: 'https://order-detail.example.com/1234567893',
    transferMode: 'BANK_TRANSFER',
    country: 'GB',
    currency: 'GBP',
    beneficiaryName: 'Mary Johnson',
    description: 'Transfer to HSBC UK'
  },
  {
    orderNo: '1234567894',
    fromAmount: '1500.00',
    feeAmount: '12.00',
    totalPayAmount: '1512.00',
    status: 'CANCELLED',
    dateDesc: '2024-06-05',
    date: '2024-06-05T11:20:00Z',
    failReason: 'User cancelled',
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567894',
    transferMode: 'MOBILE_WALLET',
    country: 'PH',
    currency: 'PHP',
    beneficiaryName: 'Maria Santos',
    description: 'Mobile wallet transfer'
  },
  {
    orderNo: '1234567895',
    fromAmount: '3000.00',
    feeAmount: '20.00',
    totalPayAmount: '3020.00',
    status: 'SUCCESS',
    dateDesc: '2024-06-06',
    date: '2024-06-06T13:10:00Z',
    failReason: null,
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567895',
    transferMode: 'UPI',
    country: 'IN',
    currency: 'INR',
    beneficiaryName: 'Priya Sharma',
    description: 'UPI transfer to HDFC Bank'
  },
  {
    orderNo: '1234567896',
    fromAmount: '800.00',
    feeAmount: '9.00',
    totalPayAmount: '809.00',
    status: 'SUCCESS',
    dateDesc: '2024-06-07',
    date: '2024-06-07T10:30:00Z',
    failReason: null,
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567896',
    transferMode: 'BANK_TRANSFER',
    country: 'SG',
    currency: 'SGD',
    beneficiaryName: 'David Lee',
    description: 'Transfer to DBS Singapore'
  },
  {
    orderNo: '1234567897',
    fromAmount: '1200.00',
    feeAmount: '11.00',
    totalPayAmount: '1211.00',
    status: 'PENDING',
    dateDesc: '2024-06-08',
    date: '2024-06-08T15:45:00Z',
    failReason: null,
    amlHoldUrl: null,
    orderDetailUrl: 'https://order-detail.example.com/1234567897',
    transferMode: 'BANK_TRANSFER',
    country: 'AU',
    currency: 'AUD',
    beneficiaryName: 'Sarah Wilson',
    description: 'Transfer to Commonwealth Bank'
  }
];

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
    const { error, value } = remittanceOrderQuerySchema.validate(params);
    if (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Missing required parameter: ${error.details[0].message}`
          }
        ],
        isError: true
      };
    }

    const { transferMode, country, currency, orderDate, orderCount } = value;

    // Filter orders based on criteria
    let filteredOrders = [...MOCK_ORDERS];

    // Apply filters
    if (transferMode) {
      filteredOrders = filteredOrders.filter(order => order.transferMode === transferMode);
    }

    if (country) {
      filteredOrders = filteredOrders.filter(order => order.country === country);
    }

    if (currency) {
      filteredOrders = filteredOrders.filter(order => order.currency === currency);
    }

    if (orderDate) {
      filteredOrders = filteredOrders.filter(order => order.dateDesc === orderDate);
    }

    // Sort by date (newest first)
    filteredOrders.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Limit results
    const limitedOrders = filteredOrders.slice(0, orderCount);

    // Check if no orders found
    if (limitedOrders.length === 0) {
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
      data: limitedOrders.map(order => ({
        orderNo: order.orderNo,
        fromAmount: order.fromAmount,
        feeAmount: order.feeAmount,
        totalPayAmount: order.totalPayAmount,
        status: order.status,
        dateDesc: order.dateDesc,
        date: order.date,
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
export function getOrderStatistics(userId) {
  const userOrders = MOCK_ORDERS; // In real implementation, filter by userId
  
  const stats = {
    totalOrders: userOrders.length,
    successfulOrders: userOrders.filter(order => order.status === 'SUCCESS').length,
    pendingOrders: userOrders.filter(order => order.status === 'PENDING').length,
    failedOrders: userOrders.filter(order => order.status === 'FAILED').length,
    cancelledOrders: userOrders.filter(order => order.status === 'CANCELLED').length,
    amlHoldOrders: userOrders.filter(order => order.status === 'AML_HOLD').length,
    totalAmount: userOrders
      .filter(order => order.status === 'SUCCESS')
      .reduce((sum, order) => sum + parseFloat(order.fromAmount), 0),
    totalFees: userOrders
      .filter(order => order.status === 'SUCCESS')
      .reduce((sum, order) => sum + parseFloat(order.feeAmount), 0)
  };

  return stats;
}

/**
 * Get order by order number
 * @param {string} orderNo - Order number
 * @returns {Object|null} Order details or null if not found
 */
export function getOrderByNumber(orderNo) {
  return MOCK_ORDERS.find(order => order.orderNo === orderNo) || null;
}

/**
 * Get orders by status
 * @param {string} status - Order status
 * @returns {Array} Orders with specified status
 */
export function getOrdersByStatus(status) {
  return MOCK_ORDERS.filter(order => order.status === status);
}

/**
 * Get orders by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Orders within date range
 */
export function getOrdersByDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return MOCK_ORDERS.filter(order => {
    const orderDate = new Date(order.date);
    return orderDate >= start && orderDate <= end;
  });
}

/**
 * Generate trace code for request tracking
 * @returns {string} Trace code
 */
function generateTraceCode() {
  return `TRC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
