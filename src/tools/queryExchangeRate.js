import { z } from 'zod';
import ExchangeRate from '../models/ExchangeRate.js';

// Validation schema for queryExchangeRate parameters
export const queryExchangeRateSchema = z.object({
  toCountry: z.string().length(2, 'toCountry must be a 2-character ISO 3166 country code'),
  toCurrency: z.string().length(3, 'toCurrency must be a 3-character ISO 4217 currency code')
});

// Default from country and currency (UAE)
const DEFAULT_FROM_COUNTRY = 'AE';
const DEFAULT_FROM_CURRENCY = 'AED';

/**
 * Query exchange rate for international remittance
 * @param {Object} params - Parameters object
 * @param {string} params.toCountry - Destination country code (ISO 3166)
 * @param {string} params.toCurrency - Destination currency code (ISO 4217)
 * @returns {Object} ToolResult with exchange rate information
 */
export async function queryExchangeRate(params) {
  try {
    // Validate input parameters
    const validation = queryExchangeRateSchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Query exchange rate failed: ${validation.error.errors[0].message}`
          }
        ],
        isError: true,
        code: -32602
      };
    }

    const { toCountry, toCurrency } = validation.data;

    // Query exchange rate from database
    const exchangeRateData = await ExchangeRate.findOne({
      fromCountry: DEFAULT_FROM_COUNTRY,
      fromCurrency: DEFAULT_FROM_CURRENCY,
      toCountry: toCountry.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      isActive: true
    });

    if (!exchangeRateData) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              head: {
                applyStatus: 'FAILED',
                code: '400',
                msg: 'Unsupported country or currency',
                traceCode: generateTraceCode()
              },
              body: null
            })
          }
        ],
        isError: true,
        code: -32602
      };
    }

    // Build response
    const response = {
      head: {
        applyStatus: 'SUCCESS',
        code: '200',
        msg: 'OK',
        traceCode: generateTraceCode()
      },
      body: {
        fromCountryCode: exchangeRateData.fromCountry,
        fromCurrencyCode: exchangeRateData.fromCurrency,
        fromCurrencyIcon: exchangeRateData.fromCurrencyIcon,
        toCountryCode: exchangeRateData.toCountry,
        toCurrencyCode: exchangeRateData.toCurrency,
        toCurrencyIcon: exchangeRateData.toCurrencyIcon,
        exchangeRate: exchangeRateData.rate
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
    console.error('Error in queryExchangeRate:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Query exchange rate failed: ${error.message}`
        }
      ],
      isError: true,
      code: -32603
    };
  }
}

/**
 * Generate a trace code for request tracking
 * @returns {string} Trace code
 */
function generateTraceCode() {
  return `TRC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}

/**
 * Get supported countries and currencies
 * @returns {Object} Supported countries and currencies
 */
export async function getSupportedCurrencies() {
  try {
    const exchangeRates = await ExchangeRate.find({ isActive: true });
    const supported = {};
    
    for (const rate of exchangeRates) {
      if (!supported[rate.toCountry]) {
        supported[rate.toCountry] = {
          name: rate.toCountryName,
          currencies: [],
          icon: rate.toCurrencyIcon
        };
      }
      supported[rate.toCountry].currencies.push(rate.toCurrency);
    }
    
    return supported;
  } catch (error) {
    console.error('Error getting supported currencies:', error);
    return {};
  }
}

/**
 * Validate if a country-currency combination is supported
 * @param {string} country - Country code
 * @param {string} currency - Currency code
 * @returns {boolean} True if supported
 */
export async function isSupportedCurrency(country, currency) {
  try {
    const exchangeRate = await ExchangeRate.findOne({
      fromCountry: DEFAULT_FROM_COUNTRY,
      fromCurrency: DEFAULT_FROM_CURRENCY,
      toCountry: country.toUpperCase(),
      toCurrency: currency.toUpperCase(),
      isActive: true
    });
    
    return !!exchangeRate;
  } catch (error) {
    console.error('Error checking supported currency:', error);
    return false;
  }
}
