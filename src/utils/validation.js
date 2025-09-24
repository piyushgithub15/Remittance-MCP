import { z } from 'zod';

// Transfer Money validation schema
export const transferMoneySchema = z.object({
  beneficiaryId: z.string()
    .min(1, 'beneficiaryId is required')
    .regex(/^[0-9]+$/, 'beneficiaryId must be a numeric string (e.g., "123")'),
  beneficiaryName: z.string().optional(),
  sendAmount: z.number().positive().optional(),
  callBackProvider: z.enum(['voice', 'text']).default('voice')
});

// Query Exchange Rate validation schema
export const queryExchangeRateSchema = z.object({
  toCountry: z.string()
    .length(2, 'toCountry must be a 2-character ISO 3166 country code')
    .regex(/^[A-Z]{2}$/, 'toCountry must be uppercase (e.g., CN, US)'),
  toCurrency: z.string()
    .length(3, 'toCurrency must be a 3-character ISO 4217 currency code')
    .regex(/^[A-Z]{3}$/, 'toCurrency must be uppercase (e.g., CNY, USD)')
});

// Remittance Order Query validation schema
export const remittanceOrderQuerySchema = z.object({
  transferMode: z.enum(['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI']).optional(),
  country: z.string()
    .length(2, 'country must be a 2-character ISO 3166 country code')
    .regex(/^[A-Z]{2}$/, 'country must be uppercase (e.g., CN, US)')
    .optional(),
  currency: z.string()
    .length(3, 'currency must be a 3-character ISO 4217 currency code')
    .regex(/^[A-Z]{3}$/, 'currency must be uppercase (e.g., CNY, USD)')
    .optional(),
  orderDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'orderDate must be in YYYY-MM-DD format')
    .optional(),
  orderCount: z.number()
    .int('orderCount must be an integer')
    .min(1, 'orderCount must be at least 1')
    .max(50, 'orderCount must be at most 50')
    .default(10)
});

// Get Beneficiaries validation schema
export const getBeneficiariesSchema = z.object({
  country: z.string()
    .length(2, 'country must be a 2-character ISO 3166 country code')
    .regex(/^[A-Z]{2}$/, 'country must be uppercase (e.g., CN, US)')
    .optional(),
  currency: z.string()
    .length(3, 'currency must be a 3-character ISO 4217 currency code')
    .regex(/^[A-Z]{3}$/, 'currency must be uppercase (e.g., CNY, USD)')
    .optional(),
  transferMode: z.enum(['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI']).optional(),
  isActive: z.boolean().default(true).optional(),
  limit: z.number()
    .int('limit must be an integer')
    .min(1, 'limit must be at least 1')
    .max(100, 'limit must be at most 100')
    .default(50)
});

// Validation helper function
export function validateWithZod(schema, data) {
  try {
    const result = schema.parse(data);
    return { success: true, data: result, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { 
        success: false, 
        data: null, 
        error: errorMessage 
      };
    }
    return { 
      success: false, 
      data: null, 
      error: error.message 
    };
  }
}

// Create error response helper
export function createErrorResponse(message, code = 400) {
  return {
    content: [{ 
      type: 'text', 
      text: JSON.stringify({
        code,
        message,
        beneficiaries: [],
        sendAmounts: [],
        remToken: null,
        exchangeRate: null
      })
    }],
    isError: false
  };
}