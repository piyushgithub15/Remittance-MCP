/**
 * Enum definitions for the Remittance MCP system
 * Focused on the specific use cases in this system
 */

// Transaction Status - Only what's actually used
export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS', 
  FAILED: 'FAILED',
};

// Transfer Mode - Only the 4 modes used in the system
export const TRANSFER_MODE = {
  BANK_TRANSFER: 'BANK_TRANSFER',
  CASH_PICK_UP: 'CASH_PICK_UP', 
  MOBILE_WALLET: 'MOBILE_WALLET',
  UPI: 'UPI'
};

// Customer Satisfaction - Only the 3 levels used
export const CUSTOMER_SATISFACTION = {
  SATISFIED: 'satisfied',
  UNSATISFIED: 'unsatisfied',
};


// Dispute Type - Only the 3 types actually used
export const DISPUTE_TYPE = {
  BENEFICIARY_NOT_RECEIVED: 'beneficiary_not_received',
};

// Callback Provider - text and voice types
export const CALLBACK_PROVIDER = {
  TEXT: 'text',
  VOICE: 'voice'
};

// Communication Channel - Only the 2 channels used
export const COMMUNICATION_CHANNEL = {
  EMAIL: 'email',
  CHAT: 'chat'
};

// Escalation Reason - Only the 4 reasons used
export const ESCALATION_REASON = {
  CUSTOMER_UNSATISFIED: 'customer_unsatisfied',
  TECHNICAL_ISSUE: 'technical_issue',
  COMPLEX_INQUIRY: 'complex_inquiry',
  OTHER: 'other'
};

// Payment Method - Only the 4 methods used
export const PAYMENT_METHOD = {
  CARD: 'CARD',
  WALLET: 'WALLET',
  BANK_ACCOUNT: 'BANK_ACCOUNT',
  CASH: 'CASH'
};

// Delivery Status - Only the 4 statuses used
export const DELIVERY_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
  DELAYED: 'delayed',
  FAILED: 'failed'
};

// Update Source - Only the 4 sources used
export const UPDATE_SOURCE = {
  SYSTEM: 'system',
  CUSTOMER: 'customer',
  BANK: 'bank',
  ADMIN: 'admin'
};

// Document Type - Only the 3 types used
export const DOCUMENT_TYPE = {
  BANK_STATEMENT: 'bank_statement',
  RECEIPT: 'receipt',
  ID_VERIFICATION: 'id_verification'
};

// Export all enum values as arrays for validation schemas
export const TRANSACTION_STATUS_VALUES = Object.values(TRANSACTION_STATUS);
export const TRANSFER_MODE_VALUES = Object.values(TRANSFER_MODE);
export const CUSTOMER_SATISFACTION_VALUES = Object.values(CUSTOMER_SATISFACTION);
export const DISPUTE_TYPE_VALUES = Object.values(DISPUTE_TYPE);
export const CALLBACK_PROVIDER_VALUES = Object.values(CALLBACK_PROVIDER);
export const COMMUNICATION_CHANNEL_VALUES = Object.values(COMMUNICATION_CHANNEL);
export const ESCALATION_REASON_VALUES = Object.values(ESCALATION_REASON);
export const PAYMENT_METHOD_VALUES = Object.values(PAYMENT_METHOD);
export const DELIVERY_STATUS_VALUES = Object.values(DELIVERY_STATUS);
export const UPDATE_SOURCE_VALUES = Object.values(UPDATE_SOURCE);
export const DOCUMENT_TYPE_VALUES = Object.values(DOCUMENT_TYPE);
