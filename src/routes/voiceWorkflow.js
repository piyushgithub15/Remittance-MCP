import express from 'express';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Twilio webhook for incoming calls
router.post('/webhook/incoming', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Greet the caller with Aya's voice
  twiml.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Hello! This is Aya from Botim Remittance. How can I help you today?');
  
  // Gather user input
  const gather = twiml.gather({
    numDigits: 1,
    action: '/api/voice/process-choice',
    method: 'POST'
  });
  
  gather.say({
    voice: 'alice',
    language: 'en-US'
  }, 'Press 1 for transaction status inquiry, 2 for general questions, 3 to speak with a human agent, or 0 to repeat this menu.');
  
  // If no input, repeat the menu
  twiml.say({
    voice: 'alice',
    language: 'en-US'
  }, 'I didn\'t receive any input. Please try again.');
  twiml.redirect('/api/voice/webhook/incoming');
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Process user choice
router.post('/process-choice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const digits = req.body.Digits;
  
  switch (digits) {
    case '1':
      // Transaction status inquiry
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Please enter your transaction reference number using your phone keypad, followed by the hash key.');
      
      const gather = twiml.gather({
        numDigits: 10,
        action: '/api/voice/process-transaction',
        method: 'POST',
        finishOnKey: '#'
      });
      
      gather.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Enter your transaction reference number now.');
      
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I didn\'t receive a valid reference number. Please try again.');
      twiml.redirect('/api/voice/process-choice');
      break;
      
    case '2':
      // General questions - FAQ
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I can help you with common questions about our remittance service. What would you like to know?');
      
      const faqGather = twiml.gather({
        input: 'speech',
        action: '/api/voice/process-faq',
        method: 'POST',
        speechTimeout: 3
      });
      
      faqGather.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Please tell me your question.');
      
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I didn\'t hear your question. Please try again.');
      twiml.redirect('/api/voice/process-choice');
      break;
      
    case '3':
      // Transfer to human agent
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I\'m transferring you to one of our customer service representatives. Please hold on.');
      twiml.dial(process.env.TWILIO_AGENT_PHONE || '+1234567890');
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I\'m sorry, but our agents are currently unavailable. Please try again later or contact us through our app.');
      break;
      
    case '0':
      // Repeat menu
      twiml.redirect('/api/voice/webhook/incoming');
      break;
      
    default:
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Invalid option. Please try again.');
      twiml.redirect('/api/voice/process-choice');
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Process transaction inquiry


// Process FAQ inquiry
router.post('/process-faq', async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const speechResult = req.body.SpeechResult;
  
  try {
    // Import AI agent functions
    const { processInquiry } = await import('./aiAgent.js');
    
    // Process the FAQ inquiry
    const result = await processInquiry({
      inquiry: speechResult,
      language: 'en',
      channel: 'voice'
    });
    
    if (result.success) {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, result.response);
    } else {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I understand your question, but I need to connect you with a human agent for a more detailed answer.');
      twiml.dial(process.env.TWILIO_AGENT_PHONE || '+1234567890');
    }
  } catch (error) {
    console.error('Error processing FAQ:', error);
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'I\'m sorry, I couldn\'t process your question. Let me connect you with a human agent.');
    twiml.dial(process.env.TWILIO_AGENT_PHONE || '+1234567890');
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Process more help request
router.post('/process-more-help', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const speechResult = req.body.SpeechResult;
  
  if (speechResult && speechResult.toLowerCase().includes('yes')) {
    twiml.redirect('/api/voice/webhook/incoming');
  } else {
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for calling Botim Remittance. Have a great day!');
    twiml.hangup();
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Initiate outbound call
router.post('/initiate-call', async (req, res) => {
  try {
    const { to, message, orderNo } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Create TwiML for outbound call
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (message) {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, message);
    }
    
    if (orderNo) {
      // Add transaction-specific information
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, `Regarding your transaction ${orderNo}, I have an important update for you.`);
    }
    
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Please press any key to continue or stay on the line to speak with our customer service team.');
    
    // Gather input for further interaction
    const gather = twiml.gather({
      numDigits: 1,
      action: '/api/voice/process-outbound-choice',
      method: 'POST'
    });
    
    gather.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Press 1 to speak with an agent, 2 to hear more information, or 0 to end this call.');
    
    // If no input, hang up
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for your time. Goodbye.');
    twiml.hangup();
    
    // Make the call
    const call = await client.calls.create({
      twiml: twiml.toString(),
      to: to,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    res.json({
      success: true,
      callSid: call.sid,
      message: 'Call initiated successfully'
    });
    
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate call',
      message: error.message
    });
  }
});

// Process outbound call choices
router.post('/process-outbound-choice', (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  const digits = req.body.Digits;
  
  switch (digits) {
    case '1':
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I\'m transferring you to one of our customer service representatives.');
      twiml.dial(process.env.TWILIO_AGENT_PHONE || '+1234567890');
      break;
      
    case '2':
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'For more information about your transaction, please visit our app or website. You can also call us back at any time.');
      break;
      
    case '0':
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Thank you for your time. Goodbye.');
      twiml.hangup();
      break;
      
    default:
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Invalid option. Please try again.');
      twiml.redirect('/api/voice/process-outbound-choice');
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Get call status
router.get('/call-status/:callSid', async (req, res) => {
  try {
    const { callSid } = req.params;
    const call = await client.calls(callSid).fetch();
    
    res.json({
      success: true,
      call: {
        sid: call.sid,
        status: call.status,
        direction: call.direction,
        from: call.from,
        to: call.to,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration
      }
    });
  } catch (error) {
    console.error('Error fetching call status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call status',
      message: error.message
    });
  }
});

// Helper function to get status message
function getStatusMessage(status) {
  const statusMessages = {
    'PENDING': 'pending approval',
    'APPROVED': 'approved and being processed',
    'PROCESSING': 'currently being processed',
    'COMPLETED': 'completed successfully',
    'FAILED': 'failed',
    'CANCELLED': 'cancelled'
  };
  
  return statusMessages[status] || status.toLowerCase();
}

// Helper function to get status details
function getStatusDetails(status) {
  const statusDetails = {
    'PENDING': 'Your transaction is being reviewed and will be processed shortly.',
    'APPROVED': 'Your transaction has been approved and is being sent to the recipient.',
    'PROCESSING': 'Your transaction is currently being processed by our banking partners.',
    'COMPLETED': 'Your transaction has been completed and the funds have been delivered.',
    'FAILED': 'Unfortunately, your transaction could not be completed. Please contact support for assistance.',
    'CANCELLED': 'Your transaction has been cancelled. If you need to send money, please initiate a new transaction.'
  };
  
  return statusDetails[status] || 'Please contact our support team for more information.';
}

export default router;
