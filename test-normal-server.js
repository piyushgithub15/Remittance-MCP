#!/usr/bin/env node

/**
 * Test script for the normal Express server (without MCP)
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8070';

async function testServer() {
  console.log('🧪 Testing Normal Express Server...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/actuator/health`);
    console.log('✅ Health check:', healthResponse.data);
    console.log('');

    // Test 2: Generate JWT token
    console.log('2. Generating JWT token...');
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

    // Test 3: Exchange Rate API
    console.log('3. Testing exchange rate API...');
    try {
      const exchangeResponse = await axios.post(`${BASE_URL}/api/exchange-rate`, {
        toCountry: 'CN',
        toCurrency: 'CNY'
      }, { headers });
      console.log('✅ Exchange rate response:', JSON.stringify(exchangeResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Exchange rate error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 4: Beneficiaries API
    console.log('4. Testing beneficiaries API...');
    try {
      const beneficiariesResponse = await axios.post(`${BASE_URL}/api/beneficiaries`, {
        country: 'CN',
        limit: 5
      }, { headers });
      console.log('✅ Beneficiaries response:', JSON.stringify(beneficiariesResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Beneficiaries error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 5: Transfer Money API (Discovery stage)
    console.log('5. Testing transfer money API (discovery)...');
    try {
      const transferResponse = await axios.post(`${BASE_URL}/api/transfer`, {}, { headers });
      console.log('✅ Transfer discovery response:', JSON.stringify(transferResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Transfer discovery error:', error.response?.data || error.message);
    }
    console.log('');

    // Test 6: Order Query API
    console.log('6. Testing order query API...');
    try {
      const orderResponse = await axios.post(`${BASE_URL}/api/orders`, {
        country: 'CN',
        orderCount: 5
      }, { headers });
      console.log('✅ Order query response:', JSON.stringify(orderResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Order query error:', error.response?.data || error.message);
    }
    console.log('');

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running: npm start');
    }
  }
}

// Run tests
testServer();
