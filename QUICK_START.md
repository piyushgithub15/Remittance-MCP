# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate a JWT Token
```bash
node scripts/generate-token.js
```

### 3. Start the Server
```bash
# HTTP Server Mode (for API testing)
npm start

# OR MCP Server Mode (for MCP clients)
npm run start -- --mcp

# OR Development Mode (with auto-restart)
npm run dev
```

## 🧪 Test the API

### Using cURL
```bash
# Get a token first
TOKEN=$(node scripts/generate-token.js 2>/dev/null | grep -A1 "Generated Token:" | tail -1)

# Test exchange rate query
curl -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}' \
     http://localhost:8080/mcp/messages
```

### Using the Test Script
```bash
node scripts/test-api.js
```

## 📋 Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `queryExchangeRate` | Get exchange rates | `{"toCountry":"CN","toCurrency":"CNY"}` |
| `transferMoney` | Send money (2-stage) | `{"beneficiaryName":"John","sendAmount":1000}` |
| `remittanceOrderQuery` | Query order history | `{"country":"CN","orderCount":5}` |

## 🔧 Configuration

Copy and edit the environment file:
```bash
cp env.example .env
```

Key settings:
- `JWT_SECRET`: Your JWT signing secret
- `PORT`: Server port (default: 8080)
- `CALLBACK_*`: Callback URLs for payment notifications

## 📚 Full Documentation

See [README.md](README.md) for complete documentation.

## 🆘 Need Help?

- Check the logs for error messages
- Verify your JWT token is valid and not expired
- Ensure all required parameters are provided
- Check the API response for specific error codes
