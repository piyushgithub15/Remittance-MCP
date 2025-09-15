#!/usr/bin/env node

/**
 * Test script to demonstrate callback functionality in the MCP server
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';

console.log('🔄 Testing Callback Functionality in MCP Server');
console.log('================================================');
console.log('');

async function testCallbacks() {
  try {
    // 1. Generate JWT Token
    console.log('1️⃣ Generate JWT Token');
    console.log('---------------------');
    const tokenResponse = await fetch(`${BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user', scope: 'read' })
    });
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;
    console.log('✅ Token Generated:', token.substring(0, 30) + '...');
    console.log('');

    // 2. Test Voice Callback Transfer
    console.log('2️⃣ Test Voice Callback Transfer');
    console.log('--------------------------------');
    const voiceTransferRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'transferMoney',
        arguments: {
          beneficiaryId: '123',
          beneficiaryName: '张三',
          sendAmount: 1000,
          callBackProvider: 'voice'  // ← Voice callback
        }
      }
    };

    const voiceResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(voiceTransferRequest)
    });

    const voiceData = await voiceResponse.json();
    console.log('✅ Voice Callback Transfer Response:');
    if (voiceData.result?.content) {
      const content = JSON.parse(voiceData.result.content[0].text);
      console.log('   Full Response:', JSON.stringify(content, null, 2));
      console.log(`   Payment Link: ${content.paymentLink}`);
      console.log(`   Callback Type: ${content.callBackProvider}`);
      console.log(`   Callback URL: ${content.callBackUrl}`);
    }
    console.log('');

    // 3. Test Text Callback Transfer
    console.log('3️⃣ Test Text Callback Transfer');
    console.log('-------------------------------');
    const textTransferRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'transferMoney',
        arguments: {
          beneficiaryId: '125',
          beneficiaryName: 'John Smith',
          sendAmount: 500,
          callBackProvider: 'text'  // ← Text callback
        }
      }
    };

    const textResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(textTransferRequest)
    });

    const textData = await textResponse.json();
    console.log('✅ Text Callback Transfer Response:');
    if (textData.result?.content) {
      const content = JSON.parse(textData.result.content[0].text);
      console.log(`   Payment Link: ${content.paymentLink}`);
      console.log(`   Callback Type: ${content.callBackProvider}`);
      console.log(`   Callback URL: ${content.callBackUrl}`);
    }
    console.log('');

    // 4. Test Callback Endpoint
    console.log('4️⃣ Test Callback Endpoint');
    console.log('-------------------------');
    const callbackData = {
      notifyEvent: 'remittance_pay_status',
      data: {
        transactionId: 'TXN123456789',
        status: 'completed',
        amount: 1000,
        beneficiary: '张三',
        timestamp: new Date().toISOString()
      }
    };

    const callbackResponse = await fetch(`${BASE_URL}/callback/remittance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackData)
    });

    const callbackResult = await callbackResponse.json();
    console.log('✅ Callback Endpoint Response:', callbackResult);
    console.log('');

    // 5. Test Callback Configuration
    console.log('5️⃣ Test Callback Configuration');
    console.log('-------------------------------');
    
    // Test voice callback config
    const voiceConfigResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'transferMoney',
          arguments: {
            callBackProvider: 'voice'
          }
        }
      })
    });

    const voiceConfigData = await voiceConfigResponse.json();
    console.log('✅ Voice Callback Config:');
    if (voiceConfigData.result?.content) {
      const content = JSON.parse(voiceConfigData.result.content[0].text);
      console.log(`   Callback URL: ${content.callBackUrl}`);
      console.log(`   Callback Token: ${content.callBackToken}`);
    }
    console.log('');

    console.log('🎉 Callback Testing Completed Successfully!');
    console.log('');
    console.log('📚 Callback Features Demonstrated:');
    console.log('   ✅ Voice callback configuration');
    console.log('   ✅ Text callback configuration');
    console.log('   ✅ Payment link generation with callbacks');
    console.log('   ✅ Callback endpoint for status updates');
    console.log('   ✅ Environment-based callback configuration');

  } catch (error) {
    console.error('❌ Error testing callbacks:', error.message);
    process.exit(1);
  }
}

// Run the test
testCallbacks();
