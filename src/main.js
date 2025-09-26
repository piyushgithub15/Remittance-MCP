#!/usr/bin/env node

/**
 * Main Entry Point for Remittance API Server
 * 
 * This is the main entry point for the Express.js API server.
 * It starts the server without MCP dependencies.
 */

import app from './app.js';
import { connectDatabase } from './config/database.js';
import { seedAllData } from './utils/seedData.js';

const PORT = process.env.PORT || 8070;

// Function to start Express server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Seed initial data (optional)
    // await seedAllData();
    // console.log('✅ Seeded initial data');
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Remittance API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/actuator/health`);
      console.log(`🔑 Token generation: POST http://localhost:${PORT}/auth/token`);
      console.log(`💱 Exchange Rate: POST http://localhost:${PORT}/api/exchange-rate`);
      console.log(`💸 Transfer Money: POST http://localhost:${PORT}/api/transfer`);
      console.log(`📋 Order Query: POST http://localhost:${PORT}/api/orders`);
      console.log(`👥 Beneficiaries: POST http://localhost:${PORT}/api/beneficiaries`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

// Start the server
startServer();
