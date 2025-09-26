# Transaction Status Tracking & Payment Information Plan

## Overview

This document outlines the comprehensive plan for fetching payment information and responding to customer queries about transaction status in the remittance system.

## Current System Architecture

### Data Storage
- **RemittanceOrder Collection**: Stores all transaction details
- **Status Tracking**: PENDING → SUCCESS/FAILED/CANCELLED/AML_HOLD
- **Payment Information**: Stored in MongoDB with real-time updates via callbacks

### Current API Endpoints
- `POST /api/orders` - Query transaction history
- `POST /callback/remittance` - Payment status updates
- `POST /test/complete-payment` - Test payment completion

## Enhanced Transaction Status System

### 1. Data Model Enhancements

#### RemittanceOrder Schema Extensions
```javascript
{
  // Existing fields...
  orderNo: String,
  status: String,
  fromAmount: Number,
  feeAmount: Number,
  totalPayAmount: Number,
  
  // New fields for status tracking
  statusHistory: [{
    status: String,
    timestamp: Date,
    reason: String,
    updatedBy: String // 'system', 'customer', 'bank', 'admin'
  }],
  
  // Delivery tracking
  expectedDeliveryTime: Date,
  actualDeliveryTime: Date,
  deliveryStatus: String, // 'pending', 'delivered', 'delayed', 'failed'
  
  // Customer service fields
  lastCustomerInquiry: Date,
  inquiryCount: Number,
  escalationLevel: Number, // 0-3 (0=AI, 3=human)
  
  // Bank processing details
  bankProcessingTime: Date,
  bankReference: String,
  bankResponseCode: String,
  
  // Timeframe management
  originalTimeframe: String,
  updatedTimeframe: String,
  timeframeReason: String
}
```

### 2. New API Endpoints

#### Transaction Status Inquiry
```http
POST /api/transaction/status
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "orderNo": "1705312200000ABC123",
  "customerInfo": {
    "eidLastFour": "1234",
    "eidExpiry": "2025-12-31"
  }
}
```

#### Enhanced Order Query with Status Details
```http
POST /api/orders/detailed
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "orderNo": "1705312200000ABC123",
  "includeStatusHistory": true,
  "includeDeliveryInfo": true
}
```

#### Customer Service Escalation
```http
POST /api/customer-service/escalate
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "orderNo": "1705312200000ABC123",
  "reason": "customer_unsatisfied",
  "conversationSummary": "Customer concerned about delay...",
  "escalationLevel": 1
}
```

### 3. Use Case Implementation

#### Scenario 1: Standard Transaction Status Inquiry

**API Flow:**
1. Customer queries transaction status
2. System fetches order details from MongoDB
3. Returns current status with timeframe information
4. Provides empathetic response based on status

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "status": "SUCCESS",
    "currentTimeframe": "1-2 business days",
    "message": "Your transaction has been processed successfully. The delivery timeframe is 1-2 business days as shown in your app.",
    "deliveryInfo": {
      "expectedDelivery": "2024-01-17T10:00:00Z",
      "bankProcessingTime": "2024-01-15T14:30:00Z",
      "deliveryStatus": "pending"
    },
    "nextSteps": "Please check with the beneficiary bank for final confirmation."
  }
}
```

#### Scenario 2: Delayed Transactions

**API Flow:**
1. Customer reports delay concern
2. System verifies identity (EID validation)
3. Checks for updated timeframes
4. Provides empathetic response with updated information
5. Escalates if customer remains unsatisfied

**Identity Verification Endpoint:**
```http
POST /api/customer-service/verify-identity
Content-Type: application/json

{
  "orderNo": "1705312200000ABC123",
  "eidLastFour": "1234",
  "eidExpiry": "2025-12-31"
}
```

**Delayed Transaction Response:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "status": "SUCCESS",
    "updatedTimeframe": "3-5 business days",
    "delayReason": "beneficiary_bank_processing",
    "message": "I completely understand your concern about the delay. Your transaction has already been processed successfully on our side. The updated delivery timeframe is 3-5 business days, and the delay is due to the beneficiary bank's processing schedule. Weekends and public holidays can cause additional delays, as many banks only process on working days.",
    "escalationAvailable": true,
    "escalationReason": "If you remain concerned, I can escalate this to a human agent for further assistance."
  }
}
```

#### Scenario 3: Funds Marked Completed but Not Received

**API Flow:**
1. Customer reports non-receipt despite "completed" status
2. System verifies identity
3. Refreshes transaction status from backend
4. Handles different outcomes based on actual status

**Status Refresh Endpoint:**
```http
POST /api/transaction/refresh-status
Content-Type: application/json
Authorization: Bearer {jwt_token}

{
  "orderNo": "1705312200000ABC123",
  "forceRefresh": true
}
```

**Non-Receipt Investigation Response:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "actualStatus": "SUCCESS",
    "investigationRequired": true,
    "message": "I've verified that your transaction was processed successfully from our side. To investigate further, I'll need the beneficiary's bank statement showing the account activity for the transaction period.",
    "nextSteps": {
      "action": "collect_bank_statement",
      "emailWorkflow": "triggered",
      "documentSubmission": {
        "email": "customer@example.com",
        "deadline": "2024-01-22T23:59:59Z",
        "instructions": "Please email the bank statement to support@remittance.com with order number in subject line."
      }
    }
  }
}
```

### 4. AI Agent Response System

#### Response Templates by Scenario

**Standard Inquiry Response:**
```javascript
const getStandardResponse = (order) => {
  const timeframes = {
    'BANK_TRANSFER': '1-2 business days',
    'CASH_PICK_UP': 'Immediate to 2 hours',
    'MOBILE_WALLET': 'Immediate to 30 minutes',
    'UPI': 'Immediate to 2 hours'
  };
  
  return {
    message: `Your transaction has been processed successfully. The delivery timeframe is ${timeframes[order.transferMode]} as shown in your app.`,
    timeframe: timeframes[order.transferMode],
    status: order.status
  };
};
```

**Delayed Transaction Response:**
```javascript
const getDelayedResponse = (order, updatedTimeframe) => {
  return {
    message: `I completely understand your concern about the delay. Your transaction has already been processed successfully on our side. The updated delivery timeframe is ${updatedTimeframe}, and the delay is due to the beneficiary bank's processing schedule. Weekends and public holidays can cause additional delays, as many banks only process on working days.`,
    updatedTimeframe,
    escalationAvailable: true
  };
};
```

**Non-Receipt Investigation Response:**
```javascript
const getInvestigationResponse = (order) => {
  if (order.actualStatus === 'FAILED') {
    return {
      message: 'I apologize, but the transaction was unsuccessful. A refund will be processed to your original payment method.',
      refundInfo: {
        method: order.paymentMethod,
        timeframe: order.paymentMethod === 'WALLET' ? 'Immediate' : 'Up to 7 business days'
      }
    };
  } else {
    return {
      message: 'The transfer was processed successfully from our side. To investigate further, I need the beneficiary\'s bank statement.',
      investigationRequired: true,
      emailWorkflow: 'triggered'
    };
  }
};
```

### 5. Database Queries for Payment Information

#### Order Status Query
```javascript
const getOrderStatus = async (orderNo, userId) => {
  return await RemittanceOrder.findOne({
    orderNo,
    userId
  }).populate('beneficiaryId');
};
```

#### Status History Query
```javascript
const getStatusHistory = async (orderNo) => {
  return await RemittanceOrder.findOne(
    { orderNo },
    { statusHistory: 1, deliveryStatus: 1, expectedDeliveryTime: 1 }
  );
};
```

#### Customer Inquiry Tracking
```javascript
const trackCustomerInquiry = async (orderNo) => {
  return await RemittanceOrder.findOneAndUpdate(
    { orderNo },
    {
      $inc: { inquiryCount: 1 },
      $set: { lastCustomerInquiry: new Date() }
    },
    { new: true }
  );
};
```

### 6. Real-time Status Updates

#### Webhook Integration
```javascript
// Enhanced callback handler
app.post('/callback/remittance', async (req, res) => {
  const { notifyEvent, data } = req.body;
  
  if (notifyEvent === 'remittance_pay_status') {
    const order = await updateOrderStatus(data.orderNo, data.status, data.failReason);
    
    // Add to status history
    await addStatusHistory(orderNo, {
      status: data.status,
      timestamp: new Date(),
      reason: data.failReason || 'Payment processed',
      updatedBy: 'bank'
    });
    
    // Update delivery tracking
    if (data.status === 'SUCCESS') {
      await updateDeliveryTracking(orderNo, {
        bankProcessingTime: new Date(),
        bankReference: data.bankReference,
        expectedDeliveryTime: calculateExpectedDelivery(order)
      });
    }
  }
  
  res.json({ status: 'received' });
});
```

### 7. Implementation Priority

#### Phase 1: Core Status Tracking
1. Enhance RemittanceOrder schema
2. Implement basic status inquiry endpoint
3. Add identity verification
4. Create response templates

#### Phase 2: Advanced Features
1. Status history tracking
2. Delivery timeframe management
3. Escalation system
4. Investigation workflows

#### Phase 3: AI Integration
1. Natural language processing
2. Sentiment analysis
3. Automated escalation triggers
4. Conversation summarization

### 8. Testing Strategy

#### Unit Tests
- Order status queries
- Identity verification
- Response template generation
- Status update handling

#### Integration Tests
- End-to-end customer inquiry flow
- Escalation system
- Webhook processing
- Database consistency

#### Load Tests
- High-volume status queries
- Concurrent customer inquiries
- Webhook processing under load

This plan provides a comprehensive framework for handling transaction status inquiries with proper customer service responses, identity verification, and escalation procedures.
