# Complete Transfer Flow Documentation

This document explains how the transfer money process works with MongoDB integration.

## Overview

When a user calls `transferMoney`, the system now:
1. **Creates a transfer order** in the database
2. **Generates payment details** for the user
3. **Allows status updates** via callbacks
4. **Enables order queries** to show transaction history

## Complete Flow

### 1. Transfer Money Discovery
```bash
# Get available beneficiaries and suggested amounts
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "transferMoney", "params": {}}'
```

**Response**: List of beneficiaries and suggested amounts

### 2. Transfer Money Execution
```bash
# Initiate transfer with specific beneficiary and amount
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "transferMoney", 
    "params": {
      "beneficiaryId": "123",
      "beneficiaryName": "张三",
      "sendAmount": 1000,
      "callBackProvider": "voice"
    }
  }'
```

**What happens**:
- ✅ Creates `RemittanceOrder` record in database
- ✅ Status: `PENDING`
- ✅ Generates unique order number
- ✅ Calculates fees and exchange rates
- ✅ Returns payment link and order details

**Response**:
```json
{
  "code": 200,
  "message": "Transfer initiated successfully",
  "orderNo": "1703123456789ABC123",
  "button": {
    "title": "Complete Payment",
    "link": "botimapp://pay?token=pay_..."
  },
  "transactionDetails": {
    "sendAmount": 1000,
    "fee": 10,
    "totalAmount": 1010,
    "receivedAmount": 1890,
    "exchangeRate": 1.89
  }
}
```

### 3. Query Transfer Orders
```bash
# Get user's transfer history
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "remittanceOrderQuery", "params": {"orderCount": 10}}'
```

**Response**: List of user's transfer orders with statuses

### 4. Update Order Status (Payment Completion)
```bash
# Simulate payment completion
curl -X POST http://localhost:8080/test/complete-payment \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "1703123456789ABC123",
    "status": "SUCCESS"
  }'
```

**What happens**:
- ✅ Updates order status in database
- ✅ Changes from `PENDING` to `SUCCESS`
- ✅ Order now appears in query results

### 5. Query Orders Again
```bash
# Check updated order status
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "remittanceOrderQuery", "params": {"orderCount": 10}}'
```

**Response**: Updated order list showing `SUCCESS` status

## Database Schema

### RemittanceOrder Collection
```javascript
{
  orderNo: "1703123456789ABC123",     // Unique order number
  userId: "agent1",                   // User identifier
  beneficiaryId: ObjectId,            // Reference to beneficiary
  fromAmount: 1000.00,               // Amount to send
  feeAmount: 10.00,                  // Transaction fee
  totalPayAmount: 1010.00,           // Total amount to pay
  status: "SUCCESS",                 // Order status
  dateDesc: "2024-01-15",            // Date description
  date: Date,                        // Transaction date
  transferMode: "BANK_TRANSFER",      // Transfer method
  country: "CN",                     // Destination country
  currency: "CNY",                   // Destination currency
  beneficiaryName: "张三",            // Beneficiary name
  description: "Transfer to Bank of China",
  exchangeRate: 1.89,                // Exchange rate used
  receivedAmount: 1890.00,           // Amount received
  paymentToken: "pay_...",           // Payment token
  paymentLink: "botimapp://...",     // Payment link
  callbackProvider: "voice",         // Callback type
  callbackUrl: "http://...",         // Callback URL
  callbackToken: "token",            // Callback token
  traceCode: "TRC...",              // Trace code
  createdAt: Date,                   // Creation timestamp
  updatedAt: Date                    // Last update timestamp
}
```

## Order Statuses

- **PENDING**: Order created, payment not yet completed
- **SUCCESS**: Payment completed successfully
- **FAILED**: Payment failed
- **CANCELLED**: Order cancelled by user
- **AML_HOLD**: Order held for AML review

## API Endpoints

### MCP Endpoints
- `POST /mcp/messages` - MCP tool calls
- `POST /mcp` - MCP StreamableHTTP
- `GET /mcp/sse` - MCP Server-Sent Events

### Callback Endpoints
- `POST /callback/remittance` - Payment status callbacks
- `POST /test/complete-payment` - Test payment completion

### Utility Endpoints
- `GET /actuator/health` - Health check
- `POST /auth/token` - JWT token generation

## Testing

### Run Complete Flow Test
```bash
# Test the complete transfer flow
node scripts/test-complete-flow.js
```

### Run Database Test
```bash
# Test MongoDB integration
node scripts/test-mongodb.js
```

### Manual Testing
1. Start the server: `npm start`
2. Get JWT token: `POST /auth/token`
3. Test transfer money: `POST /mcp/messages`
4. Query orders: `POST /mcp/messages`
5. Complete payment: `POST /test/complete-payment`
6. Query orders again: `POST /mcp/messages`

## Key Benefits

1. **Persistent Data**: All transfers are saved to database
2. **Real-time Updates**: Order status can be updated via callbacks
3. **Transaction History**: Users can query their transfer history
4. **Status Tracking**: Complete order lifecycle management
5. **Filtering**: Query orders by status, date, country, etc.
6. **Scalability**: Database-backed solution for production use

## Error Handling

- **Database Connection**: Automatic reconnection on failure
- **Order Creation**: Validation and error handling
- **Status Updates**: Safe status transitions
- **Query Failures**: Graceful error responses

## Production Considerations

- **Database Indexing**: Optimized for common queries
- **Connection Pooling**: Mongoose handles connection pooling
- **Data Validation**: Schema validation at database level
- **Error Logging**: Comprehensive error logging
- **Monitoring**: Database performance monitoring
- **Backup**: Regular database backups
