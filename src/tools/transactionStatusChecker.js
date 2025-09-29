import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';

// Validation schema for transaction status checking
export const transactionStatusCheckerSchema = z.object({
  orderNo: z.string().min(1, 'orderNo is required'),
  updateStatus: z.boolean().optional().default(false),
  newStatus: z.enum(['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED', 'AML_HOLD']).optional(),
  failReason: z.string().optional()
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

/**
 * Check actual transaction status from backend/database
 * @param {Object} params - Parameters object
 * @param {string} params.orderNo - Order number to check
 * @param {boolean} [params.updateStatus] - Whether to update the status
 * @param {string} [params.newStatus] - New status to set if updating
 * @param {string} [params.failReason] - Failure reason if status is FAILED
 * @returns {Object} ToolResult with transaction status information
 */
export async function checkTransactionStatus(params) {
  try {
    // Validate input parameters
    const validation = transactionStatusCheckerSchema.safeParse(params);
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

    const { orderNo, updateStatus, newStatus, failReason } = validation.data;

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

    // Simulate backend status check (in real implementation, this would call external API)
    const backendStatus = await simulateBackendStatusCheck(orderNo);
    
    // Update status if requested
    if (updateStatus && newStatus) {
      order.status = newStatus;
      if (newStatus === 'FAILED' && failReason) {
        order.failReason = failReason;
      }
      order.updatedAt = new Date();
      await order.save();
    }

    // Determine if there's a discrepancy
    const hasDiscrepancy = order.status !== backendStatus.status;
    
    const response = {
      code: 200,
      message: 'Success',
      data: {
        orderNo: order.orderNo,
        appStatus: order.status,
        backendStatus: backendStatus.status,
        hasDiscrepancy: hasDiscrepancy,
        discrepancyDetails: hasDiscrepancy ? {
          appShows: order.status,
          backendShows: backendStatus.status,
          explanation: getDiscrepancyExplanation(order.status, backendStatus.status)
        } : null,
        transactionDetails: {
          fromAmount: order.fromAmount.toString(),
          toAmount: order.toAmount ? order.toAmount.toString() : null,
          transferMode: order.transferMode,
          country: order.country,
          currency: order.currency,
          transactionDate: order.date.toISOString(),
          beneficiaryName: order.beneficiaryName || 'N/A'
        },
        backendDetails: backendStatus.details,
        updated: updateStatus,
        newStatus: updateStatus ? newStatus : null
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
    console.error('Error in checkTransactionStatus:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Transaction status check failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Simulate backend status check (in real implementation, this would call external API)
 * @param {string} orderNo - Order number
 * @returns {Object} Backend status information
 */
async function simulateBackendStatusCheck(orderNo) {
  // Simulate different scenarios based on order number patterns
  const scenarios = [
    {
      status: 'SUCCESS',
      details: {
        actualStatus: 'COMPLETED',
        completionTime: new Date().toISOString(),
        referenceNumber: `REF-${orderNo}-${Date.now()}`,
        bankResponse: 'Transaction completed successfully',
        beneficiaryReceived: true
      }
    },
    {
      status: 'FAILED',
      details: {
        actualStatus: 'FAILED',
        failureTime: new Date().toISOString(),
        errorCode: 'BANK_ERROR_001',
        errorMessage: 'Insufficient funds in beneficiary account',
        beneficiaryReceived: false
      }
    },
    {
      status: 'PENDING',
      details: {
        actualStatus: 'PROCESSING',
        lastUpdate: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        bankResponse: 'Transaction is being processed by beneficiary bank',
        beneficiaryReceived: false
      }
    }
  ];

  // Use order number to determine scenario (for testing)
  const scenarioIndex = orderNo.length % scenarios.length;
  return scenarios[scenarioIndex];
}

/**
 * Get explanation for status discrepancy
 * @param {string} appStatus - Status shown in app
 * @param {string} backendStatus - Actual backend status
 * @returns {string} Explanation of the discrepancy
 */
function getDiscrepancyExplanation(appStatus, backendStatus) {
  const explanations = {
    'SUCCESS-PENDING': 'Transaction appears completed in app but is still processing in backend',
    'SUCCESS-FAILED': 'Transaction shows as successful in app but actually failed in backend',
    'PENDING-SUCCESS': 'Transaction shows as pending in app but has completed in backend',
    'PENDING-FAILED': 'Transaction shows as pending in app but has failed in backend',
    'FAILED-SUCCESS': 'Transaction shows as failed in app but has actually completed in backend'
  };

  const key = `${appStatus}-${backendStatus}`;
  return explanations[key] || 'Status discrepancy detected between app and backend systems';
}

/**
 * Update transaction status
 * @param {string} orderNo - Order number
 * @param {string} newStatus - New status
 * @param {string} failReason - Failure reason (if applicable)
 * @returns {Object} Update result
 */
export async function updateTransactionStatus(orderNo, newStatus, failReason = null) {
  try {
    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return {
        success: false,
        message: 'Order not found'
      };
    }

    const oldStatus = order.status;
    order.status = newStatus;
    
    if (newStatus === 'FAILED' && failReason) {
      order.failReason = failReason;
    }
    
    order.updatedAt = new Date();
    await order.save();

    return {
      success: true,
      message: 'Status updated successfully',
      data: {
        orderNo: order.orderNo,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedAt: order.updatedAt
      }
    };

  } catch (error) {
    console.error('Error updating transaction status:', error);
    return {
      success: false,
      message: `Failed to update status: ${error.message}`
    };
  }
}

/**
 * Get transaction status history
 * @param {string} orderNo - Order number
 * @returns {Array} Status history
 */
export async function getTransactionStatusHistory(orderNo) {
  try {
    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return [];
    }

    // In a real implementation, this would come from a status history table
    const statusHistory = [
      {
        status: 'PENDING',
        timestamp: order.date,
        description: 'Transaction initiated'
      },
      {
        status: order.status,
        timestamp: order.updatedAt,
        description: order.status === 'SUCCESS' ? 'Transaction completed' : 
                    order.status === 'FAILED' ? `Transaction failed: ${order.failReason || 'Unknown reason'}` :
                    'Transaction status updated'
      }
    ];

    return statusHistory;

  } catch (error) {
    console.error('Error getting status history:', error);
    return [];
  }
}

/**
 * Check if transaction is eligible for dispute
 * @param {string} orderNo - Order number
 * @returns {Object} Dispute eligibility information
 */
export async function checkDisputeEligibility(orderNo) {
  try {
    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return {
        eligible: false,
        reason: 'Order not found'
      };
    }

    // Check if transaction is completed but beneficiary hasn't received funds
    const isCompleted = order.status === 'SUCCESS';
    const isRecent = (new Date() - order.date) < (7 * 24 * 60 * 60 * 1000); // Within 7 days
    const isEligibleForDispute = isCompleted && isRecent;

    return {
      eligible: isEligibleForDispute,
      reason: isEligibleForDispute ? 
        'Transaction completed but beneficiary may not have received funds' :
        !isCompleted ? 'Transaction not yet completed' :
        !isRecent ? 'Transaction too old for dispute' :
        'Not eligible for dispute',
      transactionAge: Math.floor((new Date() - order.date) / (24 * 60 * 60 * 1000)),
      maxDisputeDays: 7
    };

  } catch (error) {
    console.error('Error checking dispute eligibility:', error);
    return {
      eligible: false,
      reason: `Error: ${error.message}`
    };
  }
}
