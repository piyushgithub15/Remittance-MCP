# Voice Calling Integration Guide

## 🎤 Overview

This guide covers the complete voice calling integration using Twilio with AI voice responses for the Botim Remittance system. The system provides both inbound and outbound calling capabilities with intelligent AI voice responses.

## 🚀 Features

### **Inbound Calling**
- ✅ **AI Voice Greeting**: Aya persona greets callers
- ✅ **Interactive Menu**: Voice-driven navigation
- ✅ **Transaction Status**: Voice-based transaction inquiries
- ✅ **FAQ Support**: AI-powered FAQ responses
- ✅ **Human Escalation**: Seamless transfer to agents
- ✅ **Multilingual Support**: English and Arabic voice

### **Outbound Calling**
- ✅ **Proactive Notifications**: Transaction updates via voice
- ✅ **Status Alerts**: Important transaction notifications
- ✅ **Follow-up Calls**: Customer service outreach
- ✅ **Appointment Reminders**: Scheduled callbacks

## 🔧 Setup Instructions

### **1. Twilio Account Setup**

1. **Create Twilio Account**
   - Sign up at [twilio.com](https://www.twilio.com)
   - Verify your phone number
   - Get your Account SID and Auth Token

2. **Purchase Phone Number**
   - Buy a Twilio phone number
   - Configure webhook URL: `https://your-domain.com/api/voice/webhook/incoming`

3. **Environment Configuration**
   ```bash
   # Add to your .env file
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_AGENT_PHONE=+1234567890
   ```

### **2. Webhook Configuration**

Configure your Twilio phone number webhook:
- **Voice URL**: `https://your-domain.com/api/voice/webhook/incoming`
- **HTTP Method**: POST
- **Fallback URL**: `https://your-domain.com/api/voice/webhook/incoming`

## 📞 API Endpoints

### **Voice Workflow APIs**

#### **1. Incoming Call Webhook**
```http
POST /api/voice/webhook/incoming
```
- **Purpose**: Handles incoming calls
- **Response**: TwiML for call flow
- **Features**: AI greeting, menu navigation

#### **2. Process User Choice**
```http
POST /api/voice/process-choice
```
- **Purpose**: Processes menu selections
- **Parameters**: `Digits` (1-3, 0)
- **Options**:
  - 1: Transaction status inquiry
  - 2: General questions (FAQ)
  - 3: Human agent transfer
  - 0: Repeat menu

#### **3. Process Transaction Inquiry**
```http
POST /api/voice/process-transaction
```
- **Purpose**: Handles transaction status requests
- **Parameters**: `Digits` (transaction reference)
- **Response**: Voice status update

#### **4. Process FAQ**
```http
POST /api/voice/process-faq
```
- **Purpose**: Handles general questions
- **Parameters**: `SpeechResult` (voice input)
- **Response**: AI-generated answers

#### **5. Initiate Outbound Call**
```http
POST /api/voice/initiate-call
```
- **Purpose**: Makes outbound calls
- **Body**:
  ```json
  {
    "to": "+1234567890",
    "message": "Hello! This is Aya from Botim Remittance.",
    "orderNo": "TXN123456789"
  }
  ```

#### **6. Get Call Status**
```http
GET /api/voice/call-status/:callSid
```
- **Purpose**: Retrieves call information
- **Response**: Call details and status

## 🤖 AI Voice Integration

### **Aya Voice Persona**

The AI voice system uses the Aya persona with the following characteristics:

- **Voice**: Alice (Twilio's natural voice)
- **Language**: English (primary), Arabic (secondary)
- **Tone**: Empathetic, professional, reassuring
- **Style**: Conversational, clear, concise

### **Voice Response Features**

1. **Natural Language Processing**
   - Speech-to-text conversion
   - Intent recognition
   - Context awareness

2. **Multilingual Support**
   - English voice responses
   - Arabic voice responses
   - Language detection

3. **Intelligent Routing**
   - FAQ knowledge base
   - Transaction status lookup
   - Human agent escalation

## 📋 Call Flow Examples

### **Inbound Call Flow**

```
1. Caller dials Twilio number
2. Aya greets: "Hello! This is Aya from Botim Remittance..."
3. Menu options presented:
   - Press 1: Transaction status
   - Press 2: General questions
   - Press 3: Human agent
   - Press 0: Repeat menu
4. User selects option
5. AI processes request
6. Response provided
7. Additional help offered
8. Call ends or escalates
```

### **Outbound Call Flow**

```
1. System initiates call
2. Aya introduces: "Hello! This is Aya from Botim Remittance..."
3. Important message delivered
4. Options presented:
   - Press 1: Speak with agent
   - Press 2: More information
   - Press 0: End call
5. User interaction
6. Call completion
```

## 🧪 Testing

### **Test Scripts**

Run the comprehensive voice testing suite:

```bash
# Test all voice functionality
npm run test-voice

# Test specific components
node test-voice-workflow.js
```

### **Test Coverage**

- ✅ **Outbound Call Initiation**
- ✅ **Call Status Tracking**
- ✅ **Webhook Processing**
- ✅ **AI Voice Integration**
- ✅ **Multilingual Support**
- ✅ **Complete Call Flow**
- ✅ **Error Handling**

### **Manual Testing**

1. **Test Inbound Calls**
   - Call your Twilio number
   - Test menu navigation
   - Test transaction inquiries
   - Test FAQ responses

2. **Test Outbound Calls**
   - Use the API to initiate calls
   - Test with different messages
   - Verify call status tracking

## 🔒 Security Considerations

### **Authentication**
- JWT token required for API access
- Webhook signature validation
- Rate limiting on voice endpoints

### **Privacy**
- Call recording compliance
- Data encryption in transit
- Secure credential storage

### **Rate Limiting**
- Voice API: 10 calls/minute
- Webhook processing: No limits
- Outbound calls: 5 calls/minute per user

## 📊 Monitoring & Analytics

### **Call Metrics**
- Call volume tracking
- Response time monitoring
- Success/failure rates
- User satisfaction metrics

### **AI Performance**
- Response accuracy
- Escalation rates
- Language detection accuracy
- FAQ effectiveness

## 🚀 Deployment

### **Production Setup**

1. **Environment Variables**
   ```bash
   TWILIO_ACCOUNT_SID=prod_account_sid
   TWILIO_AUTH_TOKEN=prod_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   TWILIO_AGENT_PHONE=+1234567890
   ```

2. **Webhook URLs**
   - Update Twilio webhook URLs
   - Use HTTPS endpoints
   - Configure fallback URLs

3. **Monitoring**
   - Set up call monitoring
   - Configure alerts
   - Monitor performance

### **Docker Deployment**

```bash
# Build and run with voice support
docker-compose -f docker-compose.api.yml up -d

# Test voice functionality
npm run test-voice
```

## 📈 Performance Optimization

### **Voice Quality**
- Use high-quality voice models
- Optimize TwiML responses
- Minimize latency

### **Scalability**
- Load balancing for webhooks
- Database connection pooling
- Caching for frequent requests

### **Cost Optimization**
- Efficient call routing
- Smart escalation logic
- Call duration optimization

## 🔧 Troubleshooting

### **Common Issues**

1. **Webhook Not Receiving Calls**
   - Check webhook URL configuration
   - Verify HTTPS certificate
   - Test webhook endpoint

2. **Voice Quality Issues**
   - Check Twilio account status
   - Verify phone number configuration
   - Test with different devices

3. **AI Response Issues**
   - Check AI agent configuration
   - Verify database connectivity
   - Test with sample data

### **Debug Commands**

```bash
# Check webhook logs
curl -X POST https://your-domain.com/api/voice/webhook/incoming

# Test call initiation
curl -X POST https://your-domain.com/api/voice/initiate-call \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"to": "+1234567890", "message": "Test message"}'

# Check call status
curl -X GET https://your-domain.com/api/voice/call-status/CALL_SID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📚 Additional Resources

- [Twilio Voice API Documentation](https://www.twilio.com/docs/voice)
- [TwiML Reference](https://www.twilio.com/docs/voice/twiml)
- [Voice Best Practices](https://www.twilio.com/docs/voice/best-practices)
- [AI Integration Guide](./CS_AI_AGENT_IMPLEMENTATION.md)

## 🎉 Success Metrics

### **Voice Call Metrics**
- **Call Volume**: Track daily/monthly calls
- **Resolution Rate**: % of calls resolved without escalation
- **Average Call Duration**: Optimize for efficiency
- **Customer Satisfaction**: Voice call ratings

### **AI Performance**
- **Response Accuracy**: % of correct AI responses
- **Escalation Rate**: % of calls escalated to humans
- **Language Detection**: Accuracy of language identification
- **FAQ Effectiveness**: % of questions answered by AI

---

**Ready for Production Voice Calling!** 🎤✨
