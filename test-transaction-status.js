#!/usr/bin/env node

/**
 * Test script for Transaction Status Tracking API
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8070';

async function testTransactionStatusAPI() {
  console.log('🧪 Testing Transaction Status Tracking API...\n');

  try {
    // Test 1: Generate JWT token
    console.log('1. Generating JWT token...');
    const tokenResponse = await axios.post(`${BASE_URL}/auth/token`, {
      userId: 'test-user',
      scope: 'read'
    });
    const token = tokenResponse.data.token;
    console.log('✅ Token generated:', token.substring(0, 20) + '...');
    console.log('');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 2: Create a test transaction first
    console.log('2. Creating test transaction...');
    try {
      const transferResponse = await axios.post(`${BASE_URL}/api/transfer`, {
        beneficiaryId: "123",
        beneficiaryName: "John Smith",
        sendAmount: 1000,
        callBackProvider: "voice"
      }, { headers });
      
      const orderNo = transferResponse.data.data.orderNo;
      console.log('✅ Test transaction created:', orderNo);
      console.log('');

      // Test 3: Query transaction status
      console.log('3. Testing transaction status inquiry...');
      try {
        const statusResponse = await axios.post(`${BASE_URL}/api/transaction/status`, {
          orderNo: orderNo,
          customerInfo: {
            eidLastFour: "1234",
            eidExpiry: "2025-12-31"
          }
        }, { headers });
        
        console.log('✅ Transaction status response:');
        console.log(JSON.stringify(statusResponse.data, null, 2));
        console.log('');
      } catch (error) {
        console.log('❌ Transaction status error:', error.response?.data || error.message);
        console.log('');
      }

      // Test 4: Verify customer identity
      console.log('4. Testing identity verification...');
      try {
        const identityResponse = await axios.post(`${BASE_URL}/api/transaction/verify-identity`, {
          orderNo: orderNo,
          eidLastFour: "1234",
          eidExpiry: "2025-12-31"
        }, { headers });
        
        console.log('✅ Identity verification response:');
        console.log(JSON.stringify(identityResponse.data, null, 2));
        console.log('');
      } catch (error) {
        console.log('❌ Identity verification error:', error.response?.data || error.message);
        console.log('');
      }

      // Test 5: Refresh transaction status
      console.log('5. Testing status refresh...');
      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/transaction/refresh-status`, {
          orderNo: orderNo,
          forceRefresh: true
        }, { headers });
        
        console.log('✅ Status refresh response:');
        console.log(JSON.stringify(refreshResponse.data, null, 2));
        console.log('');
      } catch (error) {
        console.log('❌ Status refresh error:', error.response?.data || error.message);
        console.log('');
      }

      // Test 6: Get detailed order information
      console.log('6. Testing detailed order query...');
      try {
        const detailedResponse = await axios.post(`${BASE_URL}/api/transaction/detailed`, {
          orderNo: orderNo
        }, { headers });
        
        console.log('✅ Detailed order response:');
        console.log(JSON.stringify(detailedResponse.data, null, 2));
        console.log('');
      } catch (error) {
        console.log('❌ Detailed order error:', error.response?.data || error.message);
        console.log('');
      }

      // Test 7: Escalate customer service inquiry
      console.log('7. Testing customer service escalation...');
      try {
        const escalationResponse = await axios.post(`${BASE_URL}/api/transaction/escalate`, {
          orderNo: orderNo,
          reason: "customer_unsatisfied",
          conversationSummary: "Customer is concerned about transaction delay and wants faster processing",
          escalationLevel: 1
        }, { headers });
        
        console.log('✅ Escalation response:');
        console.log(JSON.stringify(escalationResponse.data, null, 2));
        console.log('');
      } catch (error) {
        console.log('❌ Escalation error:', error.response?.data || error.message);
        console.log('');
      }

    } catch (error) {
      console.log('❌ Test transaction creation error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 8: Test error scenarios
    console.log('8. Testing error scenarios...');
    
    // Test with invalid order number
    try {
      await axios.post(`${BASE_URL}/api/transaction/status`, {
        orderNo: "INVALID_ORDER_123"
      }, { headers });
    } catch (error) {
      console.log('✅ Invalid order number handled correctly:', error.response?.data?.message);
    }

    // Test with invalid EID format
    try {
      await axios.post(`${BASE_URL}/api/transaction/verify-identity`, {
        orderNo: "VALID_ORDER",
        eidLastFour: "12", // Invalid - should be 4 digits
        eidExpiry: "2025-12-31"
      }, { headers });
    } catch (error) {
      console.log('✅ Invalid EID format handled correctly:', error.response?.data?.message);
    }

    console.log('');
    console.log('🎉 Transaction Status API testing completed!');
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('   - POST /api/transaction/status - Query transaction status');
    console.log('   - POST /api/transaction/verify-identity - Verify customer identity');
    console.log('   - POST /api/transaction/refresh-status - Refresh status from backend');
    console.log('   - POST /api/transaction/detailed - Get detailed order information');
    console.log('   - POST /api/transaction/escalate - Escalate customer service inquiry');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running: npm start');
    }
  }
}

// Run tests
testTransactionStatusAPI();
