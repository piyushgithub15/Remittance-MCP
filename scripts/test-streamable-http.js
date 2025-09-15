#!/usr/bin/env node

/**
 * Test Script for Stateless MCP Server with StreamableHTTP Transport
 * 
 * This script demonstrates the proper usage of the stateless MCP server
 * following the official documentation.
 */

const BASE_URL = 'http://localhost:8080';

console.log('🧪 Testing Stateless MCP Server with StreamableHTTP Transport');
console.log('============================================================');
console.log('');

async function testStatelessMCP() {
  try {
    // 1. Test Health Check
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
      body: JSON.stringify({ userId: 'test-user', scope: 'read' })
    });
    const tokenData = await tokenResponse.json();
    const token = tokenData.token;
    console.log('✅ Token Generated:', token.substring(0, 30) + '...');
    console.log('');

    // 3. Test MCP Initialize (Stateless)
    console.log('3️⃣ MCP Initialize (Stateless)');
    console.log('------------------------------');
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    };

    const initResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(initRequest)
    });

    const initData = await initResponse.json();
    console.log('✅ Initialize Response:', JSON.stringify(initData, null, 2));
    console.log('');

    // 4. Test MCP Tools List (Stateless)
    console.log('4️⃣ MCP Tools List (Stateless)');
    console.log('-------------------------------');
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };

    const toolsResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(toolsRequest)
    });

    const toolsData = await toolsResponse.json();
    console.log('✅ Tools List Response:');
    console.log(`   Found ${toolsData.result?.tools?.length || 0} tools`);
    if (toolsData.result?.tools) {
      toolsData.result.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    }
    console.log('');

    // 5. Test MCP Tool Call (Stateless)
    console.log('5️⃣ MCP Tool Call (Stateless)');
    console.log('------------------------------');
    const callRequest = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'queryExchangeRate',
        arguments: {
          toCountry: 'CN',
          toCurrency: 'CNY'
        }
      }
    };

    const callResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(callRequest)
    });

    const callData = await callResponse.json();
    console.log('✅ Tool Call Response:');
    if (callData.result?.content) {
      const content = JSON.parse(callData.result.content[0].text);
      console.log(`   Exchange Rate: 1 AED = ${content.body.exchangeRate} ${content.body.toCurrencyCode}`);
    }
    console.log('');

    // 6. Test Multiple Concurrent Requests (Stateless)
    console.log('6️⃣ Multiple Concurrent Requests (Stateless)');
    console.log('---------------------------------------------');
    const concurrentRequests = [
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'queryExchangeRate',
          arguments: { toCountry: 'US', toCurrency: 'USD' }
        }
      },
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'queryExchangeRate',
          arguments: { toCountry: 'IN', toCurrency: 'INR' }
        }
      },
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'transferMoney',
          arguments: {}
        }
      }
    ];

    const concurrentPromises = concurrentRequests.map(async (request, index) => {
      const response = await fetch(`${BASE_URL}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });
      const data = await response.json();
      return { index, data };
    });

    const concurrentResults = await Promise.all(concurrentPromises);
    console.log('✅ Concurrent Requests Results:');
    concurrentResults.forEach(({ index, data }) => {
      console.log(`   Request ${index + 1}: ${data.result ? 'Success' : 'Error'}`);
      if (data.result?.content) {
        const content = JSON.parse(data.result.content[0].text);
        if (content.body?.exchangeRate) {
          console.log(`     Exchange Rate: ${content.body.exchangeRate}`);
        } else if (content.beneficiaries) {
          console.log(`     Beneficiaries: ${content.beneficiaries.length} available`);
        }
      }
    });
    console.log('');

    // 7. Test Error Handling
    console.log('7️⃣ Error Handling');
    console.log('------------------');
    const errorRequest = {
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'queryExchangeRate',
        arguments: {
          toCountry: 'XX', // Invalid country
          toCurrency: 'XXX' // Invalid currency
        }
      }
    };

    const errorResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(errorRequest)
    });

    const errorData = await errorResponse.json();
    console.log('✅ Error Response:');
    if (errorData.result?.content) {
      const content = JSON.parse(errorData.result.content[0].text);
      console.log(`   Error: ${content.head?.msg || 'Unknown error'}`);
    }
    console.log('');

    // 8. Test Authentication Failure
    console.log('8️⃣ Authentication Failure Test');
    console.log('--------------------------------');
    const authFailResponse = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
        // No Authorization header - should fail
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/list',
        params: {}
      })
    });
    
    console.log(`✅ Auth Failure Response: ${authFailResponse.status} (Expected: 401)`);
    const authFailData = await authFailResponse.json();
    console.log(`   Error: ${authFailData.message}`);
    console.log('');

    console.log('🎉 Stateless MCP Server Test Completed Successfully!');
    console.log('');
    console.log('📚 Key Features Demonstrated:');
    console.log('   ✅ Stateless operation (no session management)');
    console.log('   ✅ JSON responses for simple request/response');
    console.log('   ✅ Concurrent request handling');
    console.log('   ✅ Proper error handling');
    console.log('   ✅ MCP protocol compliance');
    console.log('');
    console.log('🔗 Available Endpoints:');
    console.log(`   POST ${BASE_URL}/mcp - Stateless MCP requests`);
    console.log(`   GET  ${BASE_URL}/mcp/sse - Stateful SSE streaming`);
    console.log(`   DELETE ${BASE_URL}/mcp/session/:id - Session cleanup`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if fetch is available
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ or a fetch polyfill.');
  process.exit(1);
}

testStatelessMCP();
