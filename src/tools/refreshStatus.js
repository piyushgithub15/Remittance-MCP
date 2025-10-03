import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import { checkVerificationRequired } from '../utils/verificationStore.js';

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
  orderNo: z.string().min(1, 'orderNo must be provided')
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

    const { orderNo } = validation.data;


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

    // Check verification status for delayed transactions
    if (isDelayed && order.status?.toUpperCase() === 'PENDING') {
      const verificationCheck = await checkVerificationRequired(DEFAULT_USER_ID, 'delayed_transaction');
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

    // Check verification status for completed transactions as well
    if (order.status?.toUpperCase() === 'COMPLETED') {
      const verificationCheck = await checkVerificationRequired(DEFAULT_USER_ID, 'completed_transaction');
      if (verificationCheck.requiresVerification) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: 401,
                message: 'Identity verification required for completed transactions',
                data: {
                  orderNo: order.orderNo,
                  status: order.status,
                  actualStatus: order.actual_status,
                  requiresVerification: true,
                  reason: verificationCheck.status.reason,
                  message: 'For security reasons, I need to verify your identity before providing detailed information about this completed transaction. Please provide the last 4 digits of your Emirates ID and expiry date.',
                  verificationPrompt: verificationCheck.verificationPrompt
                }
              })
            }
          ],
          isError: true
        };
      }
    }

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
                message: 'Order is pending - minimal details only',
                data: {
                  orderNo: order.orderNo,
                  status: order.status,
                  actualStatus: order.actual_status,
                  transferMode: order.transferMode,
                  country: order.country,
                  currency: order.currency,
                  fromAmount: order.fromAmount?.toString(),
                  expectedDeliveryDate: expectedDeliveryDate,
                  message: 'Order is still processing. Full details available after completion.'
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
                currentStatus: order.status,
                actualStatus: order.actual_status,
                message: 'This order is not yet completed, so no refresh is needed.'
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
      message: 'Status refreshed successfully',
      data: {
        orderNo: updatedOrder.orderNo,
        previousStatus: 'COMPLETED',
        newStatus: updatedOrder.status,
        actualStatus: updatedOrder.actual_status,
        statusMessage: statusMessage,
        failReason: updatedOrder.failReason,
        refreshedAt: new Date().toISOString(),
        message: 'The transaction status has been updated to reflect the actual status.'
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
export async function checkRefreshNeeded(orderNo) {
  try {
    // Check verification status for refresh operations
    const verificationCheck = await checkVerificationRequired(DEFAULT_USER_ID, 'check_refresh');
    if (verificationCheck.requiresVerification) {
      return {
        needsRefresh: false,
        message: 'Verification required',
        requiresVerification: true,
        verificationPrompt: verificationCheck.verificationPrompt
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
      currentStatus: order.status,
      actualStatus: order.actual_status,
      message: needsRefresh ? 
        'Order is completed but status needs refresh to show actual result' :
        'Order does not need status refresh'
    };

  } catch (error) {
    console.error('Check refresh failed');
    return {
      needsRefresh: false,
      message: 'Check failed'
    };
  }
}
