#!/usr/bin/env node

/**
 * Demo Test Script for Remittance MCP Server
 * 
 * This script demonstrates all the key features with working examples.
 */

const BASE_URL = 'http://localhost:8080';

console.log('🚀 Remittance MCP Server Demo');
console.log('==============================');
console.log('');

async function runDemo() {
  try {
    // 1. Health Check
    console.log('1️⃣ Health Check');
    console.log('----------------');
    const healthResponse = await fetch(`${BASE_URL}/actuator/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Server Status:', healthData.status);
    console.log('');

    // 2. Generate JWT Token
    console.log('2️⃣ Generate JWT Token');
    console.log('---------------------');
    const tokenResponse = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo-user', scope: 'read' })
    });
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;
    console.log('✅ Token Generated:', token.substring(0, 30) + '...');
    console.log('');

    // 3. Test Exchange Rate Query
    console.log('3️⃣ Exchange Rate Query');
    console.log('----------------------');
    
    // China
    const chinaResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'queryExchangeRate',
        params: { toCountry: 'CN', toCurrency: 'CNY' }
      })
    });
    const chinaData = await chinaResponse.json();
    const chinaRate = JSON.parse(chinaData.content[0].text);
    console.log('🇨🇳 China (CNY):', chinaRate.body.exchangeRate, 'CNY per 1 AED');
    
    // USA
    const usaResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'queryExchangeRate',
        params: { toCountry: 'US', toCurrency: 'USD' }
      })
    });
    const usaData = await usaResponse.json();
    const usaRate = JSON.parse(usaData.content[0].text);
    console.log('🇺🇸 USA (USD):', usaRate.body.exchangeRate, 'USD per 1 AED');
    console.log('');

    // 4. Test Transfer Money - Discovery
    console.log('4️⃣ Transfer Money - Discovery Stage');
    console.log('-----------------------------------');
    const discoveryResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'transferMoney',
        params: {} // No parameters for discovery
      })
    });
    const discoveryData = await discoveryResponse.json();
    const discovery = JSON.parse(discoveryData.content[0].text);
    console.log('✅ Available Beneficiaries:', discovery.beneficiaries.length);
    console.log('✅ Suggested Amounts:', discovery.sendAmounts.length);
    console.log('📋 Sample Beneficiaries:');
    discovery.beneficiaries.slice(0, 3).forEach(b => {
      console.log(`   - ${b.name} (${b.currency}) - ${b.title}`);
    });
    console.log('');

    // 5. Test Transfer Money - Execution
    console.log('5️⃣ Transfer Money - Execution Stage');
    console.log('-----------------------------------');
    const executionResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'transferMoney',
        params: {
          beneficiaryId: '123',
          beneficiaryName: 'John Smith',
          sendAmount: 1000,
          callBackProvider: 'voice'
        }
      })
    });
    const executionData = await executionResponse.json();
    const execution = JSON.parse(executionData.content[0].text);
    console.log('✅ Transfer Status:', execution.code === 200 ? 'Success' : 'Failed');
    if (execution.button) {
      console.log('💳 Payment Link:', execution.button.link);
    }
    console.log('');

    // 6. Test Order Query
    console.log('6️⃣ Remittance Order Query');
    console.log('--------------------------');
    const orderResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'remittanceOrderQuery',
        params: { orderCount: 3 }
      })
    });
    const orderData = await orderResponse.json();
    const orders = JSON.parse(orderData.content[0].text);
    console.log('✅ Total Orders Found:', orders.data.length);
    console.log('📋 Recent Orders:');
    orders.data.slice(0, 3).forEach(order => {
      console.log(`   - Order ${order.orderNo}: ${order.fromAmount} AED → ${order.status}`);
    });
    console.log('');

    // 7. Test Error Handling
    console.log('7️⃣ Error Handling Tests');
    console.log('------------------------');
    
    // Invalid token
    const invalidTokenResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'queryExchangeRate',
        params: { toCountry: 'CN', toCurrency: 'CNY' }
      })
    });
    console.log('❌ Invalid Token Response:', invalidTokenResponse.status, '(Expected: 403)');
    
    // Missing parameters
    const missingParamsResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'queryExchangeRate',
        params: { toCountry: 'CN' } // Missing toCurrency
      })
    });
    const missingParamsData = await missingParamsResponse.json();
    const missingParams = JSON.parse(missingParamsData.content[0].text);
    console.log('❌ Missing Parameters:', missingParams.head.msg);
    
    // Invalid country/currency
    const invalidCountryResponse = await fetch(`${BASE_URL}/mcp/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'queryExchangeRate',
        params: { toCountry: 'XX', toCurrency: 'XXX' }
      })
    });
    const invalidCountryData = await invalidCountryResponse.json();
    const invalidCountry = JSON.parse(invalidCountryData.content[0].text);
    console.log('❌ Invalid Country:', invalidCountry.head.msg);
    console.log('');

    console.log('🎉 Demo completed successfully!');
    console.log('');
    console.log('📚 Next Steps:');
    console.log('   - Use the MCP Inspector: npm run inspect');
    console.log('   - Test with cURL commands');
    console.log('   - Integrate with your MCP client');
    console.log('   - Check the README.md for full documentation');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ or a fetch polyfill.');
  process.exit(1);
}

runDemo();
