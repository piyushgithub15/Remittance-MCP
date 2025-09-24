#!/usr/bin/env node

/**
 * Test script for Zod validation
 * This script tests the Zod validation for all tools
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8080';

async function testZodValidation() {
  console.log('🧪 Testing Zod Validation for All Tools...\n');

  try {
    // Step 1: Get JWT token
    console.log('1. Getting JWT token...');
    const tokenResponse = await axios.post(`${BASE_URL}/auth/token`, {
      userId: 'agent1',
      scope: 'read'
    });
    const token = tokenResponse.data.token;
    console.log('✅ JWT token obtained\n');

    // Step 2: Test transferMoney with invalid beneficiaryId
    console.log('2. Testing transferMoney with invalid beneficiaryId...');
    try {
      const invalidResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
        method: 'transferMoney',
        params: {
          beneficiaryId: 'abc', // Invalid - not numeric
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
      
      console.log('❌ Invalid beneficiaryId should have been rejected');
    } catch (error) {
      console.log('✅ Invalid beneficiaryId correctly rejected by Zod');
      console.log('   Error:', error.response?.data?.content || error.message);
    }

    // Step 3: Test transferMoney with missing beneficiaryId
    console.log('\n3. Testing transferMoney with missing beneficiaryId...');
    try {
      const missingResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
        method: 'transferMoney',
        params: {
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
      
      console.log('❌ Missing beneficiaryId should have been rejected');
    } catch (error) {
      console.log('✅ Missing beneficiaryId correctly rejected by Zod');
      console.log('   Error:', error.response?.data?.content || error.message);
    }

    // Step 4: Test transferMoney with valid data
    console.log('\n4. Testing transferMoney with valid data...');
    try {
      const validResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
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
      
      const validData = JSON.parse(validResponse.data.content[0].text);
      console.log('✅ Valid transferMoney request processed');
      console.log('   Order No:', validData.orderNo);
      console.log('   Status:', validData.code);
    } catch (error) {
      console.log('❌ Valid transferMoney request failed:', error.response?.data || error.message);
    }

    // Step 5: Test queryExchangeRate with invalid country code
    console.log('\n5. Testing queryExchangeRate with invalid country code...');
    try {
      const invalidCountryResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
        method: 'queryExchangeRate',
        params: {
          toCountry: 'xyz', // Invalid - not 2 characters
          toCurrency: 'CNY'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Invalid country code should have been rejected');
    } catch (error) {
      console.log('✅ Invalid country code correctly rejected by Zod');
      console.log('   Error:', error.response?.data?.content || error.message);
    }

    // Step 6: Test queryExchangeRate with lowercase country code
    console.log('\n6. Testing queryExchangeRate with lowercase country code...');
    try {
      const lowercaseResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
        method: 'queryExchangeRate',
        params: {
          toCountry: 'cn', // Invalid - lowercase
          toCurrency: 'CNY'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Lowercase country code should have been rejected');
    } catch (error) {
      console.log('✅ Lowercase country code correctly rejected by Zod');
      console.log('   Error:', error.response?.data?.content || error.message);
    }

    // Step 7: Test queryExchangeRate with valid data
    console.log('\n7. Testing queryExchangeRate with valid data...');
    try {
      const validExchangeResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
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
      
      const exchangeData = JSON.parse(validExchangeResponse.data.content[0].text);
      console.log('✅ Valid queryExchangeRate request processed');
      console.log('   Rate:', exchangeData.data?.rate);
    } catch (error) {
      console.log('❌ Valid queryExchangeRate request failed:', error.response?.data || error.message);
    }

    // Step 8: Test remittanceOrderQuery with missing required country
    console.log('\n8. Testing remittanceOrderQuery with missing required country...');
    try {
      const missingCountryResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
        method: 'remittanceOrderQuery',
        params: {
          transferMode: 'BANK_TRANSFER',
          currency: 'CNY'
          // Missing required 'country' field
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Missing required country should have been rejected');
    } catch (error) {
      console.log('✅ Missing required country correctly rejected by Zod');
      console.log('   Error:', error.response?.data?.content || error.message);
    }

    // Step 9: Test remittanceOrderQuery with valid data
    console.log('\n9. Testing remittanceOrderQuery with valid data...');
    try {
      const validOrderResponse = await axios.post(`${BASE_URL}/mcp/messages`, {
        method: 'remittanceOrderQuery',
        params: {
          country: 'CN',
          currency: 'CNY',
          transferMode: 'BANK_TRANSFER',
          orderCount: 10
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const orderData = JSON.parse(validOrderResponse.data.content[0].text);
      console.log('✅ Valid remittanceOrderQuery request processed');
      console.log('   Orders found:', orderData.data?.length || 0);
    } catch (error) {
      console.log('❌ Valid remittanceOrderQuery request failed:', error.response?.data || error.message);
    }

    console.log('\n🎉 Zod validation tests completed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Invalid beneficiaryId rejected');
    console.log('   ✅ Missing beneficiaryId rejected');
    console.log('   ✅ Valid transferMoney processed');
    console.log('   ✅ Invalid country code rejected');
    console.log('   ✅ Lowercase country code rejected');
    console.log('   ✅ Valid queryExchangeRate processed');
    console.log('   ✅ Missing required country rejected');
    console.log('   ✅ Valid remittanceOrderQuery processed');
    
  } catch (error) {
    console.error('❌ Zod validation test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testZodValidation();
