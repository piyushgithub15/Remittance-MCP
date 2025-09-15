import Joi from 'joi';

/**
 * Common validation schemas and utilities
 */

// Country code validation (ISO 3166-1 alpha-2)
export const countryCodeSchema = Joi.string()
  .length(2)
  .pattern(/^[A-Z]{2}$/)
  .required()
  .messages({
    'string.length': 'Country code must be exactly 2 characters',
    'string.pattern.base': 'Country code must be valid ISO 3166-1 alpha-2 format (e.g., US, CN, IN)'
  });

// Currency code validation (ISO 4217)
export const currencyCodeSchema = Joi.string()
  .length(3)
  .pattern(/^[A-Z]{3}$/)
  .required()
  .messages({
    'string.length': 'Currency code must be exactly 3 characters',
    'string.pattern.base': 'Currency code must be valid ISO 4217 format (e.g., USD, CNY, INR)'
  });

// Amount validation
export const amountSchema = Joi.number()
  .positive()
  .precision(2)
  .max(1000000)
  .required()
  .messages({
    'number.positive': 'Amount must be positive',
    'number.max': 'Amount cannot exceed 1,000,000',
    'number.precision': 'Amount cannot have more than 2 decimal places'
  });

// Date validation (YYYY-MM-DD format)
export const dateSchema = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .required()
  .messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format'
  });

// Transfer mode validation
export const transferModeSchema = Joi.string()
  .valid('BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI')
  .required()
  .messages({
    'any.only': 'Transfer mode must be one of: BANK_TRANSFER, CASH_PICK_UP, MOBILE_WALLET, UPI'
  });

// Callback provider validation
export const callbackProviderSchema = Joi.string()
  .valid('voice', 'text')
  .default('voice')
  .messages({
    'any.only': 'Callback provider must be either "voice" or "text"'
  });

// Order count validation
export const orderCountSchema = Joi.number()
  .integer()
  .min(1)
  .max(50)
  .default(10)
  .messages({
    'number.integer': 'Order count must be an integer',
    'number.min': 'Order count must be at least 1',
    'number.max': 'Order count cannot exceed 50'
  });

/**
 * Validate common parameters
 * @param {Object} params - Parameters to validate
 * @param {Object} schema - Joi schema to validate against
 * @returns {Object} Validation result
 */
export function validateParams(params, schema) {
  const { error, value } = schema.validate(params, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message).join('; ');
    return {
      isValid: false,
      error: errorMessages,
      value: null
    };
  }
  
  return {
    isValid: true,
    error: null,
    value
  };
}

/**
 * Validate country code
 * @param {string} countryCode - Country code to validate
 * @returns {boolean} True if valid
 */
export function isValidCountryCode(countryCode) {
  const { error } = countryCodeSchema.validate(countryCode);
  return !error;
}

/**
 * Validate currency code
 * @param {string} currencyCode - Currency code to validate
 * @returns {boolean} True if valid
 */
export function isValidCurrencyCode(currencyCode) {
  const { error } = currencyCodeSchema.validate(currencyCode);
  return !error;
}

/**
 * Validate amount
 * @param {number} amount - Amount to validate
 * @returns {boolean} True if valid
 */
export function isValidAmount(amount) {
  const { error } = amountSchema.validate(amount);
  return !error;
}

/**
 * Validate date format
 * @param {string} date - Date to validate
 * @returns {boolean} True if valid
 */
export function isValidDate(date) {
  const { error } = dateSchema.validate(date);
  return !error;
}

/**
 * Sanitize string input
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize number input
 * @param {any} input - Input to sanitize
 * @returns {number|null} Sanitized number or null
 */
export function sanitizeNumber(input) {
  if (typeof input === 'number' && !isNaN(input)) {
    return Math.round(input * 100) / 100; // Round to 2 decimal places
  }
  
  if (typeof input === 'string') {
    const parsed = parseFloat(input);
    if (!isNaN(parsed)) {
      return Math.round(parsed * 100) / 100;
    }
  }
  
  return null;
}

/**
 * Validate and sanitize email
 * @param {string} email - Email to validate
 * @returns {string|null} Validated email or null
 */
export function validateEmail(email) {
  const emailSchema = Joi.string().email().max(254);
  const { error, value } = emailSchema.validate(email);
  
  if (error) {
    return null;
  }
  
  return value.toLowerCase();
}

/**
 * Validate and sanitize phone number
 * @param {string} phone - Phone number to validate
 * @returns {string|null} Validated phone or null
 */
export function validatePhone(phone) {
  const phoneSchema = Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .max(15);
  
  const { error, value } = phoneSchema.validate(phone);
  
  if (error) {
    return null;
  }
  
  return value;
}

/**
 * Create validation error response
 * @param {string} message - Error message
 * @param {Array} details - Error details
 * @returns {Object} Error response
 */
export function createValidationError(message, details = []) {
  return {
    code: 1,
    content: JSON.stringify({
      head: {
        applyStatus: 'FAILED',
        code: '400',
        msg: message,
        traceCode: generateTraceCode()
      },
      body: null,
      details: details
    })
  };
}

/**
 * Create business error response
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @returns {Object} Error response
 */
export function createBusinessError(message, code = '400') {
  return {
    code: 0,
    content: JSON.stringify({
      head: {
        applyStatus: 'FAILED',
        code: code,
        msg: message,
        traceCode: generateTraceCode()
      },
      body: null
    })
  };
}

/**
 * Generate trace code for request tracking
 * @returns {string} Trace code
 */
function generateTraceCode() {
  return `TRC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
