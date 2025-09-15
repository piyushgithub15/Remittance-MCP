# Testing Guide for Remittance MCP Server

## 🧪 How to Test Authentication and Features

### 1. Quick Start Testing

```bash
# Start the server
npm start

# Run the demo (shows all features)
node scripts/test-demo.js

# Run comprehensive tests
node scripts/test-comprehensive.js
```

### 2. Manual Testing with cURL

#### Generate a JWT Token
```bash
curl -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","scope":"read"}'
```

#### Test Exchange Rate Query
```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","scope":"read"}' | jq -r '.token')

# Query exchange rate
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}'
```

#### Test Transfer Money (Discovery)
```bash
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"transferMoney","params":{}}'
```

#### Test Transfer Money (Execution)
```bash
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"transferMoney","params":{"beneficiaryId":"123","beneficiaryName":"John Smith","sendAmount":1000,"callBackProvider":"voice"}}'
```

#### Test Order Query
```bash
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"remittanceOrderQuery","params":{"country":"CN","orderCount":5}}'
```

### 3. Authentication Testing

#### Test Valid Token
```bash
# Should return 200 with data
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}'
```

#### Test Invalid Token
```bash
# Should return 403 Forbidden
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}'
```

#### Test No Token
```bash
# Should return 401 Unauthorized
curl -X POST http://localhost:8080/mcp/messages \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}'
```

#### Test URL Parameter Token
```bash
# Should work with token in URL
curl -X POST "http://localhost:8080/mcp/messages?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}'
```

### 4. Error Handling Testing

#### Test Missing Parameters
```bash
# Should return validation error
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"CN"}}'
```

#### Test Invalid Country/Currency
```bash
# Should return business error
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"queryExchangeRate","params":{"toCountry":"XX","toCurrency":"XXX"}}'
```

#### Test Unknown Method
```bash
# Should return 400 Bad Request
curl -X POST http://localhost:8080/mcp/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method":"unknownMethod","params":{}}'
```

### 5. MCP Inspector Testing

```bash
# Start MCP Inspector
npm run inspect

# Open browser to http://localhost:6274
# Use the provided token to authenticate
```

### 6. Expected Responses

#### Success Response Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"head\":{\"applyStatus\":\"SUCCESS\",\"code\":\"200\",\"msg\":\"OK\"},\"body\":{...}}"
    }
  ],
  "isError": false
}
```

#### Error Response Format
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message describing what went wrong"
    }
  ],
  "isError": true
}
```

#### HTTP Error Responses
```json
{
  "timestamp": "2024-01-15T10:30:00.000+00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "JWT token is missing or invalid",
  "path": "/mcp/messages"
}
```

### 7. Test Scenarios

#### Exchange Rate Tests
- ✅ Valid country/currency combinations
- ✅ Invalid country/currency combinations
- ✅ Missing required parameters
- ✅ Unsupported country/currency

#### Transfer Money Tests
- ✅ Discovery stage (no parameters)
- ✅ Execution stage (with parameters)
- ✅ Missing required parameters
- ✅ High amount (KYC required)
- ✅ Invalid beneficiary

#### Order Query Tests
- ✅ Default query (all orders)
- ✅ Filter by country
- ✅ Filter by currency
- ✅ Filter by date
- ✅ Invalid order count limits

#### Authentication Tests
- ✅ Valid JWT token
- ✅ Invalid JWT token
- ✅ Expired JWT token
- ✅ Missing token
- ✅ URL parameter token

### 8. Performance Testing

```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:8080/mcp/messages \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}' &
done
wait
```

### 9. Debugging

#### Check Server Logs
```bash
# Server logs are printed to console
npm start

# Or check with PM2 if using
pm2 logs remittance-mcp-server
```

#### Validate JWT Token
```bash
# Decode token to check contents
node -e "console.log(JSON.stringify(JSON.parse(Buffer.from('$TOKEN'.split('.')[1], 'base64').toString()), null, 2))"
```

#### Test Health Endpoint
```bash
curl http://localhost:8080/actuator/health
```

### 10. Integration Testing

#### With MCP Client
```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['src/index.js']
});

const client = new Client({
  name: 'remittance-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools.tools.map(t => t.name));

// Call a tool
const result = await client.callTool({
  name: 'queryExchangeRate',
  arguments: { toCountry: 'CN', toCurrency: 'CNY' }
});
console.log('Result:', result);
```

This testing guide covers all aspects of the Remittance MCP Server, from basic functionality to advanced integration scenarios.
