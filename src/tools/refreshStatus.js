import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

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

    // Check if the order is in completed status
    if (order.status !== 'COMPLETED') {
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
    if (order.actual_status === 'SUCCESS') {
      statusMessage = 'Your transaction has been successfully completed. The funds have been transferred to the beneficiary.';
    } else if (order.actual_status === 'FAILED') {
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
    console.error('Error in refreshStatus:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Status refresh failed: ${error.message}`
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

    const needsRefresh = order.status === 'COMPLETED' && 
                        (order.actual_status === 'SUCCESS' || order.actual_status === 'FAILED');

    return {
      needsRefresh,
      currentStatus: order.status,
      actualStatus: order.actual_status,
      message: needsRefresh ? 
        'Order is completed but status needs refresh to show actual result' :
        'Order does not need status refresh'
    };

  } catch (error) {
    console.error('Error checking refresh needed:', error);
    return {
      needsRefresh: false,
      message: `Error: ${error.message}`
    };
  }
}
