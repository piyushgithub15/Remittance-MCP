# Transaction Status Tracking API

## Overview

This API provides comprehensive transaction status tracking and customer service capabilities for the remittance system. It handles customer inquiries, identity verification, status updates, and escalation procedures.

## Use Cases Implemented

### Scenario 1: Standard Transaction Status Inquiry
- Customer queries transaction status
- System returns current status with timeframe information
- Provides empathetic response based on transaction status

### Scenario 2: Delayed Transactions
- Customer reports delay concerns
- System verifies identity using EID information
- Provides updated timeframe with reassurance
- Escalates to human agent if customer remains unsatisfied

### Scenario 3: Funds Marked Completed but Not Received
- Customer reports non-receipt despite "completed" status
- System verifies identity and refreshes status
- Handles different outcomes (failed vs. completed)
- Initiates investigation workflow for completed transactions

## API Endpoints

### 1. Transaction Status Inquiry
```http
POST /api/transaction/status
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "orderNo": "1705312200000ABC123",
  "customerInfo": {
    "eidLastFour": "1234",
    "eidExpiry": "2025-12-31"
  }
}
```

**Response:**
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
      "transferMode": "BANK_TRANSFER",
      "beneficiaryName": "John Smith",
      "country": "CN",
      "currency": "CNY"
    },
    "transactionDetails": {
      "fromAmount": 1000,
      "feeAmount": 10,
      "totalPayAmount": 1010,
      "receivedAmount": 1850,
      "exchangeRate": 1.85
    },
    "nextSteps": "Please check with the beneficiary bank for final confirmation."
  }
}
```

### 2. Identity Verification
```http
POST /api/transaction/verify-identity
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "orderNo": "1705312200000ABC123",
  "eidLastFour": "1234",
  "eidExpiry": "2025-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "identityVerified": true,
    "message": "Identity verified successfully. How can I assist you with your transaction?"
  }
}
```

### 3. Status Refresh
```http
POST /api/transaction/refresh-status
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "orderNo": "1705312200000ABC123",
  "forceRefresh": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "status": "SUCCESS",
    "lastUpdated": "2024-01-15T14:30:00Z",
    "refreshed": true,
    "message": "Status has been refreshed from the backend system."
  }
}
```

### 4. Detailed Order Information
```http
POST /api/transaction/detailed
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "orderNo": "1705312200000ABC123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "status": "SUCCESS",
    "statusHistory": [
      {
        "status": "PENDING",
        "timestamp": "2024-01-15T10:00:00Z",
        "reason": "Order created",
        "updatedBy": "system"
      },
      {
        "status": "SUCCESS",
        "timestamp": "2024-01-15T14:30:00Z",
        "reason": "Payment processed",
        "updatedBy": "bank"
      }
    ],
    "deliveryInfo": {
      "expectedDelivery": "2024-01-17T10:00:00Z",
      "actualDelivery": null,
      "deliveryStatus": "pending",
      "transferMode": "BANK_TRANSFER"
    },
    "customerInfo": {
      "inquiryCount": 2,
      "lastInquiry": "2024-01-15T15:00:00Z",
      "escalationLevel": 0
    },
    "transactionDetails": {
      "fromAmount": 1000,
      "feeAmount": 10,
      "totalPayAmount": 1010,
      "receivedAmount": 1850,
      "exchangeRate": 1.85,
      "paymentMethod": "CARD"
    },
    "beneficiaryInfo": {
      "name": "John Smith",
      "country": "CN",
      "currency": "CNY",
      "bankName": "Bank of China",
      "accountNumber": "1234567890"
    },
    "timestamps": {
      "created": "2024-01-15T10:00:00Z",
      "lastUpdated": "2024-01-15T14:30:00Z",
      "bankProcessing": "2024-01-15T14:30:00Z"
    }
  }
}
```

### 5. Customer Service Escalation
```http
POST /api/transaction/escalate
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "orderNo": "1705312200000ABC123",
  "reason": "customer_unsatisfied",
  "conversationSummary": "Customer is concerned about transaction delay and wants faster processing",
  "escalationLevel": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderNo": "1705312200000ABC123",
    "escalationLevel": 1,
    "reason": "customer_unsatisfied",
    "message": "Your inquiry has been escalated to a senior customer service representative.",
    "estimatedResponseTime": "Within 4 hours",
    "nextSteps": "A human agent will contact you shortly with further assistance."
  }
}
```

## Response Templates by Scenario

### Standard Inquiry Response
```javascript
{
  "message": "Your transaction has been processed successfully. The delivery timeframe is 1-2 business days as shown in your app.",
  "timeframe": "1-2 business days",
  "status": "SUCCESS"
}
```

### Delayed Transaction Response
```javascript
{
  "message": "I completely understand your concern about the delay. Your transaction has already been processed successfully on our side. The updated delivery timeframe is 3-5 business days, and the delay is due to the beneficiary bank's processing schedule. Weekends and public holidays can cause additional delays, as many banks only process on working days.",
  "updatedTimeframe": "3-5 business days",
  "escalationAvailable": true
}
```

### Non-Receipt Investigation Response
```javascript
// For failed transactions
{
  "message": "I apologize, but the transaction was unsuccessful. A refund will be processed to your original payment method.",
  "refundInfo": {
    "method": "CARD",
    "timeframe": "Up to 7 business days"
  }
}

// For successful transactions
{
  "message": "The transfer was processed successfully from our side. To investigate further, I need the beneficiary's bank statement showing the account activity for the transaction period.",
  "investigationRequired": true,
  "emailWorkflow": "triggered"
}
```

## Database Schema Enhancements

### RemittanceOrder Model Extensions
```javascript
{
  // Status tracking
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
  
  // Customer service
  lastCustomerInquiry: Date,
  inquiryCount: Number,
  escalationLevel: Number, // 0-3
  escalationReason: String,
  conversationSummary: String,
  
  // Bank processing
  bankProcessingTime: Date,
  bankReference: String,
  bankResponseCode: String,
  
  // Timeframe management
  originalTimeframe: String,
  updatedTimeframe: String,
  timeframeReason: String,
  
  // Payment method
  paymentMethod: String // 'CARD', 'WALLET', 'BANK_ACCOUNT', 'CASH'
}
```

## Error Handling

### Validation Errors
```json
{
  "success": false,
  "error": "Validation error",
  "message": "EID last four digits must be exactly 4 characters"
}
```

### Order Not Found
```json
{
  "success": false,
  "error": "Order not found",
  "message": "Transaction not found. Please verify the order number."
}
```

### Identity Verification Failed
```json
{
  "success": false,
  "error": "Identity verification failed",
  "message": "The provided EID information does not match our records."
}
```

## Testing

### Run Transaction Status Tests
```bash
npm run test-transaction-status
```

### Test Scenarios Covered
1. ✅ Transaction status inquiry
2. ✅ Identity verification
3. ✅ Status refresh
4. ✅ Detailed order information
5. ✅ Customer service escalation
6. ✅ Error handling (invalid order, invalid EID format)

## Integration with AI Agent

The API is designed to work seamlessly with AI agents for customer service:

1. **Natural Language Processing**: AI can parse customer queries and map them to appropriate API calls
2. **Response Generation**: AI can use the structured responses to generate empathetic customer communications
3. **Escalation Logic**: AI can determine when to escalate based on customer sentiment and inquiry complexity
4. **Context Awareness**: AI can maintain conversation context across multiple API calls

## Security Considerations

1. **JWT Authentication**: All endpoints require valid JWT tokens
2. **Identity Verification**: Sensitive operations require EID verification
3. **Rate Limiting**: Implement rate limiting for customer inquiries
4. **Audit Logging**: All status changes and escalations are logged
5. **Data Privacy**: Customer information is handled according to privacy regulations

## Future Enhancements

1. **Real-time Notifications**: WebSocket integration for real-time status updates
2. **Machine Learning**: Predictive analytics for delivery timeframes
3. **Multi-language Support**: Localized responses for different regions
4. **Advanced Analytics**: Customer service metrics and insights
5. **Integration APIs**: Connect with external banking and payment systems

This comprehensive transaction status tracking system provides all the necessary tools for handling customer inquiries with empathy, efficiency, and proper escalation procedures.
