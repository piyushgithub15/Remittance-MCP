import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Validation schema for email sending
export const emailServiceSchema = z.object({
  customerEmail: z.string().email('Invalid email address'),
  orderNo: z.string().min(1, 'orderNo is required'),
  emailType: z.enum(['bank_details_submission', 'status_update', 'dispute_resolution']).default('bank_details_submission'),
  customerName: z.string().optional(),
  additionalMessage: z.string().optional()
});

// Email templates
const EMAIL_TEMPLATES = {
  bank_details_submission: {
    subject: 'Action Required: Bank Details Submission for Transaction {{orderNo}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bank Details Submission Required</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { padding: 20px; }
          .button { 
            display: inline-block; 
            background-color: #007bff; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0;
          }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
          .highlight { background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Transaction Dispute Resolution</h2>
            <p>Order Number: <strong>{{orderNo}}</strong></p>
          </div>
          
          <div class="content">
            <p>Dear {{customerName}},</p>
            
            <p>We understand your concern regarding transaction <strong>{{orderNo}}</strong> where the beneficiary has not received the funds despite showing as completed in our system.</p>
            
            <div class="highlight">
              <h3>🔍 Investigation Required</h3>
              <p>To help us investigate this matter thoroughly, we need you to provide the beneficiary's bank details through our secure portal.</p>
            </div>
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Click the button below to access our secure submission portal</li>
              <li>Enter the beneficiary's complete bank account details</li>
              <li>Upload any relevant bank statements or documents</li>
              <li>Submit the form for our team to review</li>
            </ol>
            
            <div style="text-align: center;">
              <a href="{{submissionUrl}}" class="button">Submit Bank Details</a>
            </div>
            
            <h3>What We'll Do:</h3>
            <ul>
              <li>Verify the beneficiary's bank account details</li>
              <li>Contact the beneficiary bank directly</li>
              <li>Trace the transaction through the banking network</li>
              <li>Provide you with a detailed resolution within 2-3 business days</li>
            </ul>
            
            <div class="highlight">
              <p><strong>Important:</strong> This link is valid for 7 days and is unique to your transaction. Please do not share it with others.</p>
            </div>
            
            <p>If you have any questions or need assistance, please contact our support team immediately.</p>
            
            <p>Thank you for your patience and cooperation.</p>
            
            <p>Best regards,<br>
            Remittance Support Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent regarding transaction {{orderNo}}. If you did not request this assistance, please contact us immediately.</p>
            <p>© 2024 Remittance Service. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Transaction Dispute Resolution - Order {{orderNo}}
      
      Dear {{customerName}},
      
      We understand your concern regarding transaction {{orderNo}} where the beneficiary has not received the funds despite showing as completed in our system.
      
      INVESTIGATION REQUIRED
      To help us investigate this matter thoroughly, we need you to provide the beneficiary's bank details through our secure portal.
      
      Next Steps:
      1. Visit: {{submissionUrl}}
      2. Enter the beneficiary's complete bank account details
      3. Upload any relevant bank statements or documents
      4. Submit the form for our team to review
      
      What We'll Do:
      - Verify the beneficiary's bank account details
      - Contact the beneficiary bank directly
      - Trace the transaction through the banking network
      - Provide you with a detailed resolution within 2-3 business days
      
      Important: This link is valid for 7 days and is unique to your transaction.
      
      If you have any questions, please contact our support team immediately.
      
      Best regards,
      Remittance Support Team
    `
  },
  
  status_update: {
    subject: 'Transaction Status Update - {{orderNo}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Transaction Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .status-success { background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; }
          .status-failed { background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; }
          .status-pending { background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Transaction Status Update</h2>
          <p>Order Number: <strong>{{orderNo}}</strong></p>
          
          <div class="status-{{statusClass}}">
            <h3>Status: {{status}}</h3>
            <p>{{statusMessage}}</p>
          </div>
          
          <p>{{additionalMessage}}</p>
          
          <p>Best regards,<br>Remittance Support Team</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Transaction Status Update - {{orderNo}}
      
      Status: {{status}}
      {{statusMessage}}
      
      {{additionalMessage}}
      
      Best regards,
      Remittance Support Team
    `
  },
  
  dispute_resolution: {
    subject: 'Dispute Resolution Update - {{orderNo}}',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dispute Resolution Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Dispute Resolution Update</h2>
          <p>Order Number: <strong>{{orderNo}}</strong></p>
          
          <p>{{resolutionMessage}}</p>
          
          <p>Best regards,<br>Remittance Support Team</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Dispute Resolution Update - {{orderNo}}
      
      {{resolutionMessage}}
      
      Best regards,
      Remittance Support Team
    `
  }
};

/**
 * Send email to customer
 * @param {Object} params - Parameters object
 * @param {string} params.customerEmail - Customer email address
 * @param {string} params.orderNo - Order number
 * @param {string} [params.emailType] - Type of email to send
 * @param {string} [params.customerName] - Customer name
 * @param {string} [params.additionalMessage] - Additional message to include
 * @returns {Object} ToolResult with email sending status
 */
export async function sendCustomerEmail(params) {
  try {
    // Validate input parameters
    const validation = emailServiceSchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${validation.error.errors[0].message}`
          }
        ],
        isError: true
      };
    }

    const { customerEmail, orderNo, emailType, customerName, additionalMessage } = validation.data;

    // Generate unique submission URL for bank details
    const submissionId = uuidv4();
    const submissionUrl = `${process.env.BASE_URL || 'https://remittance.example.com'}/dispute/submit/${submissionId}`;

    // Get email template
    const template = EMAIL_TEMPLATES[emailType];
    if (!template) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid email type: ${emailType}`
          }
        ],
        isError: true
      };
    }

    // Replace template variables
    const templateData = {
      orderNo,
      customerName: customerName || 'Valued Customer',
      submissionUrl,
      status: 'COMPLETED',
      statusClass: 'success',
      statusMessage: 'Your transaction has been processed successfully.',
      resolutionMessage: additionalMessage || 'We are investigating your dispute and will provide an update soon.',
      additionalMessage
    };

    const subject = replaceTemplateVariables(template.subject, templateData);
    const htmlContent = replaceTemplateVariables(template.html, templateData);
    const textContent = replaceTemplateVariables(template.text, templateData);

    // In a real implementation, this would use an email service like SendGrid, AWS SES, etc.
    const emailResult = await simulateEmailSending({
      to: customerEmail,
      subject,
      html: htmlContent,
      text: textContent,
      submissionId,
      orderNo
    });

    const response = {
      code: 200,
      message: 'Email sent successfully',
      data: {
        emailId: emailResult.emailId,
        customerEmail,
        orderNo,
        emailType,
        submissionUrl,
        submissionId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        sentAt: new Date().toISOString()
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ],
      isError: false
    };

  } catch (error) {
    console.error('Error in sendCustomerEmail:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Email sending failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Replace template variables in email content
 * @param {string} template - Email template
 * @param {Object} data - Template data
 * @returns {string} Processed template
 */
function replaceTemplateVariables(template, data) {
  let processed = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, value || '');
  }
  return processed;
}

/**
 * Simulate email sending (in real implementation, this would use an email service)
 * @param {Object} emailData - Email data
 * @returns {Object} Email sending result
 */
async function simulateEmailSending(emailData) {
  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // In a real implementation, this would call an email service
  console.log('📧 Email sent:', {
    to: emailData.to,
    subject: emailData.subject,
    submissionId: emailData.submissionId,
    orderNo: emailData.orderNo
  });

  return {
    emailId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: 'sent',
    sentAt: new Date().toISOString()
  };
}

/**
 * Get email template by type
 * @param {string} emailType - Type of email
 * @returns {Object} Email template
 */
export function getEmailTemplate(emailType) {
  return EMAIL_TEMPLATES[emailType] || null;
}

/**
 * Generate submission URL for bank details
 * @param {string} orderNo - Order number
 * @returns {Object} Submission URL information
 */
export function generateSubmissionUrl(orderNo) {
  const submissionId = uuidv4();
  const baseUrl = process.env.BASE_URL || 'https://remittance.example.com';
  
  return {
    submissionId,
    submissionUrl: `${baseUrl}/dispute/submit/${submissionId}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    orderNo
  };
}

/**
 * Validate email address format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
