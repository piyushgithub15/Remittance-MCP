import Joi from 'joi';

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

// Mock exchange rate data - in a real implementation, this would come from an external API
const EXCHANGE_RATES = {
  'CN': { 'CNY': 1.89, 'icon': 'https://icon.cn.png' },
  'US': { 'USD': 0.27, 'icon': 'https://icon.us.png' },
  'IN': { 'INR': 22.50, 'icon': 'https://icon.in.png' },
  'GB': { 'GBP': 0.21, 'icon': 'https://icon.gb.png' },
  'EU': { 'EUR': 0.25, 'icon': 'https://icon.eu.png' },
  'JP': { 'JPY': 40.50, 'icon': 'https://icon.jp.png' },
  'AU': { 'AUD': 0.41, 'icon': 'https://icon.au.png' },
  'CA': { 'CAD': 0.37, 'icon': 'https://icon.ca.png' },
  'SG': { 'SGD': 0.37, 'icon': 'https://icon.sg.png' },
  'MY': { 'MYR': 1.28, 'icon': 'https://icon.my.png' },
  'TH': { 'THB': 9.85, 'icon': 'https://icon.th.png' },
  'PH': { 'PHP': 15.20, 'icon': 'https://icon.ph.png' },
  'BD': { 'BDT': 29.80, 'icon': 'https://icon.bd.png' },
  'PK': { 'PKR': 75.30, 'icon': 'https://icon.pk.png' },
  'LK': { 'LKR': 85.40, 'icon': 'https://icon.lk.png' },
  'NP': { 'NPR': 36.20, 'icon': 'https://icon.np.png' },
  'MM': { 'MMK': 570.50, 'icon': 'https://icon.mm.png' },
  'KH': { 'KHR': 1100.80, 'icon': 'https://icon.kh.png' },
  'LA': { 'LAK': 5500.20, 'icon': 'https://icon.la.png' },
  'VN': { 'VND': 6700.50, 'icon': 'https://icon.vn.png' }
};

// Country names mapping
const COUNTRY_NAMES = {
  'CN': 'China',
  'US': 'United States',
  'IN': 'India',
  'GB': 'United Kingdom',
  'EU': 'European Union',
  'JP': 'Japan',
  'AU': 'Australia',
  'CA': 'Canada',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'PH': 'Philippines',
  'BD': 'Bangladesh',
  'PK': 'Pakistan',
  'LK': 'Sri Lanka',
  'NP': 'Nepal',
  'MM': 'Myanmar',
  'KH': 'Cambodia',
  'LA': 'Laos',
  'VN': 'Vietnam'
};

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

    // Check if country and currency combination is supported
    if (!EXCHANGE_RATES[toCountry] || !EXCHANGE_RATES[toCountry][toCurrency]) {
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

    // Get exchange rate data
    const exchangeRate = EXCHANGE_RATES[toCountry][toCurrency];
    const countryIcon = EXCHANGE_RATES[toCountry].icon;
    const countryName = COUNTRY_NAMES[toCountry] || toCountry;

    // Build response
    const response = {
      head: {
        applyStatus: 'SUCCESS',
        code: '200',
        msg: 'OK',
        traceCode: generateTraceCode()
      },
      body: {
        fromCountryCode: 'AE',
        fromCurrencyCode: 'AED',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCountryCode: toCountry,
        toCurrencyCode: toCurrency,
        toCurrencyIcon: countryIcon,
        exchangeRate: exchangeRate
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
export function getSupportedCurrencies() {
  const supported = {};
  for (const [country, currencies] of Object.entries(EXCHANGE_RATES)) {
    supported[country] = {
      name: COUNTRY_NAMES[country] || country,
      currencies: Object.keys(currencies).filter(key => key !== 'icon'),
      icon: currencies.icon
    };
  }
  return supported;
}

/**
 * Validate if a country-currency combination is supported
 * @param {string} country - Country code
 * @param {string} currency - Currency code
 * @returns {boolean} True if supported
 */
export function isSupportedCurrency(country, currency) {
  return EXCHANGE_RATES[country] && EXCHANGE_RATES[country][currency];
}
