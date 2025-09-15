#!/usr/bin/env node

/**
 * Comprehensive Test Script for Remittance MCP Server
 * 
 * This script tests all features including authentication, tools, and error handling.
 * 
 * Usage:
 *   node scripts/test-comprehensive.js [baseUrl]
 * 
 * Examples:
 *   node scripts/test-comprehensive.js
 *   node scripts/test-comprehensive.js http://localhost:8080
 */

import { generateJWTToken } from '../src/utils/jwt.js';

const BASE_URL = process.argv[2] || 'http://localhost:8080';

console.log('🧪 Comprehensive Remittance MCP Server Test Suite');
console.log('================================================');
console.log(`Base URL: ${BASE_URL}`);
console.log('');

// Generate test tokens
const validToken = generateJWTToken('test-user', 'read');
const expiredToken = generateJWTToken('test-user', 'read', { exp: Math.floor(Date.now() / 1000) - 3600 }); // Expired 1 hour ago
const invalidToken = 'invalid.jwt.token';

console.log('🔑 Generated Test Tokens:');
console.log(`   Valid: ${validToken.substring(0, 30)}...`);
console.log(`   Expired: ${expiredToken.substring(0, 30)}...`);
console.log(`   Invalid: ${invalidToken}`);
console.log('');

// Test cases
const testCases = [
  // Health Check (No Auth Required)
  {
    name: 'Health Check (No Auth)',
    method: 'GET',
    url: `${BASE_URL}/actuator/health`,
    headers: {},
    body: null,
    expectedStatus: 200
  },

  // Token Generation
  {
    name: 'Generate JWT Token',
    method: 'POST',
    url: `${BASE_URL}/auth/token`,
    headers: { 'Content-Type': 'application/json' },
    body: { userId: 'test-user', scope: 'read' },
    expectedStatus: 200
  },

  // Authentication Tests
  {
    name: 'Valid Token - Exchange Rate Query',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    },
    expectedStatus: 200
  },

  {
    name: 'Invalid Token - Should Fail',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${invalidToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    },
    expectedStatus: 403
  },

  {
    name: 'Expired Token - Should Fail',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${expiredToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    },
    expectedStatus: 403
  },

  {
    name: 'No Token - Should Fail',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    },
    expectedStatus: 401
  },

  {
    name: 'URL Parameter Token - Should Work',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages?token=${validToken}`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'US', toCurrency: 'USD' }
    },
    expectedStatus: 200
  },

  // Tool Tests
  {
    name: 'Query Exchange Rate - China',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN', toCurrency: 'CNY' }
    },
    expectedStatus: 200
  },

  {
    name: 'Query Exchange Rate - USA',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'US', toCurrency: 'USD' }
    },
    expectedStatus: 200
  },

  {
    name: 'Query Exchange Rate - Invalid Country',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'XX', toCurrency: 'XXX' }
    },
    expectedStatus: 200 // Should return business error, not HTTP error
  },

  {
    name: 'Query Exchange Rate - Missing Parameters',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'queryExchangeRate',
      params: { toCountry: 'CN' } // Missing toCurrency
    },
    expectedStatus: 200 // Should return validation error
  },

  // Transfer Money Tests
  {
    name: 'Transfer Money - Discovery Stage',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'transferMoney',
      params: {} // No parameters for discovery
    },
    expectedStatus: 200
  },

  {
    name: 'Transfer Money - Execution Stage',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
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
    },
    expectedStatus: 200
  },

  {
    name: 'Transfer Money - Missing Required Parameters',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'transferMoney',
      params: {
        beneficiaryName: 'John Smith'
        // Missing sendAmount
      }
    },
    expectedStatus: 200 // Should return validation error
  },

  {
    name: 'Transfer Money - High Amount (KYC Required)',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'transferMoney',
      params: {
        beneficiaryId: '123',
        beneficiaryName: 'John Smith',
        sendAmount: 15000, // High amount requiring KYC
        callBackProvider: 'voice'
      }
    },
    expectedStatus: 200 // Should return KYC required error
  },

  // Order Query Tests
  {
    name: 'Remittance Order Query - Default',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'remittanceOrderQuery',
      params: {}
    },
    expectedStatus: 200
  },

  {
    name: 'Remittance Order Query - Filter by Country',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'remittanceOrderQuery',
      params: {
        country: 'CN',
        orderCount: 5
      }
    },
    expectedStatus: 200
  },

  {
    name: 'Remittance Order Query - Invalid Order Count',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'remittanceOrderQuery',
      params: {
        orderCount: 100 // Exceeds maximum of 50
      }
    },
    expectedStatus: 200 // Should return validation error
  },

  // Unknown Method Test
  {
    name: 'Unknown Method - Should Return Error',
    method: 'POST',
    url: `${BASE_URL}/mcp/messages`,
    headers: { 
      'Authorization': `Bearer ${validToken}`,
      'Content-Type': 'application/json' 
    },
    body: {
      method: 'unknownMethod',
      params: {}
    },
    expectedStatus: 400
  }
];

// Run tests
async function runTests() {
  let passed = 0;
  let failed = 0;
  const results = [];

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

      const isSuccess = response.status === testCase.expectedStatus;
      const status = isSuccess ? '✅ PASS' : '❌ FAIL';
      
      console.log(`   ${status} (${response.status})`);
      
      if (isSuccess) {
        passed++;
      } else {
        failed++;
        console.log(`   Expected: ${testCase.expectedStatus}, Got: ${response.status}`);
      }

      // Show response for successful tests or interesting failures
      if (isSuccess || testCase.name.includes('Invalid') || testCase.name.includes('Missing')) {
        const responsePreview = typeof responseData === 'string' 
          ? responseData.substring(0, 200) 
          : JSON.stringify(responseData, null, 2).substring(0, 200);
        console.log(`   📄 Response: ${responsePreview}...`);
      }

      results.push({
        name: testCase.name,
        status: response.status,
        expected: testCase.expectedStatus,
        success: isSuccess,
        response: responseData
      });

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failed++;
      results.push({
        name: testCase.name,
        status: 'ERROR',
        expected: testCase.expectedStatus,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed.`);
  }

  // Detailed results for failed tests
  const failedTests = results.filter(r => !r.success);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Test Details:');
    console.log('======================');
    failedTests.forEach(test => {
      console.log(`\n${test.name}:`);
      console.log(`  Expected Status: ${test.expected}`);
      console.log(`  Actual Status: ${test.status}`);
      if (test.error) {
        console.log(`  Error: ${test.error}`);
      }
    });
  }

  return results;
}

// Check if fetch is available
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
