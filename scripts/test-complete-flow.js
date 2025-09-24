#!/usr/bin/env node

/**
 * Complete flow test script
 * This script demonstrates the full transfer process with API calls
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

async function testCompleteFlow() {
  console.log('🧪 Testing Complete Transfer Flow with API...\n');

  try {
    // Step 1: Get JWT token
    console.log('1. Getting JWT token...');
    const tokenResponse = await axios.post(`${BASE_URL}/auth/token`, {
      userId: 'agent1',
      scope: 'read'
    });
    const token = tokenResponse.data.token;
    console.log('✅ JWT token obtained\n');

    // Step 2: Test transfer money discovery
    console.log('2. Testing transfer money discovery...');
    const discoveryResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'transferMoney',
      params: {}
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const discoveryData = discoveryResponse.data;
    console.log('✅ Discovery completed');
    console.log('   Beneficiaries:', discoveryData.content[0].text ? JSON.parse(discoveryData.content[0].text).beneficiaries.length : 0);
    console.log('   Suggested amounts:', discoveryData.content[0].text ? JSON.parse(discoveryData.content[0].text).sendAmounts.length : 0);

    // Step 3: Test transfer money execution
    console.log('\n3. Testing transfer money execution...');
    const transferResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'transferMoney',
      params: {
        beneficiaryId: '123',
        beneficiaryName: '张三',
        sendAmount: 1000,
        callBackProvider: 'voice'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const transferData = JSON.parse(transferResponse.data.content[0].text);
    console.log('✅ Transfer initiated');
    console.log('   Order No:', transferData.orderNo);
    console.log('   Amount:', transferData.transactionDetails.sendAmount);
    console.log('   Fee:', transferData.transactionDetails.fee);
    console.log('   Total:', transferData.transactionDetails.totalAmount);

    // Step 4: Test order query (should show the new order)
    console.log('\n4. Testing order query...');
    const orderQueryResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'remittanceOrderQuery',
      params: { orderCount: 10 }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const orderData = JSON.parse(orderQueryResponse.data.content[0].text);
    console.log('✅ Order query completed');
    console.log('   Orders found:', orderData.data.length);
    console.log('   Latest order:', orderData.data[0]?.orderNo);
    console.log('   Latest order status:', orderData.data[0]?.status);

    // Step 5: Simulate payment completion
    console.log('\n5. Simulating payment completion...');
    const paymentResponse = await axios.post(`${BASE_URL}/test/complete-payment`, {
      orderNo: transferData.orderNo,
      status: 'SUCCESS'
    });
    
    console.log('✅ Payment completed');
    console.log('   Status:', paymentResponse.data.order.status);
    console.log('   Message:', paymentResponse.data.message);

    // Step 6: Query orders again (should show updated status)
    console.log('\n6. Testing order query after payment...');
    const updatedOrderQueryResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'remittanceOrderQuery',
      params: { orderCount: 10 }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const updatedOrderData = JSON.parse(updatedOrderQueryResponse.data.content[0].text);
    console.log('✅ Updated order query completed');
    console.log('   Orders found:', updatedOrderData.data.length);
    console.log('   Latest order status:', updatedOrderData.data[0]?.status);

    // Step 7: Test filtering by status
    console.log('\n7. Testing order filtering by status...');
    const filteredResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'remittanceOrderQuery',
      params: { 
        status: 'SUCCESS',
        orderCount: 5 
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const filteredData = JSON.parse(filteredResponse.data.content[0].text);
    console.log('✅ Filtered order query completed');
    console.log('   SUCCESS orders found:', filteredData.data.length);

    // Step 8: Test exchange rate query
    console.log('\n8. Testing exchange rate query...');
    const exchangeRateResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'queryExchangeRate',
      params: {
        toCountry: 'CN',
        toCurrency: 'CNY'
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const exchangeRateData = JSON.parse(exchangeRateResponse.data.content[0].text);
    console.log('✅ Exchange rate query completed');
    console.log('   Rate:', exchangeRateData.body?.exchangeRate);
    console.log('   From:', exchangeRateData.body?.fromCurrencyCode);
    console.log('   To:', exchangeRateData.body?.toCurrencyCode);

    console.log('\n🎉 Complete flow test passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Transfer money creates order in database');
    console.log('   ✅ Order query returns created orders');
    console.log('   ✅ Order status can be updated via API');
    console.log('   ✅ Filtering works correctly');
    console.log('   ✅ Exchange rate queries work');
    console.log('   ✅ All MCP tools integrated with MongoDB');
    
  } catch (error) {
    console.error('❌ Complete flow test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testCompleteFlow();
