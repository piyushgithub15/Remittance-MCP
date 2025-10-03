import express from 'express';
import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';
import Beneficiary from '../models/Beneficiary.js';

const router = express.Router();

// Validation schemas
const transactionStatusSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  customerInfo: z.object({
    eidLastFour: z.string().length(4, 'EID last four digits must be exactly 4 characters'),
    eidExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'EID expiry must be in YYYY-MM-DD format')
  }).optional()
});

const identityVerificationSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  eidLastFour: z.string().length(4, 'EID last four digits must be exactly 4 characters'),
  eidExpiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'EID expiry must be in YYYY-MM-DD format')
});

const statusRefreshSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  forceRefresh: z.boolean().optional().default(false)
});

const escalationSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  reason: z.enum(['customer_unsatisfied', 'technical_issue', 'complex_inquiry', 'other']),
  conversationSummary: z.string().min(10, 'Conversation summary must be at least 10 characters'),
  escalationLevel: z.number().int().min(1).max(3).default(1)
});

// Helper functions
const getTimeframeByTransferMode = (transferMode) => {
  const timeframes = {
    'BANK_TRANSFER': '1-2 business days',
    'CASH_PICK_UP': 'Immediate to 2 hours',
    'MOBILE_WALLET': 'Immediate to 30 minutes',
    'UPI': 'Immediate to 2 hours'
  };
  return timeframes[transferMode] || '1-2 business days';
};

const calculateExpectedDelivery = (order) => {
  const now = new Date();
  const processingTime = new Date(order.date);
  
  // Add business days based on transfer mode
  let businessDays = 1;
  if (order.transferMode === 'BANK_TRANSFER') businessDays = 2;
  else if (order.transferMode === 'CASH_PICK_UP') businessDays = 0;
  else if (order.transferMode === 'MOBILE_WALLET') businessDays = 0;
  else if (order.transferMode === 'UPI') businessDays = 0;
  
  const expectedDelivery = new Date(processingTime);
  expectedDelivery.setDate(expectedDelivery.getDate() + businessDays);
  
  return expectedDelivery;
};

const getStatusMessage = (order, scenario = 'standard') => {
  const timeframes = {
    'BANK_TRANSFER': '1-2 business days',
    'CASH_PICK_UP': 'Immediate to 2 hours',
    'MOBILE_WALLET': 'Immediate to 30 minutes',
    'UPI': 'Immediate to 2 hours'
  };
  
  const timeframe = timeframes[order.transferMode] || '1-2 business days';
  
  switch (scenario) {
    case 'standard':
      return `Your transaction has been processed successfully. The delivery timeframe is ${timeframe} as shown in your app.`;
    
    case 'delayed':
      return `I completely understand your concern about the delay. Your transaction has already been processed successfully on our side. The updated delivery timeframe is ${timeframe}, and the delay is due to the beneficiary bank's processing schedule. Weekends and public holidays can cause additional delays, as many banks only process on working days.`;
    
    case 'non_receipt':
      if (order.status?.toUpperCase() === 'FAILED') {
        return 'I apologize, but the transaction was unsuccessful. A refund will be processed to your original payment method.';
      } else {
        return 'The transfer was processed successfully from our side. To investigate further, I need the beneficiary\'s bank statement showing the account activity for the transaction period.';
      }
    
    default:
      return `Your transaction status is ${order.status}.`;
  }
};

// Routes

// Get transaction status with customer inquiry tracking
router.post('/status', async (req, res) => {
  try {
    const validation = transactionStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, customerInfo } = validation.data;
    const userId = req.user?.userId || 'agent1';

    // Find the order
    const order = await RemittanceOrder.findOne({ orderNo, userId })
      .populate('beneficiaryId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Transaction not found. Please verify the order number.'
      });
    }

    // Track customer inquiry
    await RemittanceOrder.findOneAndUpdate(
      { orderNo },
      {
        $inc: { inquiryCount: 1 },
        $set: { lastCustomerInquiry: new Date() }
      }
    );

    // Get status message based on current status
    let scenario = 'standard';
    if (order.status?.toUpperCase() === 'PENDING') scenario = 'delayed';
    if (order.status?.toUpperCase() === 'FAILED') scenario = 'non_receipt';

    const response = {
      success: true,
      data: {
        orderNo: order.orderNo,
        status: order.status,
        amount: order.fromAmount,
        fee: order.feeAmount,
        total: order.totalPayAmount
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in transaction status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Verify customer identity
router.post('/verify-identity', async (req, res) => {
  try {
    const validation = identityVerificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, eidLastFour, eidExpiry } = validation.data;
    const userId = req.user?.userId || 'agent1';

    // Find the order
    const order = await RemittanceOrder.findOne({ orderNo, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Transaction not found. Please verify the order number.'
      });
    }

    // In a real system, you would verify against actual EID data
    // For now, we'll simulate verification
    const isValidIdentity = true; // Simulate successful verification

    if (!isValidIdentity) {
      return res.status(401).json({
        success: false,
        error: 'Identity verification failed',
        message: 'The provided EID information does not match our records.'
      });
    }

    res.json({
      success: true,
      data: {
        orderNo,
        identityVerified: true,
        message: 'Identity verified successfully. How can I assist you with your transaction?'
      }
    });
  } catch (error) {
    console.error('Error in identity verification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Refresh transaction status
router.post('/refresh-status', async (req, res) => {
  try {
    const validation = statusRefreshSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, forceRefresh } = validation.data;
    const userId = req.user?.userId || 'agent1';

    // Find the order
    const order = await RemittanceOrder.findOne({ orderNo, userId })
      .populate('beneficiaryId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Transaction not found. Please verify the order number.'
      });
    }

    // In a real system, you would call external APIs to refresh status
    // For now, we'll simulate status refresh
    const refreshedOrder = { ...order.toObject() };
    
    // Simulate potential status changes
    if (order.status?.toUpperCase() === 'PENDING' && forceRefresh) {
      // Simulate status update
      refreshedOrder.status = 'SUCCESS';
      refreshedOrder.bankProcessingTime = new Date();
      refreshedOrder.bankReference = `BANK_${Date.now()}`;
    }

    res.json({
      success: true,
      data: {
        orderNo: refreshedOrder.orderNo,
        status: refreshedOrder.status,
        lastUpdated: new Date(),
        refreshed: forceRefresh,
        message: forceRefresh 
          ? 'Status has been refreshed from the backend system.'
          : 'Current status retrieved successfully.'
      }
    });
  } catch (error) {
    console.error('Error in status refresh:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Escalate customer service inquiry
router.post('/escalate', async (req, res) => {
  try {
    const validation = escalationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, reason, conversationSummary, escalationLevel } = validation.data;
    const userId = req.user?.userId || 'agent1';

    // Find the order
    const order = await RemittanceOrder.findOne({ orderNo, userId });
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Transaction not found. Please verify the order number.'
      });
    }

    // Update escalation level
    await RemittanceOrder.findOneAndUpdate(
      { orderNo },
      {
        $set: {
          escalationLevel,
          lastCustomerInquiry: new Date(),
          escalationReason: reason,
          conversationSummary
        }
      }
    );

    // In a real system, you would trigger escalation workflow
    // For now, we'll simulate escalation
    const escalationMessages = {
      1: 'Your inquiry has been escalated to a senior customer service representative.',
      2: 'Your inquiry has been escalated to a customer service supervisor.',
      3: 'Your inquiry has been escalated to a customer service manager for immediate attention.'
    };

    res.json({
      success: true,
      data: {
        orderNo,
        escalationLevel,
        reason,
        message: escalationMessages[escalationLevel] || 'Your inquiry has been escalated.',
        estimatedResponseTime: escalationLevel === 3 ? 'Within 1 hour' : 'Within 4 hours',
        nextSteps: 'A human agent will contact you shortly with further assistance.'
      }
    });
  } catch (error) {
    console.error('Error in escalation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Get detailed order information for customer service
router.post('/detailed', async (req, res) => {
  try {
    const { orderNo } = req.body;
    const userId = req.user?.userId || 'agent1';

    if (!orderNo) {
      return res.status(400).json({
        success: false,
        error: 'Order number required',
        message: 'Order number is required to retrieve detailed information.'
      });
    }

    const order = await RemittanceOrder.findOne({ orderNo, userId })
      .populate('beneficiaryId');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found',
        message: 'Transaction not found. Please verify the order number.'
      });
    }

    const response = {
      success: true,
      data: {
        orderNo: order.orderNo,
        status: order.status,
        amount: order.fromAmount,
        fee: order.feeAmount,
        total: order.totalPayAmount
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in detailed order query:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
