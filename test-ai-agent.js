#!/usr/bin/env node

/**
 * Test script for AI Agent and Email Workflow API
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8070';

async function testAIAgentAPI() {
  console.log('🤖 Testing AI Agent and Email Workflow API...\n');

  try {
    // Test 1: Generate JWT token
    console.log('1. Generating JWT token...');
    const tokenResponse = await axios.post(`${BASE_URL}/auth/token`, {
      userId: 'test-user',
      scope: 'read'
    });
    const token = tokenResponse.data.token;
    console.log('✅ Token generated:', token.substring(0, 20) + '...');
    console.log('');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 2: Process general inquiry
    console.log('2. Testing general inquiry processing...');
    try {
      const inquiryResponse = await axios.post(`${BASE_URL}/api/ai-agent/process-inquiry`, {
        inquiry: "What is Botim and how does it work?",
        language: "en",
        channel: "chat"
      }, { headers });
      
      console.log('✅ General inquiry response:');
      console.log(JSON.stringify(inquiryResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ General inquiry error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 3: Process transaction inquiry
    console.log('3. Testing transaction inquiry processing...');
    try {
      const transactionResponse = await axios.post(`${BASE_URL}/api/ai-agent/process-inquiry`, {
        inquiry: "I want to check the status of my transaction",
        orderNo: "1705312200000ABC123",
        language: "en",
        channel: "call"
      }, { headers });
      
      console.log('✅ Transaction inquiry response:');
      console.log(JSON.stringify(transactionResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Transaction inquiry error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 4: FAQ search
    console.log('4. Testing FAQ search...');
    try {
      const faqResponse = await axios.post(`${BASE_URL}/api/ai-agent/faq-search`, {
        query: "transfer money internationally",
        category: "remittance",
        language: "en"
      }, { headers });
      
      console.log('✅ FAQ search response:');
      console.log(JSON.stringify(faqResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ FAQ search error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 5: Language detection
    console.log('5. Testing language detection...');
    try {
      const langResponse = await axios.post(`${BASE_URL}/api/ai-agent/detect-language`, {
        text: "مرحبا، أريد التحقق من حالة معاملتي"
      }, { headers });
      
      console.log('✅ Language detection response:');
      console.log(JSON.stringify(langResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Language detection error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 6: Generate Aya response
    console.log('6. Testing Aya response generation...');
    try {
      const ayaResponse = await axios.post(`${BASE_URL}/api/ai-agent/generate-response`, {
        scenario: "delayed_transaction",
        context: { orderNo: "1705312200000ABC123" },
        language: "en"
      }, { headers });
      
      console.log('✅ Aya response generation:');
      console.log(JSON.stringify(ayaResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Aya response generation error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 7: Email workflow - Document request
    console.log('7. Testing email workflow - Document request...');
    try {
      const docEmailResponse = await axios.post(`${BASE_URL}/api/email/send-document-request`, {
        orderNo: "1705312200000ABC123",
        customerEmail: "test@example.com",
        customerName: "John Smith",
        language: "en",
        documentType: "bank_statement"
      }, { headers });
      
      console.log('✅ Document request email response:');
      console.log(JSON.stringify(docEmailResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Document request email error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 8: Email workflow - Status update
    console.log('8. Testing email workflow - Status update...');
    try {
      const statusEmailResponse = await axios.post(`${BASE_URL}/api/email/send-status-update`, {
        orderNo: "1705312200000ABC123",
        customerEmail: "test@example.com",
        customerName: "John Smith",
        status: "SUCCESS",
        language: "en"
      }, { headers });
      
      console.log('✅ Status update email response:');
      console.log(JSON.stringify(statusEmailResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Status update email error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 9: Email workflow - Escalation notification
    console.log('9. Testing email workflow - Escalation notification...');
    try {
      const escalationEmailResponse = await axios.post(`${BASE_URL}/api/email/send-escalation-notification`, {
        orderNo: "1705312200000ABC123",
        customerEmail: "test@example.com",
        customerName: "John Smith",
        escalationReason: "customer_unsatisfied",
        conversationSummary: "Customer is concerned about transaction delay and wants faster processing",
        language: "en"
      }, { headers });
      
      console.log('✅ Escalation notification email response:');
      console.log(JSON.stringify(escalationEmailResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Escalation notification email error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 10: Get email templates
    console.log('10. Testing email templates...');
    try {
      const templatesResponse = await axios.get(`${BASE_URL}/api/email/templates`, { headers });
      
      console.log('✅ Email templates response:');
      console.log(JSON.stringify(templatesResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Email templates error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 11: Test Arabic language support
    console.log('11. Testing Arabic language support...');
    try {
      const arabicResponse = await axios.post(`${BASE_URL}/api/ai-agent/process-inquiry`, {
        inquiry: "أريد التحقق من حالة معاملتي",
        language: "ar",
        channel: "call"
      }, { headers });
      
      console.log('✅ Arabic inquiry response:');
      console.log(JSON.stringify(arabicResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Arabic inquiry error:', error.response?.data || error.message);
      console.log('');
    }

    // Test 12: Test escalation detection
    console.log('12. Testing escalation detection...');
    try {
      const escalationResponse = await axios.post(`${BASE_URL}/api/ai-agent/process-inquiry`, {
        inquiry: "I'm very angry and frustrated with this service. I want to speak to a manager immediately!",
        language: "en",
        channel: "call"
      }, { headers });
      
      console.log('✅ Escalation detection response:');
      console.log(JSON.stringify(escalationResponse.data, null, 2));
      console.log('');
    } catch (error) {
      console.log('❌ Escalation detection error:', error.response?.data || error.message);
      console.log('');
    }

    console.log('🎉 AI Agent and Email Workflow API testing completed!');
    console.log('');
    console.log('📋 Available AI Agent endpoints:');
    console.log('   - POST /api/ai-agent/process-inquiry - Process customer inquiries');
    console.log('   - POST /api/ai-agent/faq-search - Search FAQ knowledge base');
    console.log('   - POST /api/ai-agent/detect-language - Detect customer language');
    console.log('   - POST /api/ai-agent/generate-response - Generate Aya responses');
    console.log('');
    console.log('📧 Available Email Workflow endpoints:');
    console.log('   - POST /api/email/send-document-request - Send document request emails');
    console.log('   - POST /api/email/send-status-update - Send status update emails');
    console.log('   - POST /api/email/send-escalation-notification - Send escalation emails');
    console.log('   - GET /api/email/templates - Get available email templates');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the server is running: npm start');
    }
  }
}

// Run tests
testAIAgentAPI();

