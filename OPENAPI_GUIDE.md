# OpenAPI Schema Documentation

This directory contains comprehensive OpenAPI 3.0 specifications for the Remittance API Server, providing detailed documentation for all endpoints, request/response schemas, and authentication methods.

## Files

- **`openapi.yaml`** - OpenAPI specification in YAML format (recommended)
- **`openapi.json`** - OpenAPI specification in JSON format
- **`validate-openapi.js`** - Script to validate the OpenAPI schemas

## Quick Start

### 1. Validate the Schema
```bash
npm run validate-openapi
```

### 2. View in Swagger UI
1. Go to [Swagger Editor](https://editor.swagger.io/)
2. Copy and paste the contents of `openapi.yaml`
3. Explore the interactive API documentation

### 3. Import into Postman
1. Open Postman
2. Click "Import"
3. Select the `openapi.json` file
4. All endpoints will be imported with proper request/response examples

## API Overview

### Base URL
- **Development**: `http://localhost:8070`
- **Production**: `https://api.remittance.com`

### Authentication
The API supports two authentication methods:
1. **Bearer Token**: JWT token in Authorization header
2. **Query Token**: JWT token as query parameter

### Core Endpoints

#### 🔐 Authentication
- `POST /auth/token` - Generate JWT authentication token

#### 💱 Exchange Rates
- `POST /api/exchange-rate` - Query exchange rates for currency pairs

#### 💸 Money Transfers
- `POST /api/transfer` - Two-stage money transfer process
  - Discovery stage: Get available beneficiaries and amounts
  - Execution stage: Process the actual transfer

#### 📋 Order Management
- `POST /api/orders` - Query remittance transaction history

#### 👥 Beneficiary Management
- `POST /api/beneficiaries` - Get user's saved beneficiaries

#### 🔔 Webhooks
- `POST /callback/remittance` - Payment status callbacks

#### 🧪 Testing
- `POST /test/complete-payment` - Test payment completion

## Request/Response Examples

### 1. Generate JWT Token
```bash
curl -X POST http://localhost:8070/auth/token \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "scope": "read"}'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "1h"
}
```

### 2. Query Exchange Rate
```bash
curl -X POST http://localhost:8070/api/exchange-rate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"toCountry": "CN", "toCurrency": "CNY"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "head": {
      "applyStatus": "SUCCESS",
      "code": "200",
      "msg": "OK",
      "traceCode": "TRC1705312200000ABC123"
    },
    "body": {
      "fromCountryCode": "AE",
      "fromCurrencyCode": "AED",
      "fromCurrencyIcon": "🇦🇪",
      "toCountryCode": "CN",
      "toCurrencyCode": "CNY",
      "toCurrencyIcon": "🇨🇳",
      "exchangeRate": 1.85
    }
  }
}
```

### 3. Transfer Money (Discovery)
```bash
curl -X POST http://localhost:8070/api/transfer \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "code": 200,
    "message": "Success",
    "beneficiaries": [
      {
        "id": 123,
        "title": "John Smith",
        "name": "John Smith",
        "currency": "CNY",
        "icon": "👤"
      }
    ],
    "sendAmounts": [
      {"id": 1, "amount": 1000},
      {"id": 2, "amount": 2000}
    ],
    "exchangeRate": {
      "fromAmount": {"currency": "AED", "amount": 1000},
      "rate": "1.85",
      "toAmount": {"currency": "CNY", "amount": 1850},
      "fee": {"currency": "AED", "amount": 10}
    }
  }
}
```

### 4. Transfer Money (Execution)
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

**Response:**
```json
{
  "success": true,
  "data": {
    "code": 200,
    "message": "Transfer initiated successfully",
    "orderNo": "1705312200000ABC123",
    "paymentLink": "botimapp://pay?token=pay_abc123&amount=1010.00",
    "transactionDetails": {
      "beneficiary": {
        "id": 123,
        "name": "John Smith",
        "currency": "CNY"
      },
      "sendAmount": 1000,
      "fee": 10,
      "totalAmount": 1010,
      "receivedAmount": 1850,
      "exchangeRate": 1.85
    }
  }
}
```

## Schema Features

### Comprehensive Documentation
- **Detailed descriptions** for all endpoints and parameters
- **Request/response examples** for every endpoint
- **Error response schemas** with proper HTTP status codes
- **Validation rules** with regex patterns and constraints

### Security Definitions
- **JWT Bearer authentication** for API access
- **Query parameter authentication** as alternative
- **Security requirements** clearly defined per endpoint

### Data Models
- **Beneficiary schema** with all banking details
- **Order schema** with transaction history
- **Exchange rate schema** with currency information
- **Error schemas** for consistent error handling

### Validation Rules
- **Country codes**: 2-character ISO 3166 format
- **Currency codes**: 3-character ISO 4217 format
- **Date formats**: YYYY-MM-DD for order dates
- **Amount validation**: Positive numbers with proper precision
- **Enum values**: Restricted to valid options

## Using the Schema

### Generate Client SDKs
```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate JavaScript client
openapi-generator-cli generate -i openapi.yaml -g javascript -o ./client-js

# Generate Python client
openapi-generator-cli generate -i openapi.yaml -g python -o ./client-python

# Generate Java client
openapi-generator-cli generate -i openapi.yaml -g java -o ./client-java
```

### API Testing
```bash
# Using curl with the schema
curl -X POST http://localhost:8070/api/exchange-rate \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8070/auth/token -d '{"userId":"test"}' | jq -r .token)" \
  -H "Content-Type: application/json" \
  -d '{"toCountry":"CN","toCurrency":"CNY"}'
```

### Documentation Generation
```bash
# Generate HTML documentation
npx redoc-cli build openapi.yaml

# Generate PDF documentation
npx redoc-cli build openapi.yaml --output api-docs.pdf
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Validation error",
  "message": "toCountry must be a 2-character ISO 3166 country code"
}
```

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid JWT)
- **403**: Forbidden (expired JWT)
- **404**: Not Found (resource not found)
- **500**: Internal Server Error

## Best Practices

1. **Always include JWT token** in requests to protected endpoints
2. **Validate input parameters** before making requests
3. **Handle error responses** appropriately in your client
4. **Use proper HTTP methods** as defined in the schema
5. **Follow the two-stage transfer process** for money transfers
6. **Implement webhook handling** for payment status updates

## Integration Examples

### JavaScript/Node.js
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8070',
  headers: { 'Content-Type': 'application/json' }
});

// Add JWT token to requests
api.interceptors.request.use(async (config) => {
  const token = await getJWTToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Query exchange rate
const exchangeRate = await api.post('/api/exchange-rate', {
  toCountry: 'CN',
  toCurrency: 'CNY'
});
```

### Python
```python
import requests

# Get JWT token
token_response = requests.post('http://localhost:8070/auth/token', 
                              json={'userId': 'test-user'})
token = token_response.json()['token']

# Query exchange rate
headers = {'Authorization': f'Bearer {token}'}
response = requests.post('http://localhost:8070/api/exchange-rate',
                        json={'toCountry': 'CN', 'toCurrency': 'CNY'},
                        headers=headers)
```

This OpenAPI schema provides a complete specification for integrating with the Remittance API Server, ensuring consistent and reliable API usage across different platforms and programming languages.
