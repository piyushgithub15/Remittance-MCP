import { z } from 'zod';
import { verifyIdentity } from './verifyIdentity.js';
// Status checking functionality integrated directly into this file
import RemittanceOrder from '../models/RemittanceOrder.js';
import { sendCustomerEmail } from './emailService.js';

// Validation schema for completed transaction dispute handling
export const completedTransactionDisputeSchema = z.object({
  orderNo: z.string().min(1, 'orderNo is required'),
  lastFourDigits: z.string().length(4, 'lastFourDigits must be exactly 4 digits').regex(/^\d{4}$/, 'lastFourDigits must contain only digits'),
  customerEmail: z.string().email('Invalid email address').optional(),
  customerName: z.string().optional(),
  disputeType: z.enum(['beneficiary_not_received', 'wrong_amount', 'delayed_delivery']).default('beneficiary_not_received')
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

/**
 * Internal function to check transaction status from backend
 * @param {string} orderNo - Order number
 * @returns {Object} Status data
 */
async function checkTransactionStatusInternal(orderNo) {
  try {
    // Find the order
    const order = await RemittanceOrder.findOne({ 
      orderNo,
      userId: DEFAULT_USER_ID 
    });

    if (!order) {
      return {
        appStatus: 'NOT_FOUND',
        backendStatus: 'NOT_FOUND',
        hasDiscrepancy: false,
        transactionDetails: null
      };
    }

    // Simulate backend status check (in real implementation, this would call external API)
    const backendStatus = await simulateBackendStatusCheck(orderNo);
    
    // Determine if there's a discrepancy
    const hasDiscrepancy = order.status !== backendStatus.status;
    
    return {
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
      backendDetails: backendStatus.details
    };

  } catch (error) {
    console.error('Error checking transaction status:', error);
    return {
      appStatus: 'ERROR',
      backendStatus: 'ERROR',
      hasDiscrepancy: false,
      error: error.message
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

// Hardcoded messages for different scenarios
const DISPUTE_MESSAGES = {
  failed_transaction: {
    title: "Transaction Status Update",
    message: "I've checked the backend status and found that your transaction has actually failed. The app incorrectly showed it as completed. I sincerely apologize for this confusion.",
    action: "I'm updating the status in our system and will initiate a refund process immediately. You should receive your money back within 2-3 business days.",
    followUp: "We'll also investigate why this discrepancy occurred to prevent it from happening again."
  },
  
  completed_transaction: {
    title: "Transaction Verification Complete",
    message: "I've verified with our backend systems and confirmed that your transaction was indeed completed successfully on our end.",
    action: "Since the beneficiary hasn't received the funds, this appears to be an issue with the beneficiary bank's processing. We'll investigate this immediately.",
    followUp: "I'll send you an email with a secure link where you can submit the beneficiary's bank details so we can trace the transaction directly with their bank."
  },
  
  pending_transaction: {
    title: "Transaction Still Processing",
    message: "I've checked the backend status and your transaction is still being processed by the beneficiary bank.",
    action: "This is normal for international transfers and can take 1-3 business days depending on the destination country and bank.",
    followUp: "I'll send you regular updates on the status. You can also check the app for real-time updates."
  }
};

/**
 * Handle completed transaction dispute where beneficiary hasn't received funds
 * @param {Object} params - Parameters object
 * @param {string} params.orderNo - Order number
 * @param {string} params.lastFourDigits - Last 4 digits of Emirates ID
 * @param {string} [params.customerEmail] - Customer email address
 * @param {string} [params.customerName] - Customer name
 * @param {string} [params.disputeType] - Type of dispute
 * @returns {Object} ToolResult with dispute handling response
 */
export async function handleCompletedTransactionDispute(params) {
  try {
    // Validate input parameters
    const validation = completedTransactionDisputeSchema.safeParse(params);
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

    const { orderNo, lastFourDigits, customerEmail, customerName, disputeType } = validation.data;

    // Step 1: Verify customer identity
    console.log('🔐 Verifying customer identity...');
    const identityResult = await verifyIdentity({
      lastFourDigits
    });

    if (identityResult.isError || !JSON.parse(identityResult.content[0].text).data.verified) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 401,
              message: 'Identity verification failed',
              data: {
                verified: false,
                reason: 'Invalid Emirates ID details provided',
                nextSteps: ['Please provide correct last 4 digits of your Emirates ID', 'Contact support if you need assistance']
              }
            })
          }
        ],
        isError: false
      };
    }

    console.log('✅ Identity verified successfully');

    // Step 2: Check actual transaction status from backend
    console.log('🔍 Checking actual transaction status...');
    const statusData = await checkTransactionStatusInternal(orderNo);
    console.log('📊 Backend status:', statusData.backendStatus);

    // Step 3: Handle different scenarios based on backend status
    let response;
    
    switch (statusData.backendStatus) {
      case 'FAILED':
        response = await handleFailedTransactionScenario(orderNo, statusData, customerName);
        break;
      case 'SUCCESS':
        response = await handleCompletedTransactionScenario(orderNo, statusData, customerEmail, customerName, disputeType);
        break;
      case 'PENDING':
        response = await handlePendingTransactionScenario(orderNo, statusData, customerName);
        break;
      default:
        response = await handleUnknownStatusScenario(orderNo, statusData, customerName);
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
    console.error('Error in handleCompletedTransactionDispute:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Dispute handling failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Handle failed transaction scenario
 * @param {string} orderNo - Order number
 * @param {Object} statusData - Status data from backend
 * @param {string} customerName - Customer name
 * @returns {Object} Response for failed transaction
 */
async function handleFailedTransactionScenario(orderNo, statusData, customerName) {
  console.log('❌ Handling failed transaction scenario');

  // Update transaction status to reflect actual backend status
  await updateTransactionStatus(orderNo, 'FAILED', statusData.backendDetails.errorMessage);

  const messages = DISPUTE_MESSAGES.failed_transaction;

  return {
    code: 200,
    message: 'Transaction status corrected',
    data: {
      scenario: 'failed_transaction',
      title: messages.title,
      message: messages.message,
      action: messages.action,
      followUp: messages.followUp,
      orderNo: orderNo,
      actualStatus: 'FAILED',
      appStatus: statusData.appStatus,
      backendStatus: statusData.backendStatus,
      hasDiscrepancy: true,
      refundInitiated: true,
      estimatedRefundTime: '2-3 business days',
      customerName: customerName || 'Valued Customer',
      nextSteps: [
        'Transaction status updated in system',
        'Refund process initiated',
        'Investigation launched for discrepancy',
        'Customer will receive refund confirmation email'
      ]
    }
  };
}

/**
 * Handle completed transaction scenario
 * @param {string} orderNo - Order number
 * @param {Object} statusData - Status data from backend
 * @param {string} customerEmail - Customer email
 * @param {string} customerName - Customer name
 * @param {string} disputeType - Type of dispute
 * @returns {Object} Response for completed transaction
 */
async function handleCompletedTransactionScenario(orderNo, statusData, customerEmail, customerName, disputeType) {
  console.log('✅ Handling completed transaction scenario');

  const messages = DISPUTE_MESSAGES.completed_transaction;

  // Check if customer is eligible for dispute resolution
  const disputeEligibility = await checkDisputeEligibility(orderNo);

  let emailResult = null;
  if (customerEmail && disputeEligibility.eligible) {
    console.log('📧 Sending bank details submission email...');
    emailResult = await sendCustomerEmail({
      customerEmail,
      orderNo,
      emailType: 'bank_details_submission',
      customerName,
      additionalMessage: `We're investigating why the beneficiary hasn't received the funds for transaction ${orderNo}.`
    });
  }

  return {
    code: 200,
    message: 'Dispute investigation initiated',
    data: {
      scenario: 'completed_transaction',
      title: messages.title,
      message: messages.message,
      action: messages.action,
      followUp: messages.followUp,
      orderNo: orderNo,
      actualStatus: 'SUCCESS',
      appStatus: statusData.appStatus,
      backendStatus: statusData.backendStatus,
      hasDiscrepancy: false,
      disputeEligible: disputeEligibility.eligible,
      disputeReason: disputeEligibility.reason,
      emailSent: emailResult ? !emailResult.isError : false,
      emailDetails: emailResult && !emailResult.isError ? 
        JSON.parse(emailResult.content[0].text).data : null,
      customerName: customerName || 'Valued Customer',
      nextSteps: [
        'Backend verification completed',
        'Investigation with beneficiary bank initiated',
        customerEmail ? 'Bank details submission email sent' : 'Customer email required for bank details submission',
        'Resolution expected within 2-3 business days'
      ],
      investigationDetails: {
        beneficiaryBank: statusData.transactionDetails.bankName || 'Unknown',
        country: statusData.transactionDetails.country,
        currency: statusData.transactionDetails.currency,
        amount: statusData.transactionDetails.toAmount,
        transactionDate: statusData.transactionDetails.transactionDate
      }
    }
  };
}

/**
 * Handle pending transaction scenario
 * @param {string} orderNo - Order number
 * @param {Object} statusData - Status data from backend
 * @param {string} customerName - Customer name
 * @returns {Object} Response for pending transaction
 */
async function handlePendingTransactionScenario(orderNo, statusData, customerName) {
  console.log('⏳ Handling pending transaction scenario');

  const messages = DISPUTE_MESSAGES.pending_transaction;

  return {
    code: 200,
    message: 'Transaction status clarified',
    data: {
      scenario: 'pending_transaction',
      title: messages.title,
      message: messages.message,
      action: messages.action,
      followUp: messages.followUp,
      orderNo: orderNo,
      actualStatus: 'PENDING',
      appStatus: statusData.appStatus,
      backendStatus: statusData.backendStatus,
      hasDiscrepancy: statusData.appStatus === 'SUCCESS',
      customerName: customerName || 'Valued Customer',
      nextSteps: [
        'Transaction is still being processed',
        'Regular status updates will be provided',
        'Expected completion time provided',
        'Customer can check app for real-time updates'
      ],
      processingDetails: {
        estimatedCompletion: statusData.backendDetails.estimatedCompletion,
        lastUpdate: statusData.backendDetails.lastUpdate,
        bankResponse: statusData.backendDetails.bankResponse
      }
    }
  };
}

/**
 * Handle unknown status scenario
 * @param {string} orderNo - Order number
 * @param {Object} statusData - Status data from backend
 * @param {string} customerName - Customer name
 * @returns {Object} Response for unknown status
 */
async function handleUnknownStatusScenario(orderNo, statusData, customerName) {
  console.log('❓ Handling unknown status scenario');

  return {
    code: 200,
    message: 'Status investigation required',
    data: {
      scenario: 'unknown_status',
      title: 'Status Investigation Required',
      message: 'I\'ve checked the backend status and found an unusual status that requires further investigation.',
      action: 'I\'m escalating this to our technical team for immediate review and resolution.',
      followUp: 'You\'ll receive a detailed update within 24 hours.',
      orderNo: orderNo,
      actualStatus: statusData.backendStatus,
      appStatus: statusData.appStatus,
      backendStatus: statusData.backendStatus,
      hasDiscrepancy: true,
      customerName: customerName || 'Valued Customer',
      nextSteps: [
        'Technical team escalation initiated',
        'Detailed investigation in progress',
        'Customer will receive update within 24 hours',
        'Resolution timeline will be provided'
      ],
      escalationDetails: {
        escalatedAt: new Date().toISOString(),
        estimatedResolution: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        priority: 'High'
      }
    }
  };
}

/**
 * Get customer email from context or prompt for it
 * @param {string} orderNo - Order number
 * @returns {Object} Email handling result
 */
export async function getCustomerEmail(orderNo) {
  // In a real implementation, this would check session context or database
  // For now, we'll return a prompt message
  return {
    code: 200,
    message: 'Customer email required',
    data: {
      prompt: 'To proceed with the investigation, I need your email address. Please provide it so I can send you a secure link to submit the beneficiary\'s bank details.',
      required: true,
      purpose: 'bank_details_submission',
      orderNo: orderNo
    }
  };
}

/**
 * Generate dispute summary for escalation
 * @param {string} orderNo - Order number
 * @param {Object} disputeData - Dispute data
 * @returns {Object} Dispute summary
 */
export function generateDisputeSummary(orderNo, disputeData) {
  return {
    disputeId: `DISPUTE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    orderNo: orderNo,
    customerName: disputeData.customerName,
    customerEmail: disputeData.customerEmail,
    disputeType: disputeData.disputeType,
    reportedAt: new Date().toISOString(),
    status: 'INVESTIGATING',
    priority: 'HIGH',
    summary: {
      issue: 'Customer reports completed transaction but beneficiary has not received funds',
      appStatus: disputeData.appStatus,
      backendStatus: disputeData.backendStatus,
      hasDiscrepancy: disputeData.hasDiscrepancy,
      investigationRequired: true
    }
  };
}
