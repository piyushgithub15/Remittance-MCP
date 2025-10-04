import express from 'express';
import { z } from 'zod';
import RemittanceOrder from '../models/RemittanceOrder.js';

const router = express.Router();

// Validation schemas
const processInquirySchema = z.object({
  inquiry: z.string().min(1, 'Inquiry text is required'),
  customerId: z.string().optional(),
  orderNo: z.string().optional(),
  language: z.string().optional().default('en'),
  channel: z.enum(['email', 'call', 'chat']).default('chat')
});

const faqSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.string().optional(),
  language: z.string().optional().default('en')
});

const languageDetectionSchema = z.object({
  text: z.string().min(1, 'Text is required for language detection')
});

// AI Agent Persona: Aya
const AYA_PERSONA = {
  name: 'Aya',
  traits: {
    empathetic: true,
    multilingual: true,
    friendly: true,
    reassuring: true,
    concise: true,
    professional: true
  },
  tone: 'warm and conversational, but not overly casual',
  language: 'simple, everyday language',
  structure: 'short, structured, and to the point'
};

// FAQ Knowledge Base (from https://astratech.ae/platform-terms/faq/)
const FAQ_KNOWLEDGE_BASE = {
  'general': [
    {
      id: 'faq_001',
      question: 'What is Botim?',
      answer: 'Botim is a comprehensive communication and financial services platform that allows you to make video calls, send messages, and transfer money internationally.',
      keywords: ['what', 'botim', 'platform', 'service']
    },
    {
      id: 'faq_002',
      question: 'How do I create a Botim account?',
      answer: 'You can create a Botim account by downloading the app from your app store and following the registration process. You\'ll need a valid phone number and email address.',
      keywords: ['create', 'account', 'register', 'signup']
    },
    {
      id: 'faq_003',
      question: 'Is Botim free to use?',
      answer: 'Botim offers both free and premium services. Basic messaging and calls are free, while international money transfers and premium features may have associated fees.',
      keywords: ['free', 'cost', 'price', 'fee']
    },
    {
      id: 'faq_004',
      question: 'How secure is Botim?',
      answer: 'Botim uses end-to-end encryption for all communications and follows strict security protocols for financial transactions. Your data and money are protected with bank-level security.',
      keywords: ['secure', 'security', 'safe', 'encryption']
    }
  ],
  'remittance': [
    {
      id: 'rem_001',
      question: 'How do I send money internationally?',
      answer: 'To send money internationally, go to the Transfer section in the app, select your beneficiary, enter the amount, and follow the payment process. You can send to bank accounts, mobile wallets, or cash pickup locations.',
      keywords: ['send', 'money', 'international', 'transfer']
    },
    {
      id: 'rem_002',
      question: 'What are the transfer limits?',
      answer: 'Transfer limits vary by country and transfer method. You can check your specific limits in the app under Transfer Limits. Higher amounts may require additional verification.',
      keywords: ['limit', 'maximum', 'amount', 'restriction']
    },
    {
      id: 'rem_003',
      question: 'How long do transfers take?',
      answer: 'Transfer times vary by destination and method. Bank transfers typically take 1-2 business days, while mobile wallet transfers are usually instant to 30 minutes. Cash pickup is typically immediate to 2 hours.',
      keywords: ['time', 'duration', 'how long', 'delivery']
    },
    {
      id: 'rem_004',
      question: 'What documents do I need for transfers?',
      answer: 'For most transfers, you need a valid ID and proof of address. For larger amounts, additional verification documents may be required. The app will guide you through the specific requirements.',
      keywords: ['document', 'id', 'verification', 'kyc']
    }
  ],
  'technical': [
    {
      id: 'tech_001',
      question: 'Why can\'t I make calls?',
      answer: 'Please check your internet connection and ensure you have the latest app version. If issues persist, try restarting the app or checking your device\'s microphone permissions.',
      keywords: ['call', 'calling', 'audio']
    },
    {
      id: 'tech_002',
      question: 'How do I update the app?',
      answer: 'Go to your app store (Google Play or App Store) and search for Botim. If an update is available, tap "Update" to install the latest version.',
      keywords: ['update', 'upgrade', 'version', 'latest']
    }
  ]
};

// Language detection (simplified)
const detectLanguage = (text) => {
  // Simple language detection based on common words
  const arabicPattern = /[\u0600-\u06FF]/;
  const englishPattern = /[a-zA-Z]/;
  
  if (arabicPattern.test(text)) return 'ar';
  if (englishPattern.test(text)) return 'en';
  return 'en'; // default to English
};

// Generate Aya's response
const generateAyaResponse = (scenario, context, language = 'en') => {
  const responses = {
    'standard_inquiry': {
      en: "I completely understand your concern about your transaction. Let me check the status for you right away.",
      ar: "أفهم تماماً قلقك بشأن معاملتك. دعني أتحقق من الحالة لك فوراً."
    },
    'delayed_transaction': {
      en: "I completely understand your concern about the delay. Your transaction has already been processed successfully on our side. The updated delivery timeframe is shown in your app, and the delay is due to the beneficiary bank's processing schedule. Weekends and public holidays can cause additional delays, as many banks only process on working days. In most cases, the transfer completes earlier than shown — what you see is the maximum expected time.",
      ar: "أفهم تماماً قلقك بشأن التأخير. تمت معالجة معاملتك بنجاح من جانبنا. الإطار الزمني المحدث للتسليم معروض في تطبيقك، والتأخير بسبب جدول معالجة البنك المستفيد. يمكن أن تسبب عطلات نهاية الأسبوع والعطل الرسمية تأخيرات إضافية، حيث تعالج العديد من البنوك في أيام العمل فقط. في معظم الحالات، تكتمل التحويلات قبل الموعد المحدد - ما تراه هو الحد الأقصى للوقت المتوقع."
    },
    'non_receipt': {
      en: "I understand your concern about not receiving the funds. Let me verify the transaction status and investigate this for you immediately.",
      ar: "أفهم قلقك بشأن عدم استلام الأموال. دعني أتحقق من حالة المعاملة وأتحقق من ذلك لك فوراً."
    },
    'escalation': {
      en: "I understand this is important to you. Let me connect you with a human agent who can provide more detailed assistance. I'll make sure they have all the context from our conversation.",
      ar: "أفهم أن هذا مهم بالنسبة لك. دعني أوصلك بوكيل بشري يمكنه تقديم مساعدة أكثر تفصيلاً. سأتأكد من أن لديهم كل السياق من محادثتنا."
    }
  };

  return responses[scenario]?.[language] || responses[scenario]?.en || "I'm here to help you with your inquiry.";
};

// Routes

// Process customer inquiry
router.post('/process-inquiry', async (req, res) => {
  try {
    const validation = processInquirySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { inquiry, customerId, orderNo, language, channel } = validation.data;
    const userId = req.user?.userId || customerId || 'agent1';

    // Detect language if not provided
    const detectedLanguage = language || detectLanguage(inquiry);

    // Determine inquiry type
    let inquiryType = 'general';
    let response = '';
    let nextSteps = [];

    // Check if it's a transaction-related inquiry
    if (orderNo || inquiry.toLowerCase().includes('transaction') || inquiry.toLowerCase().includes('transfer')) {
      inquiryType = 'transaction';
      
      if (orderNo) {
        // Get transaction details
        const order = await RemittanceOrder.findOne({ orderNo, userId });
        if (order) {
          if (order.status?.toUpperCase() === 'PENDING') {
            response = generateAyaResponse('delayed_transaction', { order }, detectedLanguage);
            nextSteps.push('Check app for updated timeframe');
          } else if (order.status?.toUpperCase() === 'SUCCESS') {
            response = generateAyaResponse('standard_inquiry', { order }, detectedLanguage);
            nextSteps.push('Verify with beneficiary bank');
          } else if (order.status?.toUpperCase() === 'FAILED') {
            response = generateAyaResponse('non_receipt', { order }, detectedLanguage);
            nextSteps.push('Process refund to original payment method');
          }
        } else {
          response = generateAyaResponse('standard_inquiry', {}, detectedLanguage);
          nextSteps.push('Verify order number');
        }
      } else {
        response = generateAyaResponse('standard_inquiry', {}, detectedLanguage);
        nextSteps.push('Provide order number for assistance');
      }
    } else {
      // General FAQ inquiry
      const faqResults = searchFAQ(inquiry, 'general');
      if (faqResults.length > 0) {
        response = faqResults[0].answer;
        nextSteps.push('Check if this answers your question');
      } else {
        response = generateAyaResponse('standard_inquiry', {}, detectedLanguage);
        nextSteps.push('Provide more specific details');
      }
    }

    // Determine if escalation is needed
    const needsEscalation = shouldEscalate(inquiry, response);

    res.json({
      success: true,
      data: {
        inquiryType,
        language: detectedLanguage,
        response,
        nextSteps,
        needsEscalation,
        escalationReason: needsEscalation ? 'Complex inquiry requiring human assistance' : null,
        ayaPersona: AYA_PERSONA.name,
        channel,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing inquiry:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Search FAQ
router.post('/faq-search', async (req, res) => {
  try {
    const validation = faqSearchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { query, category, language } = validation.data;
    const results = searchFAQ(query, category, language);

    res.json({
      success: true,
      data: {
        query,
        category: category || 'all',
        language,
        results,
        totalResults: results.length
      }
    });

  } catch (error) {
    console.error('Error searching FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Detect language
router.post('/detect-language', async (req, res) => {
  try {
    const validation = languageDetectionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { text } = validation.data;
    const detectedLanguage = detectLanguage(text);

    res.json({
      success: true,
      data: {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        detectedLanguage,
        confidence: 0.85 // Simplified confidence score
      }
    });

  } catch (error) {
    console.error('Error detecting language:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Generate Aya response
router.post('/generate-response', async (req, res) => {
  try {
    const { scenario, context, language = 'en' } = req.body;
    
    if (!scenario) {
      return res.status(400).json({
        success: false,
        error: 'Scenario is required',
        message: 'Please provide a scenario for response generation'
      });
    }

    const response = generateAyaResponse(scenario, context, language);

    res.json({
      success: true,
      data: {
        scenario,
        language,
        response,
        ayaPersona: AYA_PERSONA.name,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Helper functions
const searchFAQ = (query, category = 'all', language = 'en') => {
  const searchQuery = query.toLowerCase();
  const results = [];

  const categoriesToSearch = category === 'all' ? Object.keys(FAQ_KNOWLEDGE_BASE) : [category];

  categoriesToSearch.forEach(cat => {
    if (FAQ_KNOWLEDGE_BASE[cat]) {
      FAQ_KNOWLEDGE_BASE[cat].forEach(faq => {
        const relevanceScore = calculateRelevance(searchQuery, faq.keywords, faq.question, faq.answer);
        if (relevanceScore > 0.3) {
          results.push({
            ...faq,
            category: cat,
            relevanceScore
          });
        }
      });
    }
  });

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
};

const calculateRelevance = (query, keywords, question, answer) => {
  const queryWords = query.split(' ');
  let score = 0;

  // Check keyword matches
  keywords.forEach(keyword => {
    if (queryWords.some(word => word.includes(keyword))) {
      score += 0.4;
    }
  });

  // Check question matches
  const questionWords = question.toLowerCase().split(' ');
  queryWords.forEach(word => {
    if (questionWords.some(qWord => qWord.includes(word))) {
      score += 0.3;
    }
  });

  // Check answer matches
  const answerWords = answer.toLowerCase().split(' ');
  queryWords.forEach(word => {
    if (answerWords.some(aWord => aWord.includes(word))) {
      score += 0.2;
    }
  });

  return Math.min(score, 1.0);
};

const shouldEscalate = (inquiry, response) => {
  const escalationKeywords = [
    'complaint', 'angry', 'frustrated', 'unsatisfied', 'escalate',
    'manager', 'supervisor', 'refund', 'cancel', 'dispute'
  ];

  const inquiryLower = inquiry.toLowerCase();
  return escalationKeywords.some(keyword => inquiryLower.includes(keyword));
};

export default router;

