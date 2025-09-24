# 🗣️ Conversation Starters for Remittance MCP Server

This document provides three comprehensive conversation starters to test each of the MCP tools with verbose, realistic scenarios.

## 🔐 Prerequisites

Before testing, ensure you have:
1. JWT token for authentication
2. Server running on `http://localhost:8080`
3. Proper headers for MCP requests

### Get Authentication Token

```bash
# Generate JWT token
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "scope": "read"}'
```

## 🧪 Test Scenarios

### 1. 💱 Exchange Rate Query Tool Test

**Scenario**: A customer wants to send money to China and needs to know the current exchange rate.

**Conversation Starter**:
```
"I'm planning to send money to my family in China and I need to know the current exchange rate from AED to Chinese Yuan. Can you help me check what the rate is for CNY? I want to make sure I understand how much they'll receive when I send 1000 AED."
```

**Expected MCP Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "queryExchangeRate",
    "arguments": {
      "toCountry": "CN",
      "toCurrency": "CNY"
    }
  }
}
```

**Expected Response**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"head\":{\"applyStatus\":\"SUCCESS\",\"code\":\"200\",\"msg\":\"OK\",\"traceCode\":\"TRC1757924833123ABC\"},\"body\":{\"fromCountryCode\":\"AE\",\"fromCurrencyCode\":\"AED\",\"fromCurrencyIcon\":\"https://icon.ae.png\",\"toCountryCode\":\"CN\",\"toCurrencyCode\":\"CNY\",\"toCurrencyIcon\":\"https://icon.cn.png\",\"exchangeRate\":1.89}}"
      }
    ],
    "isError": false
  }
}
```

**Follow-up Questions**:
- "What about sending to India? What's the rate for INR?"
- "Can you check the rate for USD as well?"
- "What countries are supported for remittance?"

---

### 2. 💸 Money Transfer Tool Test

**Scenario**: A customer wants to initiate a money transfer but needs to see available beneficiaries and understand the process.

**Conversation Starter**:
```
"I want to send money to my friend John Smith in the United States. I'm not sure if he's already in my beneficiary list, and I'd like to see what options I have. I'm thinking of sending around $500 USD worth, but I want to understand the fees and process first. Can you help me with this transfer?"
```

**Expected MCP Request (Discovery Stage)**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "transferMoney",
    "arguments": {
      "callBackProvider": "voice"
    }
  }
}
```

**Expected Response (Discovery)**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"code\":200,\"message\":\"Success\",\"beneficiaries\":[{\"id\":123,\"title\":\"Bank of China 1234567890\",\"name\":\"张三\",\"currency\":\"CNY\",\"icon\":\"https://icon.bank.png\"},{\"id\":125,\"title\":\"John Smith - Wells Fargo\",\"name\":\"John Smith\",\"currency\":\"USD\",\"icon\":\"https://icon.wellsfargo.png\"}],\"sendAmounts\":[{\"amount\":100,\"currency\":\"AED\"},{\"amount\":500,\"currency\":\"AED\"},{\"amount\":1000,\"currency\":\"AED\"}],\"callBackProviders\":[{\"type\":\"voice\",\"url\":\"http://localhost:8080/voice/\",\"token\":\"yourVoiceToken\",\"description\":\"Voice-based confirmation callbacks\"},{\"type\":\"text\",\"url\":\"http://localhost:8080/text/\",\"token\":\"yourTextToken\",\"description\":\"Text-based confirmation callbacks\"}]}"
      }
    ],
    "isError": false
  }
}
```

**Follow-up Request (Execution Stage)**:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "transferMoney",
    "arguments": {
      "beneficiaryId": "125",
      "beneficiaryName": "John Smith",
      "sendAmount": 500,
      "callBackProvider": "voice"
    }
  }
}
```

**Expected Response (Execution)**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"code\":200,\"message\":\"Transfer initiated successfully\",\"paymentLink\":\"botimapp://pay?token=pay_123&amount=505.00&beneficiary=John+Smith&callback=voice\",\"callBackProvider\":\"voice\",\"callBackUrl\":\"http://localhost:8080/voice/\",\"callBackToken\":\"yourVoiceToken\",\"transactionDetails\":{\"beneficiary\":{\"id\":125,\"name\":\"John Smith\",\"currency\":\"USD\"},\"sendAmount\":500,\"fee\":5,\"totalAmount\":505,\"receivedAmount\":1350,\"exchangeRate\":0.27}}}"
      }
    ],
    "isError": false
  }
}
```

**Follow-up Questions**:
- "What if I want to send to a different beneficiary?"
- "Can I change the amount to 1000 AED?"
- "What are the fees for this transfer?"
- "How do I complete the payment?"

---

### 3. 📋 Remittance Order Query Tool Test

**Scenario**: A customer wants to check their recent transfer history and track specific transactions.

**Conversation Starter**:
```
"I sent some money last week to my family in India, and I want to check the status of that transaction. I think it was around 2000 AED and I used bank transfer. Can you help me find that transaction and also show me all my recent transfers? I'd like to see the last 5 transactions to get an overview of my remittance activity."
```

**Expected MCP Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "remittanceOrderQuery",
    "arguments": {
      "transferMode": "BANK_TRANSFER",
      "country": "IN",
      "currency": "INR",
      "orderCount": 5
    }
  }
}
```

**Expected Response**:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"code\":200,\"message\":\"Success\",\"orders\":[{\"orderId\":\"ORD123456789\",\"status\":\"COMPLETED\",\"amount\":2000,\"currency\":\"AED\",\"recipient\":\"Rajesh Kumar\",\"country\":\"IN\",\"transferMode\":\"BANK_TRANSFER\",\"createdAt\":\"2024-01-10T14:30:00Z\",\"completedAt\":\"2024-01-10T16:45:00Z\"},{\"orderId\":\"ORD123456790\",\"status\":\"PENDING\",\"amount\":1500,\"currency\":\"AED\",\"recipient\":\"Priya Sharma\",\"country\":\"IN\",\"transferMode\":\"BANK_TRANSFER\",\"createdAt\":\"2024-01-12T09:15:00Z\"}],\"totalCount\":2,\"hasMore\":false}"
      }
    ],
    "isError": false
  }
}
```

**Follow-up Questions**:
- "Can you show me transfers to China as well?"
- "What about cash pick-up transactions?"
- "Can I see transactions from last month?"
- "What's the status of my pending transfer?"

---

## 🧪 Complete Test Script

Here's a complete test script that demonstrates all three tools:

```bash
#!/bin/bash

# Get JWT token
echo "🔐 Getting JWT token..."
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "scope": "read"}' | jq -r '.token')

echo "✅ Token: ${TOKEN:0:30}..."

# Test 1: Exchange Rate Query
echo ""
echo "💱 Testing Exchange Rate Query..."
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "queryExchangeRate",
      "arguments": {
        "toCountry": "CN",
        "toCurrency": "CNY"
      }
    }
  }' | jq '.'

# Test 2: Money Transfer (Discovery)
echo ""
echo "💸 Testing Money Transfer (Discovery)..."
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "transferMoney",
      "arguments": {
        "callBackProvider": "voice"
      }
    }
  }' | jq '.'

# Test 3: Remittance Order Query
echo ""
echo "📋 Testing Remittance Order Query..."
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "remittanceOrderQuery",
      "arguments": {
        "transferMode": "BANK_TRANSFER",
        "country": "IN",
        "orderCount": 5
      }
    }
  }' | jq '.'

echo ""
echo "🎉 All tests completed!"
```

## 🎯 Testing Tips

### 1. **Progressive Testing**
- Start with simple queries (exchange rates)
- Move to complex workflows (money transfers)
- Test error scenarios (invalid parameters)

### 2. **Realistic Scenarios**
- Use actual country codes (CN, US, IN, etc.)
- Test with realistic amounts (100, 500, 1000 AED)
- Include both discovery and execution phases

### 3. **Error Handling**
- Test with invalid country codes
- Try unsupported currency combinations
- Test with missing required parameters

### 4. **Callback Testing**
- Test both voice and text callbacks
- Verify callback URLs are included
- Check payment link generation

### 5. **Authentication Testing**
- Test without JWT token (should fail)
- Test with expired token
- Test with invalid token format

## 🔍 Expected Behaviors

### Exchange Rate Tool
- ✅ Returns current rates for supported countries
- ✅ Includes currency icons and country names
- ✅ Handles invalid country/currency combinations
- ✅ Provides trace codes for tracking

### Money Transfer Tool
- ✅ Discovery phase shows available beneficiaries
- ✅ Execution phase processes the transfer
- ✅ Includes callback configuration
- ✅ Generates payment links
- ✅ Calculates fees and exchange rates

### Remittance Order Query Tool
- ✅ Returns transaction history
- ✅ Supports filtering by various criteria
- ✅ Shows transaction status and details
- ✅ Handles pagination with orderCount

## 🚨 Common Issues

### Authentication Errors
- **401 Unauthorized**: Missing or invalid JWT token
- **403 Forbidden**: Expired or malformed token

### Validation Errors
- **400 Bad Request**: Invalid parameters
- **Missing required fields**: Check parameter names

### Server Errors
- **500 Internal Server Error**: Check server logs
- **Connection refused**: Ensure server is running

This comprehensive testing approach ensures all MCP tools work correctly with realistic, verbose conversation scenarios!
