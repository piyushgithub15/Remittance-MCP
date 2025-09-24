import Joi from 'joi';
import Beneficiary from '../models/Beneficiary.js';

// Validation schema for getBeneficiaries parameters
const getBeneficiariesSchema = Joi.object({
  country: Joi.string().length(2).optional().messages({
    'string.length': 'country must be a 2-character ISO 3166 country code'
  }),
  currency: Joi.string().length(3).optional().messages({
    'string.length': 'currency must be a 3-character ISO 4217 currency code'
  }),
  transferMode: Joi.string().valid('BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI').optional(),
  isActive: Joi.boolean().optional().default(true),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

/**
 * Get user's beneficiaries with optional filtering
 * @param {Object} params - Parameters object
 * @param {string} [params.country] - Filter by destination country (ISO 3166)
 * @param {string} [params.currency] - Filter by currency (ISO 4217)
 * @param {string} [params.transferMode] - Filter by transfer mode
 * @param {boolean} [params.isActive] - Filter by active status (default: true)
 * @param {number} [params.limit] - Maximum number of beneficiaries to return (1-100, default: 50)
 * @returns {Object} ToolResult with beneficiaries information
 */
export async function getBeneficiaries(params) {
  try {
    // Validate input parameters
    const { error, value } = getBeneficiariesSchema.validate(params);
    if (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Get beneficiaries failed: ${error.details[0].message}`
          }
        ],
        isError: true
      };
    }

    const { country, currency, transferMode, isActive, limit } = value;

    // Build query filters
    const query = { 
      userId: DEFAULT_USER_ID,
      isActive: isActive
    };
    
    if (country) {
      query.country = country.toUpperCase();
    }
    
    if (currency) {
      query.currency = currency.toUpperCase();
    }
    
    if (transferMode) {
      query.transferModes = { $in: [transferMode] };
    }

    // Query beneficiaries from database
    const beneficiaries = await Beneficiary.find(query)
      .sort({ createdAt: -1 }) // Sort by creation date (newest first)
      .limit(limit)
      .select('id title name currency icon country transferModes accountNumber bankName bankCode branchCode swiftCode createdAt updatedAt');

    // Check if no beneficiaries found
    if (beneficiaries.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 200,
              message: 'No beneficiaries found',
              data: [],
              total: 0
            })
          }
        ],
        isError: false
      };
    }

    // Format response
    const response = {
      code: 200,
      message: 'Success',
      data: beneficiaries.map(beneficiary => ({
        id: beneficiary.id,
        title: beneficiary.title,
        name: beneficiary.name,
        currency: beneficiary.currency,
        icon: beneficiary.icon,
        country: beneficiary.country,
        transferModes: beneficiary.transferModes,
        accountNumber: beneficiary.accountNumber,
        bankName: beneficiary.bankName,
        bankCode: beneficiary.bankCode,
        branchCode: beneficiary.branchCode,
        swiftCode: beneficiary.swiftCode,
        createdAt: beneficiary.createdAt,
        updatedAt: beneficiary.updatedAt
      })),
      total: beneficiaries.length,
      filters: {
        country: country || null,
        currency: currency || null,
        transferMode: transferMode || null,
        isActive: isActive
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
    console.error('Error in getBeneficiaries:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Get beneficiaries failed: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Get beneficiary by ID
 * @param {number} beneficiaryId - Beneficiary ID
 * @param {string} userId - User ID
 * @returns {Object|null} Beneficiary details or null if not found
 */
export async function getBeneficiaryById(beneficiaryId, userId = DEFAULT_USER_ID) {
  try {
    return await Beneficiary.findOne({ 
      id: beneficiaryId, 
      userId: userId, 
      isActive: true 
    });
  } catch (error) {
    console.error('Error getting beneficiary by ID:', error);
    return null;
  }
}

/**
 * Get beneficiaries by country
 * @param {string} country - Country code
 * @param {string} userId - User ID
 * @returns {Array} Beneficiaries in the specified country
 */
export async function getBeneficiariesByCountry(country, userId = DEFAULT_USER_ID) {
  try {
    return await Beneficiary.find({ 
      userId: userId, 
      country: country.toUpperCase(), 
      isActive: true 
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting beneficiaries by country:', error);
    return [];
  }
}

/**
 * Get beneficiaries by currency
 * @param {string} currency - Currency code
 * @param {string} userId - User ID
 * @returns {Array} Beneficiaries with the specified currency
 */
export async function getBeneficiariesByCurrency(currency, userId = DEFAULT_USER_ID) {
  try {
    return await Beneficiary.find({ 
      userId: userId, 
      currency: currency.toUpperCase(), 
      isActive: true 
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting beneficiaries by currency:', error);
    return [];
  }
}

/**
 * Get beneficiaries by transfer mode
 * @param {string} transferMode - Transfer mode
 * @param {string} userId - User ID
 * @returns {Array} Beneficiaries supporting the specified transfer mode
 */
export async function getBeneficiariesByTransferMode(transferMode, userId = DEFAULT_USER_ID) {
  try {
    return await Beneficiary.find({ 
      userId: userId, 
      transferModes: { $in: [transferMode] }, 
      isActive: true 
    }).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting beneficiaries by transfer mode:', error);
    return [];
  }
}

/**
 * Get beneficiary statistics
 * @param {string} userId - User ID
 * @returns {Object} Beneficiary statistics
 */
export async function getBeneficiaryStatistics(userId = DEFAULT_USER_ID) {
  try {
    const totalBeneficiaries = await Beneficiary.countDocuments({ userId, isActive: true });
    
    const countryStats = await Beneficiary.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const currencyStats = await Beneficiary.aggregate([
      { $match: { userId, isActive: true } },
      { $group: { _id: '$currency', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const transferModeStats = await Beneficiary.aggregate([
      { $match: { userId, isActive: true } },
      { $unwind: '$transferModes' },
      { $group: { _id: '$transferModes', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return {
      totalBeneficiaries,
      byCountry: countryStats,
      byCurrency: currencyStats,
      byTransferMode: transferModeStats
    };
  } catch (error) {
    console.error('Error getting beneficiary statistics:', error);
    return {
      totalBeneficiaries: 0,
      byCountry: [],
      byCurrency: [],
      byTransferMode: []
    };
  }
}

/**
 * Generate trace code for request tracking
 * @returns {string} Trace code
 */
function generateTraceCode() {
  return `TRC${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
}
