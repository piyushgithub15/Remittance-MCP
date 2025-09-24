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
import { remittanceOrderQuery } from './tools/remittanceOrderQuery.js';
import { getBeneficiaries } from './tools/getBeneficiaries.js';
import { generateJWTToken } from './utils/jwt.js';
import { connectDatabase } from './config/database.js';
import { seedAllData } from './utils/seedData.js';
import { 
  transferMoneySchema, 
  queryExchangeRateSchema, 
  remittanceOrderQuerySchema, 
  getBeneficiariesSchema,
  validateWithZod,
  createErrorResponse 
} from './utils/validation.js';

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
                  enum: ['voice', 'text'],
                  description: 'Callback provider type: voice for voice confirmation or text for text confirmation (default: voice)',
                },
              },
              required: ['beneficiaryId', 'beneficiaryName', 'sendAmount'],
            },
          },
          {
            name: 'remittanceOrderQuery',
            description: 'Query and retrieve remittance transaction history and status for a user',
            inputSchema: {
              type: 'object',
              properties: {
                transferMode: {
                  type: 'string',
                  description: 'Filter by transfer mode (e.g., BANK_TRANSFER, CASH_PICK_UP, MOBILE_WALLET, UPI)',
                },
                country: {
                  type: 'string',
                  description: 'Filter by destination country (ISO 3166 code, e.g., CN for China, IN for India)',
                },
                currency: {
                  type: 'string',
                  description: 'Filter by destination currency (ISO 4217 code, e.g., CNY, INR, USD)',
                },
                orderDate: {
                  type: 'string',
                  format: 'date',
                  description: 'Filter by order creation date (format: YYYY-MM-DD, e.g., 2024-01-15)',
                },
                orderCount: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 50,
                  description: 'Maximum number of orders to return (1-50, default: 10)',
                },
              },
              required: ['country'],
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
              },
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
          case 'remittanceOrderQuery':
            // Validate using Zod schema
            const orderValidation = validateWithZod(remittanceOrderQuerySchema, args);
            if (!orderValidation.success) {
              return createErrorResponse(orderValidation.error);
            }
            
            return await remittanceOrderQuery(orderValidation.data);
          case 'getBeneficiaries':
            // Validate using Zod schema
            const beneficiariesValidation = validateWithZod(getBeneficiariesSchema, args);
            if (!beneficiariesValidation.success) {
              return createErrorResponse(beneficiariesValidation.error);
            }
            
            return await getBeneficiaries(beneficiariesValidation.data);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`,
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
            content: `Validation error: ${exchangeValidation.error}`
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
            content: `Validation error: ${transferValidation.error}`
          });
        }
        result = await transferMoney(transferValidation.data);
        break;
      case 'remittanceOrderQuery':
        // Validate using Zod schema
        const orderValidation = validateWithZod(remittanceOrderQuerySchema, params);
        if (!orderValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Validation error: ${orderValidation.error}`
          });
        }
        result = await remittanceOrderQuery(orderValidation.data);
        break;
      case 'getBeneficiaries':
        // Validate using Zod schema
        const beneficiariesValidation = validateWithZod(getBeneficiariesSchema, params);
        if (!beneficiariesValidation.success) {
          return res.status(400).json({
            code: 1,
            content: `Validation error: ${beneficiariesValidation.error}`
          });
        }
        result = await getBeneficiaries(beneficiariesValidation.data);
        break;
      default:
        return res.status(400).json({
          code: 1,
          content: `Unknown method: ${method}`
        });
    }

    res.json(result);
  } catch (error) {
    console.error('Error processing MCP message:', error);
    res.status(500).json({
      code: 1,
      content: `Internal server error: ${error.message}`
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

// Test endpoint to simulate payment completion
app.post('/test/complete-payment', async (req, res) => {
  try {
    const { orderNo, status = 'SUCCESS', failReason = null } = req.body;
    
    if (!orderNo) {
      return res.status(400).json({ error: 'orderNo is required' });
    }
    
    // Import the updateOrderStatus function
    const { updateOrderStatus } = await import('./tools/transferMoney.js');
    
    const updatedOrder = await updateOrderStatus(orderNo, status, failReason);
    
    if (updatedOrder) {
      res.json({ 
        success: true, 
        message: `Order ${orderNo} status updated to ${status}`,
        order: {
          orderNo: updatedOrder.orderNo,
          status: updatedOrder.status,
          fromAmount: updatedOrder.fromAmount,
          feeAmount: updatedOrder.feeAmount,
          totalPayAmount: updatedOrder.totalPayAmount
        }
      });
    } else {
      res.status(404).json({ 
        success: false, 
        message: `Order ${orderNo} not found` 
      });
    }
  } catch (error) {
    console.error('Error completing payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: 'Internal Server Error',
    message: err.message,
    path: req.path
  });
});

// Function to start Express server
function startExpressServer() {
  app.listen(PORT, () => {
    console.log(`Remittance MCP Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/actuator/health`);
    console.log(`Token generation: POST http://localhost:${PORT}/auth/token`);
    console.log(`MCP messages: POST http://localhost:${PORT}/mcp/messages`);
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
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

export { RemittanceMCPServer };
