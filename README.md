# Remittance MCP Server

A Model Context Protocol (MCP) server implementation for international remittance operations with JWT authentication.

## Features

- **Exchange Rate Queries**: Get real-time exchange rates for international transfers
- **Money Transfer**: Two-stage transfer process with beneficiary management
- **Order History**: Query and track remittance transaction history
- **JWT Authentication**: Secure API access with JWT tokens
- **RESTful API**: HTTP endpoints for integration
- **MCP Protocol**: Full MCP server implementation for AI assistants

## Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd remittance-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment configuration:
```bash
cp env.example .env
```

4. Update `.env` file with your configuration:
```env
JWT_SECRET=your-secret-key
PORT=8080
NODE_ENV=development
```

### Running the Server

#### As HTTP Server
```bash
npm start
```

#### As MCP Server
```bash
npm run start -- --mcp
```

#### Development Mode
```bash
npm run dev
```

## API Endpoints

### Authentication

#### Generate JWT Token
```bash
POST /auth/token
Content-Type: application/json

{
  "userId": "agent1",
  "scope": "read"
}
```

#### Health Check
```bash
GET /actuator/health
```

### MCP Messages
```bash
POST /mcp/messages
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "method": "queryExchangeRate",
  "params": {
    "toCountry": "CN",
    "toCurrency": "CNY"
  }
}
```

## Available Tools

### 1. queryExchangeRate

Retrieve current exchange rates for international remittance transactions.

**Parameters:**
- `toCountry` (string, required): Destination country code (ISO 3166)
- `toCurrency` (string, required): Destination currency code (ISO 4217)

**Example:**
```json
{
  "method": "queryExchangeRate",
  "params": {
    "toCountry": "CN",
    "toCurrency": "CNY"
  }
}
```

### 2. transferMoney

Execute international money transfers with beneficiary validation and payment processing.

**Two-Stage Process:**
1. **Discovery Stage**: Call without parameters to get available beneficiaries
2. **Execution Stage**: Call with selected beneficiary and amount

**Parameters:**
- `beneficiaryId` (string, optional): Beneficiary ID from discovery call
- `beneficiaryName` (string, optional): Beneficiary name for identification
- `sendAmount` (number, optional): Amount to send in AED
- `callBackProvider` (string, optional): Callback provider type ('voice' or 'text')

**Example Discovery:**
```json
{
  "method": "transferMoney",
  "params": {}
}
```

**Example Execution:**
```json
{
  "method": "transferMoney",
  "params": {
    "beneficiaryId": "123",
    "beneficiaryName": "John Smith",
    "sendAmount": 1000,
    "callBackProvider": "voice"
  }
}
```

### 3. remittanceOrderQuery

Query and retrieve remittance transaction history and status.

**Parameters:**
- `transferMode` (string, optional): Filter by transfer mode
- `country` (string, optional): Filter by destination country
- `currency` (string, optional): Filter by destination currency
- `orderDate` (string, optional): Filter by order creation date (YYYY-MM-DD)
- `orderCount` (number, optional): Maximum number of orders to return (1-50, default: 10)

**Example:**
```json
{
  "method": "remittanceOrderQuery",
  "params": {
    "country": "CN",
    "currency": "CNY",
    "orderCount": 5
  }
}
```

## JWT Authentication

### Token Generation

#### Using jwt-cli (Recommended)
```bash
# Install jwt-cli
brew install mike-engel/jwt/jwt-cli

# Generate token
echo '{"sub":"agent1","scope":"read"}' | \
jwt encode --alg HS256 --secret "kX8jBUle1vefPPoGrG58ZDDU+f+l9PBJUPWoqT3xgEE="
```

#### Using Node.js
```javascript
const jwt = require('jsonwebtoken');
const secret = 'kX8jBUle1vefPPoGrG58ZDDU+f+l9PBJUPWoqT3xgEE=';

const token = jwt.sign(
  { sub: 'agent1', scope: 'read' },
  secret,
  { algorithm: 'HS256', expiresIn: '1h' }
);
```

### Using Tokens

#### Authorization Header (Recommended)
```bash
curl -H "Authorization: Bearer <your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}' \
     http://localhost:8080/mcp/messages
```

#### URL Parameter (Alternative)
```bash
curl "http://localhost:8080/mcp/messages?token=<your-jwt-token>" \
     -H "Content-Type: application/json" \
     -d '{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}'
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing secret | `kX8jBUle1vefPPoGrG58ZDDU+f+l9PBJUPWoqT3xgEE=` |
| `JWT_EXPIRES_IN` | Token expiration time | `1h` |
| `PORT` | Server port | `8080` |
| `NODE_ENV` | Environment | `development` |
| `CALLBACK_VOICE_URL` | Voice callback URL | `http://localhost:8080/voice/` |
| `CALLBACK_VOICE_TOKEN` | Voice callback token | `yourVoiceToken` |
| `CALLBACK_TEXT_URL` | Text callback URL | `http://localhost:8080/text/` |
| `CALLBACK_TEXT_TOKEN` | Text callback token | `yourTextToken` |

## Error Handling

All API responses follow a consistent format:

### Success Response
```json
{
  "code": 0,
  "content": "{\"head\":{\"applyStatus\":\"SUCCESS\",\"code\":\"200\",\"msg\":\"OK\"},\"body\":{...}}"
}
```

### Error Response
```json
{
  "code": 1,
  "content": "Error message describing what went wrong"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing or invalid JWT token |
| 403 | Forbidden - Token expired or malformed |
| 500 | Internal Server Error |
| 602 | No orders found |
| 607 | Amount exceeded limit |
| 608 | Beneficiary not found |
| 610 | KYC required |

## Callback Handling

The server supports callback notifications for payment status updates:

```bash
POST /callback/remittance
Content-Type: application/json

{
  "notifyEvent": "remittance_pay_status",
  "data": {
    "orderNo": "1234567890",
    "status": "Paid",
    "content": "Payment successful!",
    "linkTitle": "Order details",
    "linkUrl": "https://example.com/bill/1234567890"
  }
}
```

## Development

### Project Structure

```
src/
├── server.js              # Main server implementation
├── tools/                 # MCP tool implementations
│   ├── queryExchangeRate.js
│   ├── transferMoney.js
│   └── remittanceOrderQuery.js
└── utils/                 # Utility functions
    ├── jwt.js            # JWT token utilities
    └── validation.js     # Input validation
```

### Testing

```bash
# Run tests
npm test

# Test specific tool
node src/tools/queryExchangeRate.js
```

### Adding New Tools

1. Create a new file in `src/tools/`
2. Implement the tool function following the existing pattern
3. Add the tool to the server's tool list in `src/server.js`
4. Update this README with tool documentation

## Security Considerations

- JWT tokens should be kept secure and not logged
- Use HTTPS in production
- Implement rate limiting for production use
- Validate all input parameters
- Use environment variables for sensitive configuration

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please create an issue in the repository.
