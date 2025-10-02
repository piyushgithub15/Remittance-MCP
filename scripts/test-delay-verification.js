#!/usr/bin/env node

/**
 * Test script to verify that verification is only required for delayed transactions
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { verifyIdentity } from '../src/tools/verifyIdentity.js';
import { transactionQuery } from '../src/tools/transactionQuery.js';
import { checkVerificationStatus } from '../src/utils/verificationStore.js';
import RemittanceOrder from '../src/models/RemittanceOrder.js';

// Load environment variables
dotenv.config();

// Database connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/remittance-mcp';

async function testDelayVerification() {
  try {
    console.log('🧪 Testing delay-based verification system...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clear any existing verification
    const { clearVerification } = await import('../src/utils/verificationStore.js');
    clearVerification('agent1');
    
    // Test 1: Query transactions without verification (should work for non-delayed)
    console.log('\n🔄 Test 1: Query transactions without verification (non-delayed)');
    const query1 = await transactionQuery({ orderCount: 5 });
    const result1 = JSON.parse(query1.content[0].text);
    console.log(`Result: ${result1.message}`);
    console.log(`Status: ${result1.code === 200 ? '✅ PASS (No verification required)' : '❌ FAIL'}`);
    
    // Test 2: Check verification status (should not require verification)
    console.log('\n🔄 Test 2: Check verification status for general transaction');
    const status1 = checkVerificationStatus('agent1');
    console.log(`Verification required: ${status1.requiresVerification}`);
    console.log(`Status: ${!status1.requiresVerification ? '✅ PASS (No verification required)' : '❌ FAIL'}`);
    
    // Test 3: Create a delayed transaction for testing
    console.log('\n🔄 Test 3: Create a delayed transaction for testing');
    const delayedOrder = new RemittanceOrder({
      orderNo: 'DELAYED123456',
      userId: 'agent1',
      beneficiaryId: new mongoose.Types.ObjectId(),
      fromAmount: 1000,
      feeAmount: 10,
      totalPayAmount: 1010,
      status: 'PENDING',
      actual_status: 'PENDING',
      dateDesc: '2024-01-01',
      date: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago (delayed)
      transferMode: 'BANK_TRANSFER',
      country: 'US',
      currency: 'USD',
      beneficiaryName: 'Test Beneficiary',
      description: 'Test delayed transfer',
      exchangeRate: 0.27,
      receivedAmount: 270
    });
    
    await delayedOrder.save();
    console.log('✅ Created delayed transaction (15 minutes ago)');
    
    // Test 4: Query specific delayed transaction without verification
    console.log('\n🔄 Test 4: Query specific delayed transaction without verification');
    const query2 = await transactionQuery({ orderNo: 'DELAYED123456' });
    const result2 = JSON.parse(query2.content[0].text);
    console.log(`Result: ${result2.message}`);
    console.log(`Status: ${result2.code === 401 ? '✅ PASS (Verification required for delayed)' : '❌ FAIL'}`);
    
    // Test 5: Verify identity
    console.log('\n🔄 Test 5: Verify identity');
    const verify = await verifyIdentity({
      lastFourDigits: '5678',
      expiryDate: '25/12/2025'
    });
    const verifyResult = JSON.parse(verify.content[0].text);
    console.log(`Result: ${verifyResult.message}`);
    console.log(`Status: ${verifyResult.code === 200 ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test 6: Query delayed transaction after verification
    console.log('\n🔄 Test 6: Query delayed transaction after verification');
    const query3 = await transactionQuery({ orderNo: 'DELAYED123456' });
    const result3 = JSON.parse(query3.content[0].text);
    console.log(`Result: ${result3.message}`);
    console.log(`Status: ${result3.code === 200 ? '✅ PASS (Delayed transaction accessible after verification)' : '❌ FAIL'}`);
    
    // Test 7: Query non-delayed transactions after verification (should still work)
    console.log('\n🔄 Test 7: Query non-delayed transactions after verification');
    const query4 = await transactionQuery({ orderCount: 5 });
    const result4 = JSON.parse(query4.content[0].text);
    console.log(`Result: ${result4.message}`);
    console.log(`Status: ${result4.code === 200 ? '✅ PASS (Non-delayed transactions still accessible)' : '❌ FAIL'}`);
    
    // Clean up test data
    await RemittanceOrder.deleteOne({ orderNo: 'DELAYED123456' });
    console.log('\n🧹 Cleaned up test data');
    
    console.log('\n✅ Delay-based verification test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

testDelayVerification();
