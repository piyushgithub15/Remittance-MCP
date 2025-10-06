import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

// Import tool implementations
import { queryExchangeRate } from './tools/queryExchangeRate.js';
import { transferMoney } from './tools/transferMoney.js';
import { getBeneficiaries } from './tools/getBeneficiaries.js';
import { transactionQuery } from './tools/transactionQuery.js';
import { refreshStatus } from './tools/refreshStatus.js';
import { generateJWTToken } from './utils/jwt.js';
import { connectDatabase } from './config/database.js';
import { seedAllData } from './utils/seedData.js';
import RemittanceOrder from './models/RemittanceOrder.js';
import { 
  transferMoneySchema, 
  queryExchangeRateSchema, 
  getBeneficiariesSchema,
  validateWithZod,
  createErrorResponse 
} from './utils/validation.js';
import { transactionQuerySchema } from './tools/transactionQuery.js';
import { refreshStatusSchema } from './tools/refreshStatus.js';

const app = express();
const PORT = process.env.PORT || 8070;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  // Also check for token in URL parameter
  const urlToken = req.query.token;
  const finalToken = token || urlToken;

  if (!finalToken) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'JWT token is missing or invalid',
      path: req.path
    });
  }

  jwt.verify(finalToken, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        error: 'Forbidden',
        message: 'JWT token has expired or is malformed',
        path: req.path
      });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint (public)
app.get('/actuator/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// JWT token generation endpoint (for testing)
app.post('/auth/token', (req, res) => {
  const { userId = 'agent1', scope = 'read' } = req.body;
  const token = generateJWTToken(userId, scope);
  res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
});

// Global variable to store the MCP server instance
let mcpServerInstance = null;
let streamableTransport = null;

// MCP Server implementation
class RemittanceMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'remittance-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'queryExchangeRate',
            description: 'Retrieve current exchange rates for international remittance transactions',
            inputSchema: {
              type: 'object',
              properties: {
                toCountry: {
                  type: 'string',
                  description: 'Destination country code (ISO 3166, e.g., CN for China, US for USA)',
                },
                toCurrency: {
                  type: 'string',
                  description: 'Destination currency code (ISO 4217, e.g., CNY for Chinese Yuan, USD for US Dollar)',
                },
              },
              required: ['toCountry', 'toCurrency'],
            },
          },
          {
            name: 'transferMoney',
            description: 'Execute international money transfers with beneficiary validation and payment processing',
            inputSchema: {
              type: 'object',
              properties: {
                beneficiaryId: {
                  type: 'string',
                  pattern: '^[0-9]+$',
                  description: 'Beneficiary ID from discovery call (e.g., 123). Must be a numeric string.',
                },
                beneficiaryName: {
                  type: 'string',
                  description: 'Beneficiary name for identification (e.g., John Smith, wife). Leave null for discovery stage',
                },
                sendAmount: {
                  type: 'number',
                  description: 'Amount to send in AED (e.g., 1000.50). Leave null for discovery stage',
                },
                callBackProvider: {
                  type: 'string',
                  enum: ['text','voice'],
                  description: 'Callback provider type: text for text confirmation (default: text)',
                },
                lastFourDigits: {
                  type: 'string',
                  pattern: '^\\d{4}$',
                  description: 'Last 4 digits of Emirates ID (e.g., 1234)',
                },
                expiryDate: {
                  type: 'string',
                  pattern: '^\\d{2}/\\d{2}/\\d{4}$',
                  description: 'Expiry date in DD/MM/YYYY format (e.g., 25/12/2025)',
                },
              },
              required: ['lastFourDigits', 'expiryDate','beneficiaryId','beneficiaryName','sendAmount'],
            },
          },
          {
            name: 'getBeneficiaries',
            description: 'Retrieve user\'s saved beneficiaries with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                country: {
                  type: 'string',
                  description: 'Filter by destination country (ISO 3166 code, e.g., CN for China, IN for India)',
                },
                currency: {
                  type: 'string',
                  description: 'Filter by currency (ISO 4217 code, e.g., CNY, INR, USD)',
                },
                transferMode: {
                  type: 'string',
                  enum: ['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI'],
                  description: 'Filter by transfer mode',
                },
                isActive: {
                  type: 'boolean',
                  description: 'Filter by active status (default: true)',
                },
                limit: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 100,
                  description: 'Maximum number of beneficiaries to return (1-100, default: 50)',
                },
                lastFourDigits: {
                  type: 'string',
                  pattern: '^\\d{4}$',
                  description: 'Last 4 digits of Emirates ID (e.g., 1234)',
                },
                expiryDate: {
                  type: 'string',
                  pattern: '^\\d{2}/\\d{2}/\\d{4}$',
                  description: 'Expiry date in DD/MM/YYYY format (e.g., 25/12/2025)',
                },
              },
              required: ['lastFourDigits', 'expiryDate'],
            },
          },
          {
            name: 'transactionQuery',
            description: 'Query transaction history or check specific transaction timeframe and delays. If orderNo is provided, returns specific order details. Otherwise returns filtered list of orders.',
            inputSchema: {
              type: 'object',
              properties: {
                orderNo: {
                  type: 'string',
                  description: 'Order number for specific order check',
                },
                transferMode: {
                  type: 'string',
                  enum: ['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI'],
                  description: 'Filter by transfer mode',
                },
                country: {
                  type: 'string',
                  description: 'Filter by destination country (2-character ISO code)',
                },
                currency: {
                  type: 'string',
                  description: 'Filter by destination currency (3-character ISO code)',
                },
                orderDate: {
                  type: 'string',
                  format: 'date',
                  description: 'Filter by order creation date (YYYY-MM-DD)',
                },
                orderCount: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 50,
                  description: 'Maximum number of orders to return',
                },
                includeDelayInfo: {
                  type: 'boolean',
                  description: 'Include delay information',
                },
                lastFourDigits: {
                  type: 'string',
                  pattern: '^\\d{4}$',
                  description: 'Last 4 digits of Emirates ID (e.g., 1234)',
                },
                expiryDate: {
                  type: 'string',
                  pattern: '^\\d{2}/\\d{2}/\\d{4}$',
                  description: 'Expiry date in DD/MM/YYYY format (e.g., 25/12/2025)',
                },
              },
              required: ['lastFourDigits', 'expiryDate'],
            },
          },
          {
            name: 'refreshStatus',
            description: 'Refresh transaction status by updating status with actual_status. Used when a user complains about a completed transaction to reveal the true status (SUCCESS or FAILED).',
            inputSchema: {
              type: 'object',
              properties: {
                orderNo: {
                  type: 'string',
                  description: 'Order number to refresh status for',
                },
                lastFourDigits: {
                  type: 'string',
                  pattern: '^\\d{4}$',
                  description: 'Last 4 digits of Emirates ID (e.g., 1234)',
                },
                expiryDate: {
                  type: 'string',
                  pattern: '^\\d{2}/\\d{2}/\\d{4}$',
                  description: 'Expiry date in DD/MM/YYYY format (e.g., 25/12/2025)',
                },
              },
              required: ['orderNo', 'lastFourDigits', 'expiryDate'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'queryExchangeRate':
            // Validate using Zod schema
            const exchangeValidation = validateWithZod(queryExchangeRateSchema, args);
            if (!exchangeValidation.success) {
              return createErrorResponse(exchangeValidation.error);
            }
            
            return await queryExchangeRate(exchangeValidation.data);
          case 'transferMoney':
            // Validate using Zod schema
            const transferValidation = validateWithZod(transferMoneySchema, args);
            if (!transferValidation.success) {
              return createErrorResponse(transferValidation.error);
            }
            
            return await transferMoney(transferValidation.data);
          case 'getBeneficiaries':
            // Validate using Zod schema
            const beneficiariesValidation = validateWithZod(getBeneficiariesSchema, args);
            if (!beneficiariesValidation.success) {
              return createErrorResponse(beneficiariesValidation.error);
            }
            
            return await getBeneficiaries(beneficiariesValidation.data);
          case 'transactionQuery':
            // Validate using Zod schema
            const transactionValidation = validateWithZod(transactionQuerySchema, args);
            if (!transactionValidation.success) {
              return createErrorResponse(transactionValidation.error);
            }
            
            return await transactionQuery(transactionValidation.data);
          case 'refreshStatus':
            // Validate using Zod schema
            const refreshValidation = validateWithZod(refreshStatusSchema, args);
            if (!refreshValidation.success) {
              return createErrorResponse(refreshValidation.error);
            }
            
            return await refreshStatus(refreshValidation.data);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Tool ${name} failed`);
        return {
          content: [
            {
              type: 'text',
              text: 'Tool execution failed',
            },
          ],
          isError: true,
        };
      }
    });
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    // Set up MCP endpoints
    this.setupMCPEndpoints();
    
    console.error('Remittance MCP Server running on StreamableHTTP transport');
    return this;
  }

  setupMCPEndpoints() {
    // MCP StreamableHTTP endpoint - Stateless mode with JWT authentication
    app.post('/mcp', authenticateToken, async (req, res) => {
      try {
        // Create a new transport instance for each request (stateless)
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined, // Stateless mode
          enableJsonResponse: true // Enable JSON responses for simple request/response
        });

        // Connect the server to this transport instance
        await this.server.connect(transport);
        
        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('MCP request error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // MCP SSE endpoint - Stateful mode for streaming with JWT authentication
    app.get('/mcp/sse', authenticateToken, async (req, res) => {
      try {
        // Create a new transport instance for SSE streaming
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => require('crypto').randomUUID(), // Stateful mode for SSE
          enableJsonResponse: false // Use SSE streaming
        });

        // Connect the server to this transport instance
        await this.server.connect(transport);
        
        // Handle the SSE request
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error('MCP SSE error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // MCP DELETE endpoint for session cleanup
    app.delete('/mcp/session/:sessionId', async (req, res) => {
      try {
        const { sessionId } = req.params;
        // In stateless mode, we don't maintain sessions, so just return success
        res.status(200).json({ message: 'Session closed', sessionId });
      } catch (error) {
        console.error('MCP session delete error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  }
}

// Express routes for HTTP API
app.post('/mcp/messages', authenticateToken, async (req, res) => {
  try {
    const { method, params } = req.body;
    
    let result;
    switch (method) {
      case 'queryExchangeRate':
        // Validate using Zod schema
        const exchangeValidation = validateWithZod(queryExchangeRateSchema, params);
        if (!exchangeValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Invalid input: ${exchangeValidation.error}`
          });
        }
        result = await queryExchangeRate(exchangeValidation.data);
        break;
      case 'transferMoney':
        // Validate using Zod schema
        const transferValidation = validateWithZod(transferMoneySchema, params);
        if (!transferValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Invalid input: ${transferValidation.error}`
          });
        }
        result = await transferMoney(transferValidation.data);
        break;
      case 'getBeneficiaries':
        // Validate using Zod schema
        const beneficiariesValidation = validateWithZod(getBeneficiariesSchema, params);
        if (!beneficiariesValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Invalid input: ${beneficiariesValidation.error}`
          });
        }
        result = await getBeneficiaries(beneficiariesValidation.data);
        break;
      case 'transactionQuery':
        // Validate using Zod schema
        const transactionValidation = validateWithZod(transactionQuerySchema, params);
        if (!transactionValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Invalid input: ${transactionValidation.error}`
          });
        }
        result = await transactionQuery(transactionValidation.data);
        break;
      case 'refreshStatus':
        // Validate using Zod schema
        const refreshValidation = validateWithZod(refreshStatusSchema, params);
        if (!refreshValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Invalid input: ${refreshValidation.error}`
          });
        }
        result = await refreshStatus(refreshValidation.data);
        break;
      default:
        return res.status(400).json({
          code: 1,
          content: `Unknown method: ${method}`
        });
    }

    res.json(result);
  } catch (error) {
    console.error('MCP message failed');
    res.status(500).json({
      code: 1,
      content: 'Internal server error'
    });
  }
});

// Callback endpoint for remittance status updates
app.post('/callback/remittance', async (req, res) => {
  try {
    const { notifyEvent, data } = req.body;
    
    if (notifyEvent === 'remittance_pay_status') {
      console.log('Remittance payment status update:', data);
      
      // Import the updateOrderStatus function
      const { updateOrderStatus } = await import('./tools/transferMoney.js');
      
      // Update order status based on payment result
      if (data.orderNo && data.status) {
        const updatedOrder = await updateOrderStatus(
          data.orderNo, 
          data.status, 
          data.failReason
        );
        
        if (updatedOrder) {
          console.log(`Order ${data.orderNo} status updated to ${data.status}`);
        } else {
          console.log(`Failed to update order ${data.orderNo}`);
        }
      }
    }
    
    res.json({ status: 'received' });
  } catch (error) {
    console.error('Error processing remittance callback:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// REST API endpoints for all tools
app.post('/api/query-exchange-rate', authenticateToken, async (req, res) => {
  try {
    const { toCountry, toCurrency } = req.body;
    const result = await queryExchangeRate({ toCountry, toCurrency });
    res.json(result);
  } catch (error) {
    console.error('Query exchange rate failed');
    res.status(500).json({ error: 'Query failed' });
  }
});

app.post('/api/transfer-money', authenticateToken, async (req, res) => {
  try {
    const { beneficiaryId, beneficiaryName, sendAmount, callBackProvider, lastFourDigits, expiryDate } = req.body;
    const result = await transferMoney({ beneficiaryId, beneficiaryName, sendAmount, callBackProvider, lastFourDigits, expiryDate });
    res.json(result);
  } catch (error) {
    console.error('Transfer money failed');
    res.status(500).json({ error: 'Transfer failed' });
  }
});

app.post('/api/get-beneficiaries', authenticateToken, async (req, res) => {
  try {
    const { country, currency, transferMode, isActive, limit, lastFourDigits, expiryDate } = req.body;
    const result = await getBeneficiaries({ country, currency, transferMode, isActive, limit, lastFourDigits, expiryDate });
    res.json(result);
  } catch (error) {
    console.error('Get beneficiaries failed');
    res.status(500).json({ error: 'Query failed' });
  }
});

app.post('/api/transaction-query', authenticateToken, async (req, res) => {
  try {
    const { orderNo, transferMode, country, currency, orderDate, orderCount, includeDelayInfo, lastFourDigits, expiryDate } = req.body;
    const result = await transactionQuery({ orderNo, transferMode, country, currency, orderDate, orderCount, includeDelayInfo, lastFourDigits, expiryDate });
    res.json(result);
  } catch (error) {
    console.error('Transaction query failed');
    res.status(500).json({ error: 'Query failed' });
  }
});

app.post('/api/refresh-status', authenticateToken, async (req, res) => {
  try {
    const { orderNo, lastFourDigits, expiryDate } = req.body;
    const result = await refreshStatus({ orderNo, lastFourDigits, expiryDate });
    res.json(result);
  } catch (error) {
    console.error('Refresh status failed');
    res.status(500).json({ error: 'Refresh failed' });
  }
});

// Test endpoint to simulate payment completion
app.post('/test/complete-payment', async (req, res) => {
  try {
    const { orderNo, status = 'COMPLETED', actualStatus = 'SUCCESS', failReason = null } = req.body;
    
    if (!orderNo) {
      return res.status(400).json({ error: 'orderNo is required' });
    }
    
    // Import the updateOrderStatus function
    const { updateOrderStatus } = await import('./tools/transferMoney.js');
    
    // First set to COMPLETED status
    const updatedOrder = await updateOrderStatus(orderNo, status, failReason);
    
    if (updatedOrder) {
      // If we want to set a specific actual_status, update it directly
      if (actualStatus && actualStatus !== 'SUCCESS') {
        await RemittanceOrder.findOneAndUpdate(
          { orderNo },
          { actual_status: actualStatus }
        );
      }
      
      const finalOrder = await RemittanceOrder.findOne({ orderNo });
      
      res.json({ 
        success: true, 
        message: `Order ${orderNo} status updated to ${status} with actual_status ${finalOrder.actual_status}`,
        order: {
          orderNo: finalOrder.orderNo,
          status: finalOrder.status,
          actual_status: finalOrder.actual_status,
          fromAmount: finalOrder.fromAmount,
          feeAmount: finalOrder.feeAmount,
          totalPayAmount: finalOrder.totalPayAmount
        }
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: `Order ${orderNo} not found` 
      });
    }
  } catch (error) {
    console.error('Payment completion failed');
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error');
  res.status(500).json({
    error: 'Internal Server Error'
  });
});

// Function to start Express server
function startExpressServer() {
  app.listen(PORT, () => {
    console.log(`Remittance MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/actuator/health`);
    console.log(`Token generation: POST http://localhost:${PORT}/auth/token`);
    console.log(`MCP messages: POST http://localhost:${PORT}/mcp/messages`);
    console.log(`REST APIs:`);
    console.log(`  Query Exchange Rate: POST http://localhost:${PORT}/api/query-exchange-rate`);
    console.log(`  Transfer Money: POST http://localhost:${PORT}/api/transfer-money`);
    console.log(`  Get Beneficiaries: POST http://localhost:${PORT}/api/get-beneficiaries`);
    console.log(`  Transaction Query: POST http://localhost:${PORT}/api/transaction-query`);
    console.log(`  Refresh Status: POST http://localhost:${PORT}/api/refresh-status`);
  });
}

// Only start servers if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Start MCP server if running in MCP mode
  if (process.argv.includes('--mcp')) {
    const mcpServer = new RemittanceMCPServer();
    mcpServer.run().catch(console.error);
  } else {
    // Start Express server with MCP integration
    startExpressServerWithMCP();
  }
}

// Function to start Express server with MCP integration
async function startExpressServerWithMCP() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // // Seed initial data
    // await seedAllData();
    
    // Create and start MCP server
    mcpServerInstance = new RemittanceMCPServer();
    await mcpServerInstance.run();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Remittance MCP Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/actuator/health`);
      console.log(`Token generation: POST http://localhost:${PORT}/auth/token`);
      console.log(`MCP messages: POST http://localhost:${PORT}/mcp/messages`);
      console.log(`MCP StreamableHTTP (Stateless): POST http://localhost:${PORT}/mcp`);
      console.log(`MCP SSE (Stateful): GET http://localhost:${PORT}/mcp/sse`);
      console.log(`MCP Session Delete: DELETE http://localhost:${PORT}/mcp/session/:sessionId`);
      console.log(`REST APIs:`);
      console.log(`  Query Exchange Rate: POST http://localhost:${PORT}/api/query-exchange-rate`);
      console.log(`  Transfer Money: POST http://localhost:${PORT}/api/transfer-money`);
      console.log(`  Get Beneficiaries: POST http://localhost:${PORT}/api/get-beneficiaries`);
      console.log(`  Transaction Query: POST http://localhost:${PORT}/api/transaction-query`);
      console.log(`  Refresh Status: POST http://localhost:${PORT}/api/refresh-status`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { RemittanceMCPServer };
