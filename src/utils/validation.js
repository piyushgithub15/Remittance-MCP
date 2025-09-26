import { z } from 'zod';

// Import schemas from tool files
export { transferMoneySchema } from '../tools/transferMoney.js';
export { queryExchangeRateSchema } from '../tools/queryExchangeRate.js';
export { remittanceOrderQuerySchema } from '../tools/remittanceOrderQuery.js';
export { getBeneficiariesSchema } from '../tools/getBeneficiaries.js';

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