import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import { verifyUser } from '../utils/verificationStore.js';

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

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

// Validation schema for refresh status parameters
export const refreshStatusSchema = z.object({
  orderNo: z.string().min(1, 'orderNo must be provided'),
  lastFourDigits: z.string().length(4, 'lastFourDigits must be exactly 4 digits').regex(/^\d{4}$/, 'lastFourDigits must contain only digits'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'expiryDate must be in DD/MM/YYYY format')
});

/**
 * Refresh transaction status by updating status with actual_status
 * This tool is used when a user complains about a completed transaction
 * to reveal the true status (SUCCESS or FAILED)
 * @param {Object} params - Parameters object
 * @param {string} params.orderNo - Order number to refresh
 * @returns {Object} ToolResult with refresh information
 */
export async function refreshStatus(params) {
  try {
    // Validate input parameters
    const validation = refreshStatusSchema.safeParse(params);
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

    const { orderNo, lastFourDigits, expiryDate } = validation.data;

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

    // Check verification status for all transactions (delayed or completed)
    const transactionTime = new Date(order.date);
    const currentTime = new Date();
    const timeElapsedMinutes = Math.floor((currentTime - transactionTime) / (1000 * 60));
    const DELAY_THRESHOLD_MINUTES = 10; // Same threshold as transaction query
    const isDelayed = timeElapsedMinutes > DELAY_THRESHOLD_MINUTES;



    // Check verification status for completed transactions as well

    // Check if the order is in completed status
    if (order.status?.toUpperCase() !== 'COMPLETED') {
      // For pending orders, return minimal details
      if (order.status?.toUpperCase() === 'PENDING') {
        // Calculate expected delivery date for pending orders
        const expectedArrivalTime = calculateExpectedArrivalTime(order, transactionTime);
        const expectedDeliveryDate = expectedArrivalTime.toLocaleString('en-US', {
          timeZone: 'Asia/Dubai',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: 200,
                message: 'OK',
                data: {
                  orderNo: order.orderNo,
                  status: order.status,
                  amount: order.fromAmount
                }
              })
            }
          ],
          isError: false
        };
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 400,
              message: 'Order is not in completed status',
              data: {
                orderNo: order.orderNo,
                status: order.status,
                message: 'Order not completed yet'
              }
            })
          }
        ],
        isError: true
      };
    }

    // Update status with actual_status
    const updatedOrder = await RemittanceOrder.findOneAndUpdate(
      { orderNo },
      { 
        status: order.actual_status,
        $push: {
          statusHistory: {
            status: order.actual_status,
            timestamp: new Date(),
            reason: 'Status refreshed from actual_status due to customer inquiry',
            updatedBy: 'system'
          }
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 500,
              message: 'Failed to update order status',
              data: null
            })
          }
        ],
        isError: true,
        code: -32603
      };
    }

    // Generate appropriate message based on actual status
    let statusMessage = '';
    if (order.actual_status?.toUpperCase() === 'SUCCESS') {
      statusMessage = 'Your transaction has been successfully completed. The funds have been transferred to the beneficiary.';
    } else if (order.actual_status?.toUpperCase() === 'FAILED') {
      statusMessage = `Your transaction has failed. Reason: ${order.failReason || 'Unknown error'}. Please contact customer support for assistance.`;
    }

    const response = {
      code: 200,
      message: 'OK',
      data: {
        orderNo: updatedOrder.orderNo,
        status: updatedOrder.status
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
    console.error('Refresh status failed');
    return {
      content: [
        {
          type: 'text',
          text: 'Refresh failed'
        }
      ],
      isError: true,
      code: -32603
    };
  }
}

/**
 * Check if an order needs status refresh
 * @param {string} orderNo - Order number
 * @returns {Object} Refresh status information
 */
export async function checkRefreshNeeded(orderNo, lastFourDigits, expiryDate) {
  try {
    // Verify user identity
    const verification = await verifyUser(DEFAULT_USER_ID, lastFourDigits, expiryDate);
    if (!verification.verified) {
      return {
        needsRefresh: false,
        message: 'Verification failed',
        requiresVerification: true
      };
    }

    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return {
        needsRefresh: false,
        message: 'Order not found'
      };
    }

    const needsRefresh = order.status?.toUpperCase() === 'COMPLETED' && 
                        (order.actual_status?.toUpperCase() === 'SUCCESS' || order.actual_status?.toUpperCase() === 'FAILED');

    return {
      needsRefresh,
      status: order.status,
      message: needsRefresh ? 
        'Order needs refresh' :
        'No refresh needed'
    };

  } catch (error) {
    console.error('Check refresh failed');
    return {
      needsRefresh: false,
      message: 'Check failed'
    };
  }
}
