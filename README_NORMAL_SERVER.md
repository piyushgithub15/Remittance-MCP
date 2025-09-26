# Remittance API Server (Normal Express.js)

This is a normal Express.js API server for remittance operations, converted from the MCP (Model Context Protocol) version.

## Features

- **RESTful API endpoints** for remittance operations
- **JWT authentication** for secure access
- **MongoDB integration** for data persistence
- **Input validation** using Zod schemas
- **Error handling** with proper HTTP status codes
- **CORS and security** middleware

## API Endpoints

### Authentication
- `POST /auth/token` - Generate JWT token for testing

### Core APIs
- `POST /api/exchange-rate` - Query exchange rates
- `POST /api/transfer` - Transfer money (two-stage process)
- `POST /api/orders` - Query remittance orders
- `POST /api/beneficiaries` - Get user's beneficiaries

### Utility Endpoints
- `GET /actuator/health` - Health check
- `POST /callback/remittance` - Payment status callbacks
- `POST /test/complete-payment` - Test payment completion

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your MongoDB connection string and JWT secret
   ```

3. **Start the server:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

4. **Test the server:**
   ```bash
   node test-normal-server.js
   ```

## API Usage Examples

### 1. Generate JWT Token
```bash
curl -X POST http://localhost:8070/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "scope": "read"}'
```

### 2. Query Exchange Rate
```bash
curl -X POST http://localhost:8070/api/exchange-rate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toCountry": "CN", "toCurrency": "CNY"}'
```

### 3. Get Beneficiaries
```bash
curl -X POST http://localhost:8070/api/beneficiaries \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"country": "CN", "limit": 10}'
```

### 4. Transfer Money (Discovery Stage)
```bash
curl -X POST http://localhost:8070/api/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 5. Transfer Money (Execution Stage)
```bash
curl -X POST http://localhost:8070/api/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "123",
    "beneficiaryName": "John Smith",
    "sendAmount": 1000,
    "callBackProvider": "voice"
  }'
```

### 6. Query Orders
```bash
curl -X POST http://localhost:8070/api/orders \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"country": "CN", "orderCount": 10}'
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Actual response data
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Environment Variables

```env
PORT=8070
MONGODB_URI=mongodb://localhost:27017/remittance
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
CALLBACK_VOICE_URL=http://localhost:8080/voice/
CALLBACK_VOICE_TOKEN=yourVoiceToken
CALLBACK_TEXT_URL=http://localhost:8080/text/
CALLBACK_TEXT_TOKEN=yourTextToken
```

## Differences from MCP Version

1. **No MCP dependencies** - Removed `@modelcontextprotocol/sdk`
2. **RESTful endpoints** - Direct HTTP API instead of MCP tools
3. **Simplified validation** - Using Zod instead of Joi
4. **Standard Express.js** - No MCP-specific middleware or handlers
5. **Direct JSON responses** - No MCP content format wrapping

## Development

- **Main entry point:** `src/main.js`
- **Express app:** `src/app.js`
- **Tool implementations:** `src/tools/`
- **Database models:** `src/models/`
- **Utilities:** `src/utils/`

## Testing

Run the test script to verify all endpoints:
```bash
node test-normal-server.js
```

Make sure the server is running before executing tests.
