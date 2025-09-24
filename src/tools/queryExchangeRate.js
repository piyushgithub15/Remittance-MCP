import Joi from 'joi';
import ExchangeRate from '../models/ExchangeRate.js';

// Validation schema for queryExchangeRate parameters
const queryExchangeRateSchema = Joi.object({
  toCountry: Joi.string().length(2).required().messages({
    'string.length': 'toCountry must be a 2-character ISO 3166 country code',
    'any.required': 'toCountry is required'
  }),
  toCurrency: Joi.string().length(3).required().messages({
    'string.length': 'toCurrency must be a 3-character ISO 4217 currency code',
    'any.required': 'toCurrency is required'
  })
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
    const { error, value } = queryExchangeRateSchema.validate(params);
    if (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Query exchange rate failed: ${error.details[0].message}`
          }
        ],
        isError: true
      };
    }

    const { toCountry, toCurrency } = value;

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
        isError: false
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
      isError: true
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
