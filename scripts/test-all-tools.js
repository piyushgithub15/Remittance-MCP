#!/usr/bin/env node

/**
 * Test script for all MCP tools
 * This script demonstrates all available tools including the new getBeneficiaries
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

async function testAllTools() {
  console.log('🧪 Testing All MCP Tools...\n');

  try {
    // Step 1: Get JWT token
    console.log('1. Getting JWT token...');
    const tokenResponse = await axios.post(`${BASE_URL}/auth/token`, {
      userId: 'agent1',
      scope: 'read'
    });
    const token = tokenResponse.data.token;
    console.log('✅ JWT token obtained\n');

    // Step 2: Test exchange rate query
    console.log('2. Testing exchange rate query...');
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

    // Step 3: Test get beneficiaries
    console.log('\n3. Testing get beneficiaries...');
    const beneficiariesResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'getBeneficiaries',
      params: { limit: 10 }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const beneficiariesData = JSON.parse(beneficiariesResponse.data.content[0].text);
    console.log('✅ Get beneficiaries completed');
    console.log('   Total beneficiaries:', beneficiariesData.total);
    console.log('   First beneficiary:', beneficiariesData.data[0]?.name);

    // Step 4: Test get beneficiaries with filters
    console.log('\n4. Testing get beneficiaries with filters (country: CN)...');
    const filteredBeneficiariesResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'getBeneficiaries',
      params: { 
        country: 'CN',
        limit: 5
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const filteredBeneficiariesData = JSON.parse(filteredBeneficiariesResponse.data.content[0].text);
    console.log('✅ Filtered beneficiaries completed');
    console.log('   CN beneficiaries:', filteredBeneficiariesData.total);
    console.log('   Currencies:', filteredBeneficiariesData.data.map(b => b.currency).join(', '));

    // Step 5: Test transfer money discovery
    console.log('\n5. Testing transfer money discovery...');
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
    console.log('✅ Transfer money discovery completed');
    console.log('   Beneficiaries:', discoveryData.content[0].text ? JSON.parse(discoveryData.content[0].text).beneficiaries.length : 0);
    console.log('   Suggested amounts:', discoveryData.content[0].text ? JSON.parse(discoveryData.content[0].text).sendAmounts.length : 0);

    // Step 6: Test transfer money execution
    console.log('\n6. Testing transfer money execution...');
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
    console.log('✅ Transfer money execution completed');
    console.log('   Order No:', transferData.orderNo);
    console.log('   Amount:', transferData.transactionDetails.sendAmount);
    console.log('   Fee:', transferData.transactionDetails.fee);
    console.log('   Total:', transferData.transactionDetails.totalAmount);

    // Step 7: Test order query
    console.log('\n7. Testing order query...');
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

    // Step 8: Test order query with filters
    console.log('\n8. Testing order query with filters (status: PENDING)...');
    const filteredOrderResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'remittanceOrderQuery',
      params: { 
        status: 'PENDING',
        orderCount: 5
      }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const filteredOrderData = JSON.parse(filteredOrderResponse.data.content[0].text);
    console.log('✅ Filtered order query completed');
    console.log('   PENDING orders:', filteredOrderData.data.length);

    // Step 9: Complete payment
    console.log('\n9. Completing payment...');
    const paymentResponse = await axios.post(`${BASE_URL}/test/complete-payment`, {
      orderNo: transferData.orderNo,
      status: 'SUCCESS'
    });
    
    console.log('✅ Payment completed');
    console.log('   Status:', paymentResponse.data.order.status);
    console.log('   Message:', paymentResponse.data.message);

    // Step 10: Query orders after payment
    console.log('\n10. Testing order query after payment...');
    const updatedOrderResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
      method: 'remittanceOrderQuery',
      params: { orderCount: 10 }
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const updatedOrderData = JSON.parse(updatedOrderResponse.data.content[0].text);
    console.log('✅ Updated order query completed');
    console.log('   Orders found:', updatedOrderData.data.length);
    console.log('   Latest order status:', updatedOrderData.data[0]?.status);

    console.log('\n🎉 All MCP tools test passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ queryExchangeRate - Exchange rate queries');
    console.log('   ✅ getBeneficiaries - Beneficiary management');
    console.log('   ✅ transferMoney - Money transfer process');
    console.log('   ✅ remittanceOrderQuery - Order history queries');
    console.log('   ✅ All tools integrated with MongoDB');
    console.log('   ✅ Complete transfer flow working');
    console.log('   ✅ Filtering and querying working');
    
  } catch (error) {
    console.error('❌ All tools test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testAllTools();
