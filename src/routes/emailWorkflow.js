import express from 'express';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const router = express.Router();

// Validation schemas
const sendDocumentRequestSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  customerEmail: z.string().email('Valid email address is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  language: z.string().optional().default('en'),
  documentType: z.enum(['bank_statement', 'receipt', 'id_verification']).default('bank_statement')
});

const sendStatusUpdateSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  customerEmail: z.string().email('Valid email address is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  status: z.string().min(1, 'Status is required'),
  language: z.string().optional().default('en')
});

const sendEscalationNotificationSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  customerEmail: z.string().email('Valid email address is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  escalationReason: z.string().min(1, 'Escalation reason is required'),
  conversationSummary: z.string().min(1, 'Conversation summary is required'),
  language: z.string().optional().default('en')
});

// Email templates
const EMAIL_TEMPLATES = {
  document_request: {
    en: {
      subject: 'Document Required for Transaction Investigation - Order #{orderNo}',
      body: `
Dear {customerName},

Thank you for contacting us regarding your transaction #{orderNo}.

To investigate your case further, we need you to provide the following document:

**Required Document: {documentType}**
- Bank statement showing account activity for the transaction period
- Please ensure the statement covers the date range when the transaction was processed
- The document should clearly show the account details and transaction history

**How to Submit:**
1. Reply to this email with the document attached
2. Or upload it through our secure portal: {uploadUrl}
3. Ensure the document is clear and readable

**Important Notes:**
- Your document will be handled with strict confidentiality
- We will review your case within 24-48 hours of receiving the document
- If you have any questions, please don't hesitate to contact us

Thank you for your cooperation.

Best regards,
Aya - Customer Service Team
Botim Support
      `,
      footer: `
---
This is an automated message. Please do not reply directly to this email.
For immediate assistance, contact us at support@botim.com or call +971-4-XXX-XXXX
      `
    },
    ar: {
      subject: 'مطلوب مستند للتحقيق في المعاملة - طلب #{orderNo}',
      body: `
عزيزي/عزيزتي {customerName}،

شكراً لتواصلك معنا بشأن معاملتك #{orderNo}.

للتحقيق في قضيتك بشكل أكبر، نحتاج منك تقديم المستند التالي:

**المستند المطلوب: {documentType}**
- كشف حساب بنكي يوضح نشاط الحساب لفترة المعاملة
- يرجى التأكد من أن الكشف يغطي الفترة الزمنية التي تمت فيها المعاملة
- يجب أن يوضح المستند تفاصيل الحساب وتاريخ المعاملات بوضوح

**كيفية التقديم:**
1. أرسل رداً على هذا البريد الإلكتروني مع إرفاق المستند
2. أو قم بتحميله من خلال بوابتنا الآمنة: {uploadUrl}
3. تأكد من أن المستند واضح ومقروء

**ملاحظات مهمة:**
- سيتم التعامل مع مستندك بسرية تامة
- سنراجع قضيتك خلال 24-48 ساعة من استلام المستند
- إذا كان لديك أي أسئلة، فلا تتردد في الاتصال بنا

شكراً لتعاونك.

مع أطيب التحيات،
آية - فريق خدمة العملاء
دعم بوتيم
      `,
      footer: `
---
هذه رسالة آلية. يرجى عدم الرد مباشرة على هذا البريد الإلكتروني.
للحصول على مساعدة فورية، اتصل بنا على support@botim.com أو اتصل بـ +971-4-XXX-XXXX
      `
    }
  },
  status_update: {
    en: {
      subject: 'Transaction Status Update - Order #{orderNo}',
      body: `
Dear {customerName},

We have an update regarding your transaction #{orderNo}.

**Current Status: {status}**

{statusMessage}

**Next Steps:**
{nextSteps}

If you have any questions or need further assistance, please don't hesitate to contact us.

Best regards,
Aya - Customer Service Team
Botim Support
      `,
      footer: `
---
This is an automated message. Please do not reply directly to this email.
For immediate assistance, contact us at support@botim.com or call +971-4-XXX-XXXX
      `
    },
    ar: {
      subject: 'تحديث حالة المعاملة - طلب #{orderNo}',
      body: `
عزيزي/عزيزتي {customerName}،

لدينا تحديث بشأن معاملتك #{orderNo}.

**الحالة الحالية: {status}**

{statusMessage}

**الخطوات التالية:**
{nextSteps}

إذا كان لديك أي أسئلة أو تحتاج إلى مساعدة إضافية، فلا تتردد في الاتصال بنا.

مع أطيب التحيات،
آية - فريق خدمة العملاء
دعم بوتيم
      `,
      footer: `
---
هذه رسالة آلية. يرجى عدم الرد مباشرة على هذا البريد الإلكتروني.
للحصول على مساعدة فورية، اتصل بنا على support@botim.com أو اتصل بـ +971-4-XXX-XXXX
      `
    }
  },
  escalation_notification: {
    en: {
      subject: 'Your Case Has Been Escalated - Order #{orderNo}',
      body: `
Dear {customerName},

Your inquiry regarding transaction #{orderNo} has been escalated to our senior customer service team.

**Escalation Reason: {escalationReason}**

**Conversation Summary:**
{conversationSummary}

**What Happens Next:**
- A senior agent will review your case within 2-4 hours
- You will receive a call or email with detailed assistance
- All context from our conversation has been provided to the agent

**Expected Response Time:**
- Email inquiries: Within 4 hours
- Phone inquiries: Within 2 hours

We appreciate your patience and will ensure your concern is addressed promptly.

Best regards,
Aya - Customer Service Team
Botim Support
      `,
      footer: `
---
This is an automated message. Please do not reply directly to this email.
For immediate assistance, contact us at support@botim.com or call +971-4-XXX-XXXX
      `
    },
    ar: {
      subject: 'تم تصعيد قضيتك - طلب #{orderNo}',
      body: `
عزيزي/عزيزتي {customerName}،

تم تصعيد استفسارك بشأن المعاملة #{orderNo} إلى فريق خدمة العملاء المتقدم.

**سبب التصعيد: {escalationReason}**

**ملخص المحادثة:**
{conversationSummary}

**ما يحدث بعد ذلك:**
- سيراجع وكيل متقدم قضيتك خلال 2-4 ساعات
- ستتلقى مكالمة أو بريد إلكتروني مع مساعدة مفصلة
- تم توفير كل السياق من محادثتنا للوكيل

**وقت الاستجابة المتوقع:**
- استفسارات البريد الإلكتروني: خلال 4 ساعات
- استفسارات الهاتف: خلال ساعتين

نقدر صبرك وسنتأكد من معالجة قلقك بسرعة.

مع أطيب التحيات،
آية - فريق خدمة العملاء
دعم بوتيم
      `,
      footer: `
---
هذه رسالة آلية. يرجى عدم الرد مباشرة على هذا البريد الإلكتروني.
للحصول على مساعدة فورية، اتصل بنا على support@botim.com أو اتصل بـ +971-4-XXX-XXXX
      `
    }
  }
};

// Email configuration
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'your-email@gmail.com',
      pass: process.env.SMTP_PASS || 'your-app-password'
    }
  });
};

// Routes

// Send document request email
router.post('/send-document-request', async (req, res) => {
  try {
    const validation = sendDocumentRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, customerEmail, customerName, language, documentType } = validation.data;

    const template = EMAIL_TEMPLATES.document_request[language] || EMAIL_TEMPLATES.document_request.en;
    
    const emailContent = {
      subject: template.subject.replace('{orderNo}', orderNo),
      html: template.body
        .replace(/{customerName}/g, customerName)
        .replace(/{orderNo}/g, orderNo)
        .replace(/{documentType}/g, documentType)
        .replace(/{uploadUrl}/g, `${process.env.BASE_URL}/upload-documents`)
        + template.footer
    };

    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@botim.com',
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      data: {
        orderNo,
        customerEmail,
        documentType,
        language,
        sentAt: new Date().toISOString(),
        message: 'Document request email sent successfully'
      }
    });

  } catch (error) {
    console.error('Error sending document request email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// Send status update email
router.post('/send-status-update', async (req, res) => {
  try {
    const validation = sendStatusUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, customerEmail, customerName, status, language } = validation.data;

    const template = EMAIL_TEMPLATES.status_update[language] || EMAIL_TEMPLATES.status_update.en;
    
    const statusMessages = {
      'SUCCESS': 'Your transaction has been completed successfully.',
      'FAILED': 'Unfortunately, your transaction could not be completed.',
      'PENDING': 'Your transaction is currently being processed.',
      'CANCELLED': 'Your transaction has been cancelled.',
      'AML_HOLD': 'Your transaction is under review for compliance purposes.'
    };

    const nextSteps = {
      'SUCCESS': 'Please check with the beneficiary bank for final confirmation.',
      'FAILED': 'A refund will be processed to your original payment method.',
      'PENDING': 'Please wait for the processing to complete.',
      'CANCELLED': 'No further action is required.',
      'AML_HOLD': 'We will contact you if additional information is needed.'
    };

    const emailContent = {
      subject: template.subject.replace('{orderNo}', orderNo),
      html: template.body
        .replace(/{customerName}/g, customerName)
        .replace(/{orderNo}/g, orderNo)
        .replace(/{status}/g, status)
        .replace(/{statusMessage}/g, statusMessages[status] || 'Status update available.')
        .replace(/{nextSteps}/g, nextSteps[status] || 'Please contact support for assistance.')
        + template.footer
    };

    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@botim.com',
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      data: {
        orderNo,
        customerEmail,
        status,
        language,
        sentAt: new Date().toISOString(),
        message: 'Status update email sent successfully'
      }
    });

  } catch (error) {
    console.error('Error sending status update email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// Send escalation notification email
router.post('/send-escalation-notification', async (req, res) => {
  try {
    const validation = sendEscalationNotificationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validation.error.errors[0].message
      });
    }

    const { orderNo, customerEmail, customerName, escalationReason, conversationSummary, language } = validation.data;

    const template = EMAIL_TEMPLATES.escalation_notification[language] || EMAIL_TEMPLATES.escalation_notification.en;
    
    const emailContent = {
      subject: template.subject.replace('{orderNo}', orderNo),
      html: template.body
        .replace(/{customerName}/g, customerName)
        .replace(/{orderNo}/g, orderNo)
        .replace(/{escalationReason}/g, escalationReason)
        .replace(/{conversationSummary}/g, conversationSummary)
        + template.footer
    };

    const transporter = createEmailTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@botim.com',
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      data: {
        orderNo,
        customerEmail,
        escalationReason,
        language,
        sentAt: new Date().toISOString(),
        message: 'Escalation notification email sent successfully'
      }
    });

  } catch (error) {
    console.error('Error sending escalation notification email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      message: error.message
    });
  }
});

// Get email templates (for testing/preview)
router.get('/templates', (req, res) => {
  res.json({
    success: true,
    data: {
      templates: Object.keys(EMAIL_TEMPLATES),
      languages: ['en', 'ar'],
      message: 'Email templates available'
    }
  });
});

export default router;

