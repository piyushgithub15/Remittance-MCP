# Remittance MCP Server

A Model Context Protocol (MCP) server for handling international remittance transactions with AI agent capabilities.

## Features

- **Transaction Management**: Create, query, and track remittance orders
- **Exchange Rate Queries**: Get real-time exchange rates
- **Beneficiary Management**: Manage recipient information
- **Identity Verification**: Emirates ID verification for security
- **Transaction Timeframe**: Handle delays and provide expected arrival times
- **Dispute Resolution**: Handle completed transaction disputes
- **Email Notifications**: Send bank details submission links

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. Start the server:
```bash
npm start
```

## MCP Tools

- `queryExchangeRate` - Get exchange rates
- `transferMoney` - Execute money transfers
- `remittanceOrderQuery` - Query transaction history
- `getBeneficiaries` - Manage beneficiaries
- `verifyIdentity` - Verify Emirates ID
- `getTransactionTimeframe` - Check transaction timing
- `handleDelayedTransaction` - Handle delays
- `checkTransactionStatus` - Verify backend status
- `sendCustomerEmail` - Send notifications
- `handleCompletedTransactionDispute` - Resolve disputes

## API Endpoints

- **MCP Protocol**: `POST /mcp`
- **HTTP API**: `POST /mcp/messages`
- **SSE Streaming**: `GET /mcp/sse`
- **Health Check**: `GET /actuator/health`
- **Token Generation**: `POST /auth/token`

## Configuration

The server uses MongoDB for data storage and JWT for authentication. Configure these in your `.env` file.
