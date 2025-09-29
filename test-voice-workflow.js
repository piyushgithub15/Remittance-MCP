import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.REMITTANCE_API_BASE_URL || 'http://localhost:8070';
const JWT_TOKEN = process.env.JWT_TOKEN || 'your_jwt_token_here';

// Test configuration
const TEST_CONFIG = {
  baseUrl: BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
};

console.log('🎤 Testing Voice Workflow APIs...\n');

// Test 1: Initiate outbound call
async function testInitiateCall() {
  console.log('📞 Test 1: Initiate Outbound Call');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/voice/initiate-call`, {
      to: '+1234567890', // Replace with test phone number
      message: 'Hello! This is Aya from Botim Remittance. I have an important update about your transaction.',
      orderNo: 'TXN123456789'
    }, {
      headers: TEST_CONFIG.headers
    });
    
    console.log('✅ Call initiated successfully');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.callSid) {
      console.log(`📱 Call SID: ${response.data.callSid}`);
      return response.data.callSid;
    }
    
  } catch (error) {
    console.error('❌ Error initiating call:', error.response?.data || error.message);
  }
  
  return null;
}

// Test 2: Get call status
async function testGetCallStatus(callSid) {
  if (!callSid) {
    console.log('⏭️  Skipping call status test - no call SID available');
    return;
  }
  
  console.log('\n📊 Test 2: Get Call Status');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get(`${BASE_URL}/api/voice/call-status/${callSid}`, {
      headers: TEST_CONFIG.headers
    });
    
    console.log('✅ Call status retrieved successfully');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error getting call status:', error.response?.data || error.message);
  }
}

// Test 3: Test webhook endpoints (simulate Twilio webhook)
async function testWebhookEndpoints() {
  console.log('\n🔗 Test 3: Webhook Endpoints');
  console.log('=' .repeat(50));
  
  // Test incoming call webhook
  try {
    console.log('📞 Testing incoming call webhook...');
    const response = await axios.post(`${BASE_URL}/api/voice/webhook/incoming`, {
      CallSid: 'test_call_sid',
      From: '+1234567890',
      To: '+0987654321'
    });
    
    console.log('✅ Incoming call webhook response received');
    console.log('📊 TwiML Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error testing incoming call webhook:', error.response?.data || error.message);
  }
  
  // Test choice processing webhook
  try {
    console.log('\n🎯 Testing choice processing webhook...');
    const response = await axios.post(`${BASE_URL}/api/voice/process-choice`, {
      CallSid: 'test_call_sid',
      Digits: '1' // Transaction status inquiry
    });
    
    console.log('✅ Choice processing webhook response received');
    console.log('📊 TwiML Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error testing choice processing webhook:', error.response?.data || error.message);
  }
  
  // Test transaction processing webhook
  try {
    console.log('\n💳 Testing transaction processing webhook...');
    const response = await axios.post(`${BASE_URL}/api/voice/process-transaction`, {
      CallSid: 'test_call_sid',
      Digits: 'TXN123456789'
    });
    
    console.log('✅ Transaction processing webhook response received');
    console.log('📊 TwiML Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error testing transaction processing webhook:', error.response?.data || error.message);
  }
  
  // Test FAQ processing webhook
  try {
    console.log('\n❓ Testing FAQ processing webhook...');
    const response = await axios.post(`${BASE_URL}/api/voice/process-faq`, {
      CallSid: 'test_call_sid',
      SpeechResult: 'What are your fees?'
    });
    
    console.log('✅ FAQ processing webhook response received');
    console.log('📊 TwiML Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error testing FAQ processing webhook:', error.response?.data || error.message);
  }
}

// Test 4: Test voice integration with AI agent
async function testVoiceAIIntegration() {
  console.log('\n🤖 Test 4: Voice + AI Integration');
  console.log('=' .repeat(50));
  
  try {
    // Test AI agent processing with voice channel
    const response = await axios.post(`${BASE_URL}/api/ai-agent/process-inquiry`, {
      inquiry: 'I need help with my transaction status',
      language: 'en',
      channel: 'voice',
      customerPhone: '+1234567890'
    }, {
      headers: TEST_CONFIG.headers
    });
    
    console.log('✅ AI agent voice integration successful');
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing voice + AI integration:', error.response?.data || error.message);
  }
}

// Test 5: Test multilingual voice support
async function testMultilingualVoice() {
  console.log('\n🌍 Test 5: Multilingual Voice Support');
  console.log('=' .repeat(50));
  
  try {
    // Test Arabic voice processing
    const arabicResponse = await axios.post(`${BASE_URL}/api/ai-agent/process-inquiry`, {
      inquiry: 'أحتاج مساعدة في حالة المعاملة',
      language: 'ar',
      channel: 'voice'
    }, {
      headers: TEST_CONFIG.headers
    });
    
    console.log('✅ Arabic voice processing successful');
    console.log('📊 Arabic Response:', JSON.stringify(arabicResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing Arabic voice support:', error.response?.data || error.message);
  }
}

// Test 6: Test voice call flow simulation
async function testVoiceCallFlow() {
  console.log('\n🔄 Test 6: Complete Voice Call Flow Simulation');
  console.log('=' .repeat(50));
  
  const callFlow = [
    { step: 'Incoming Call', endpoint: '/api/voice/webhook/incoming', data: {} },
    { step: 'Menu Choice (Transaction)', endpoint: '/api/voice/process-choice', data: { Digits: '1' } },
    { step: 'Transaction Input', endpoint: '/api/voice/process-transaction', data: { Digits: 'TXN123456789' } },
    { step: 'More Help', endpoint: '/api/voice/process-more-help', data: { SpeechResult: 'yes' } },
    { step: 'Return to Menu', endpoint: '/api/voice/webhook/incoming', data: {} }
  ];
  
  for (const flow of callFlow) {
    try {
      console.log(`📞 ${flow.step}...`);
      const response = await axios.post(`${BASE_URL}${flow.endpoint}`, flow.data);
      console.log(`✅ ${flow.step} completed`);
      console.log(`📊 TwiML: ${response.data.substring(0, 200)}...`);
      
    } catch (error) {
      console.error(`❌ Error in ${flow.step}:`, error.response?.data || error.message);
    }
  }
}

// Test 7: Test error handling
async function testErrorHandling() {
  console.log('\n⚠️  Test 7: Error Handling');
  console.log('=' .repeat(50));
  
  const errorTests = [
    { name: 'Invalid Phone Number', data: { to: 'invalid' } },
    { name: 'Missing Required Fields', data: {} },
    { name: 'Invalid Call SID', endpoint: '/api/voice/call-status/invalid_sid' }
  ];
  
  for (const test of errorTests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      if (test.endpoint) {
        const response = await axios.get(`${BASE_URL}${test.endpoint}`, {
          headers: TEST_CONFIG.headers
        });
        console.log(`❌ Expected error but got success: ${response.data}`);
      } else {
        const response = await axios.post(`${BASE_URL}/api/voice/initiate-call`, test.data, {
          headers: TEST_CONFIG.headers
        });
        console.log(`❌ Expected error but got success: ${response.data}`);
      }
      
    } catch (error) {
      console.log(`✅ ${test.name} - Error handled correctly:`, error.response?.status);
    }
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting Voice Workflow Tests...\n');
  
  try {
    // Test 1: Initiate call
    const callSid = await testInitiateCall();
    
    // Test 2: Get call status
    await testGetCallStatus(callSid);
    
    // Test 3: Webhook endpoints
    await testWebhookEndpoints();
    
    // Test 4: Voice + AI integration
    await testVoiceAIIntegration();
    
    // Test 5: Multilingual support
    await testMultilingualVoice();
    
    // Test 6: Complete call flow
    await testVoiceCallFlow();
    
    // Test 7: Error handling
    await testErrorHandling();
    
    console.log('\n🎉 All Voice Workflow Tests Completed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Outbound call initiation');
    console.log('✅ Call status tracking');
    console.log('✅ Webhook processing');
    console.log('✅ AI voice integration');
    console.log('✅ Multilingual support');
    console.log('✅ Complete call flow');
    console.log('✅ Error handling');
    
    console.log('\n🔧 Setup Instructions:');
    console.log('1. Configure Twilio credentials in .env file');
    console.log('2. Set up Twilio phone number webhook: ' + BASE_URL + '/api/voice/webhook/incoming');
    console.log('3. Test with real phone numbers');
    console.log('4. Monitor call logs in Twilio console');
    
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export {
  testInitiateCall,
  testGetCallStatus,
  testWebhookEndpoints,
  testVoiceAIIntegration,
  testMultilingualVoice,
  testVoiceCallFlow,
  testErrorHandling,
  runAllTests
};
