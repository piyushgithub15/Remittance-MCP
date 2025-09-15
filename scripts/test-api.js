#!/usr/bin/env node

/**
 * API Testing Script
 * 
 * This script tests the Remittance MCP API endpoints with various scenarios.
 * 
 * Usage:
 *   node scripts/test-api.js [baseUrl] [token]
 * 
 * Examples:
 *   node scripts/test-api.js
 *   node scripts/test-api.js http://localhost:8080
 *   node scripts/test-api.js http://localhost:8080 your-jwt-token
 */

import { generateJWTToken } from '../src/utils/jwt.js';

const BASE_URL = process.argv[2] || 'http://localhost:8080';
const TOKEN = process.argv[3] || generateJWTToken('test-user', 'read');

console.log('🧪 Remittance MCP API Test Suite');
console.log('================================');
console.log(`Base URL: ${BASE_URL}`);
console.log(`Token: ${TOKEN.substring(0, 20)}...`);
console.log('');

// Test cases
const testCases = [
  {
    name: 'Health Check',
    method: 'GET',
    url: `${BASE_URL}/actuator/health`,
    headers: {},
    body: null
  },
  {
    name: 'Generate Token',
    method: 'POST',
    url: `${BASE_URL}/auth/token`,
    headers: { 'Content-Type': 'application/json' },
    body: { userId: 'test-user', scope: 'read' }
  },
  {
    name: 'Query Exchange Rate - China',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    }
  },
  {
    name: 'Query Exchange Rate - USA',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'US', toCurrency: 'USD' }
    }
  },
  {
    name: 'Transfer Money - Discovery',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'transferMoney',
      params: {}
    }
  },
  {
    name: 'Transfer Money - Execution',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'transferMoney',
      params: {
        beneficiaryId: '123',
        beneficiaryName: 'John Smith',
        sendAmount: 1000,
        callBackProvider: 'voice'
      }
    }
  },
  {
    name: 'Remittance Order Query',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'remittanceOrderQuery',
      params: {
        country: 'CN',
        currency: 'CNY',
        orderCount: 5
      }
    }
  },
  {
    name: 'Query Exchange Rate - Invalid Country',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'XX', toCurrency: 'XXX' }
    }
  },
  {
    name: 'Transfer Money - Missing Parameters',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'transferMoney',
      params: {
        beneficiaryName: 'John Smith'
        // Missing sendAmount
      }
    }
  },
  {
    name: 'Unauthorized Request (No Token)',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    }
  }
];

// Run tests
async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: ${testCase.name}`);
    console.log(`   ${testCase.method} ${testCase.url}`);
    
    try {
      const response = await fetch(testCase.url, {
        method: testCase.method,
        headers: testCase.headers,
        body: testCase.body ? JSON.stringify(testCase.body) : undefined
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (response.ok) {
        console.log(`   ✅ PASS (${response.status})`);
        if (testCase.name.includes('Invalid') || testCase.name.includes('Missing') || testCase.name.includes('Unauthorized')) {
          // These are expected to fail
          console.log(`   📄 Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);
        } else {
          console.log(`   📄 Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);
        }
        passed++;
      } else {
        console.log(`   ❌ FAIL (${response.status})`);
        console.log(`   📄 Response: ${JSON.stringify(responseData, null, 2).substring(0, 200)}...`);
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Test Results');
  console.log('===============');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed.`);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ or a fetch polyfill.');
  console.error('   Please upgrade Node.js or install node-fetch:');
  console.error('   npm install node-fetch');
  process.exit(1);
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
