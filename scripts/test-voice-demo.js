#!/usr/bin/env node

/**
 * Voice Calling Demo Script
 * 
 * This script demonstrates how to use the voice calling features
 * with the Botim Remittance system.
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.REMITTANCE_API_BASE_URL || 'http://localhost:8070';

// Get JWT token for authentication
async function getAuthToken() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/token`, {
      userId: 'voice-demo',
      scope: 'read'
    });
    return response.data.token;
  } catch (error) {
    console.error('❌ Failed to get auth token:', error.message);
    process.exit(1);
  }
}

// Demo 1: Initiate outbound call
async function demoOutboundCall(token) {
  console.log('📞 Demo 1: Initiating Outbound Call');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/voice/initiate-call`, {
      to: '+1234567890', // Replace with your test phone number
      message: 'Hello! This is Aya from Botim Remittance. I have an important update about your transaction.',
      orderNo: 'TXN123456789'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Call initiated successfully!');
    console.log(`📱 Call SID: ${response.data.callSid}`);
    console.log(`💬 Message: ${response.data.message}`);
    
    return response.data.callSid;
    
  } catch (error) {
    console.error('❌ Failed to initiate call:', error.response?.data || error.message);
    return null;
  }
}

// Demo 2: Check call status
async function demoCallStatus(token, callSid) {
  if (!callSid) {
    console.log('⏭️  Skipping call status check - no call SID available');
    return;
  }
  
  console.log('\n📊 Demo 2: Checking Call Status');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.get(`${BASE_URL}/api/voice/call-status/${callSid}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Call status retrieved successfully!');
    console.log('📊 Call Details:');
    console.log(`   Status: ${response.data.call.status}`);
    console.log(`   Direction: ${response.data.call.direction}`);
    console.log(`   From: ${response.data.call.from}`);
    console.log(`   To: ${response.data.call.to}`);
    console.log(`   Duration: ${response.data.call.duration || 'N/A'} seconds`);
    
  } catch (error) {
    console.error('❌ Failed to get call status:', error.response?.data || error.message);
  }
}

// Demo 3: Simulate incoming call webhook
async function demoIncomingCallWebhook() {
  console.log('\n🔗 Demo 3: Simulating Incoming Call Webhook');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/voice/webhook/incoming`, {
      CallSid: 'demo_call_sid_123',
      From: '+1234567890',
      To: '+0987654321',
      CallStatus: 'ringing'
    });
    
    console.log('✅ Incoming call webhook processed!');
    console.log('📊 TwiML Response:');
    console.log(response.data);
    
  } catch (error) {
    console.error('❌ Failed to process incoming call webhook:', error.response?.data || error.message);
  }
}

// Demo 4: Simulate user menu selection
async function demoMenuSelection() {
  console.log('\n🎯 Demo 4: Simulating Menu Selection');
  console.log('=' .repeat(50));
  
  const menuOptions = [
    { option: '1', description: 'Transaction Status Inquiry' },
    { option: '2', description: 'General Questions (FAQ)' },
    { option: '3', description: 'Human Agent Transfer' },
    { option: '0', description: 'Repeat Menu' }
  ];
  
  for (const menu of menuOptions) {
    try {
      console.log(`\n📞 Testing option ${menu.option}: ${menu.description}`);
      
      const response = await axios.post(`${BASE_URL}/api/voice/process-choice`, {
        CallSid: 'demo_call_sid_123',
        Digits: menu.option
      });
      
      console.log('✅ Menu option processed!');
      console.log('📊 TwiML Response:');
      console.log(response.data.substring(0, 200) + '...');
      
    } catch (error) {
      console.error(`❌ Failed to process menu option ${menu.option}:`, error.response?.data || error.message);
    }
  }
}

// Demo 5: Simulate transaction inquiry
async function demoTransactionInquiry() {
  console.log('\n💳 Demo 5: Simulating Transaction Inquiry');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/voice/process-transaction`, {
      CallSid: 'demo_call_sid_123',
      Digits: 'TXN123456789'
    });
    
    console.log('✅ Transaction inquiry processed!');
    console.log('📊 TwiML Response:');
    console.log(response.data);
    
  } catch (error) {
    console.error('❌ Failed to process transaction inquiry:', error.response?.data || error.message);
  }
}

// Demo 6: Simulate FAQ inquiry
async function demoFAQInquiry() {
  console.log('\n❓ Demo 6: Simulating FAQ Inquiry');
  console.log('=' .repeat(50));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/voice/process-faq`, {
      CallSid: 'demo_call_sid_123',
      SpeechResult: 'What are your fees for sending money?'
    });
    
    console.log('✅ FAQ inquiry processed!');
    console.log('📊 TwiML Response:');
    console.log(response.data);
    
  } catch (error) {
    console.error('❌ Failed to process FAQ inquiry:', error.response?.data || error.message);
  }
}

// Main demo function
async function runVoiceDemo() {
  console.log('🎤 Voice Calling Demo - Botim Remittance');
  console.log('=' .repeat(60));
  console.log('This demo shows how to use the voice calling features.');
  console.log('Make sure your server is running and Twilio is configured.\n');
  
  try {
    // Get authentication token
    console.log('🔐 Getting authentication token...');
    const token = await getAuthToken();
    console.log('✅ Authentication successful!\n');
    
    // Demo 1: Outbound call
    const callSid = await demoOutboundCall(token);
    
    // Demo 2: Call status
    await demoCallStatus(token, callSid);
    
    // Demo 3: Incoming call webhook
    await demoIncomingCallWebhook();
    
    // Demo 4: Menu selection
    await demoMenuSelection();
    
    // Demo 5: Transaction inquiry
    await demoTransactionInquiry();
    
    // Demo 6: FAQ inquiry
    await demoFAQInquiry();
    
    console.log('\n🎉 Voice Calling Demo Completed!');
    console.log('\n📋 What was demonstrated:');
    console.log('✅ Outbound call initiation');
    console.log('✅ Call status tracking');
    console.log('✅ Incoming call webhook processing');
    console.log('✅ Menu navigation simulation');
    console.log('✅ Transaction inquiry handling');
    console.log('✅ FAQ inquiry processing');
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Configure your Twilio credentials in .env file');
    console.log('2. Set up webhook URLs in Twilio console');
    console.log('3. Test with real phone numbers');
    console.log('4. Monitor calls in Twilio dashboard');
    
    console.log('\n📚 Documentation:');
    console.log('- Voice Calling Guide: ./VOICE_CALLING_GUIDE.md');
    console.log('- AI Agent Implementation: ./CS_AI_AGENT_IMPLEMENTATION.md');
    console.log('- API Documentation: ./openapi.json');
    
  } catch (error) {
    console.error('💥 Demo failed:', error.message);
    process.exit(1);
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVoiceDemo();
}

export { runVoiceDemo };
