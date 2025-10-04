import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import tool implementations
import { queryExchangeRate } from './tools/queryExchangeRate.js';
import { transferMoney, updateOrderStatus } from './tools/transferMoney.js';
import { getBeneficiaries } from './tools/getBeneficiaries.js';
import { generateJWTToken } from './utils/jwt.js';
import { connectDatabase } from './config/database.js';
import { seedAllData } from './utils/seedData.js';
import { 
  transferMoneySchema, 
  queryExchangeRateSchema, 
  getBeneficiariesSchema,
  validateWithZod,
  createErrorResponse 
} from './utils/validation.js';

// Import route handlers
import transactionStatusRouter from './routes/transactionStatus.js';
import aiAgentRouter from './routes/aiAgent.js';

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

// Use transaction status routes
app.use('/api/transaction', transactionStatusRouter);

// Use AI Agent routes
app.use('/api/ai-agent', aiAgentRouter);



// API Routes

// Exchange Rate API
app.post('/api/exchange-rate', authenticateToken, async (req, res) => {
  try {
    const validation = validateWithZod(queryExchangeRateSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error
      });
    }
    
    const result = await queryExchangeRate(validation.data);
    
    if (result.isError) {
      return res.status(400).json({
        success: false,
        error: 'Exchange rate query failed',
        message: result.content[0].text
      });
    }
    
    res.json({
      success: true,
      data: JSON.parse(result.content[0].text)
    });
  } catch (error) {
    console.error('Error in exchange rate API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Transfer Money API
app.post('/api/transfer', authenticateToken, async (req, res) => {
  try {
    const validation = validateWithZod(transferMoneySchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error
      });
    }
    
    const result = await transferMoney(validation.data);
    
    if (result.isError) {
      return res.status(400).json({
        success: false,
        error: 'Transfer failed',
        message: result.content[0].text
      });
    }
    
    res.json({
      success: true,
      data: JSON.parse(result.content[0].text)
    });
  } catch (error) {
    console.error('Error in transfer API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Remittance Order Query API


// Get Beneficiaries API
app.post('/api/beneficiaries', authenticateToken, async (req, res) => {
  try {
    const validation = validateWithZod(getBeneficiariesSchema, req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error
      });
    }
    
    const result = await getBeneficiaries(validation.data);
    
    if (result.isError) {
      return res.status(400).json({
        success: false,
        error: 'Beneficiaries query failed',
        message: result.content[0].text
      });
    }
    
    res.json({
      success: true,
      data: JSON.parse(result.content[0].text)
    });
  } catch (error) {
    console.error('Error in beneficiaries API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Callback endpoint for remittance status updates
app.post('/callback/remittance', async (req, res) => {
  try {
    const { notifyEvent, data } = req.body;
    
    if (notifyEvent === 'remittance_pay_status') {
      console.log('Remittance payment status update:', data);
      
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

export default app;
