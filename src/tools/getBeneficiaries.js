import { z } from 'zod';
import Beneficiary from '../models/Beneficiary.js';
import { TRANSFER_MODE_VALUES } from '../constants/enums.js';
import { verifyUser } from '../utils/verificationStore.js';

// Validation schema for getBeneficiaries parameters
export const getBeneficiariesSchema = z.object({
  country: z.string().length(2, 'country must be a 2-character ISO 3166 country code').optional(),
  currency: z.string().length(3, 'currency must be a 3-character ISO 4217 currency code').optional(),
  transferMode: z.enum(TRANSFER_MODE_VALUES).optional(),
  isActive: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(100).default(50),
  lastFourDigits: z.string().length(4, 'Verification is required: lastFourDigits must be exactly 4 digits').regex(/^\d{4}$/, 'Verification is required: lastFourDigits must contain only digits'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Verification is required: expiryDate must be in DD/MM/YYYY format')
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
    const validation = getBeneficiariesSchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Invalid input: ${validation.error.errors[0].message}`
          }
        ],
        isError: true,
        code: -32602
      };
    }

    const { country, currency, transferMode, isActive, limit, lastFourDigits, expiryDate } = validation.data;

    // Verify user identity
    const verification = await verifyUser(DEFAULT_USER_ID, lastFourDigits, expiryDate);
    if (!verification.verified) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 401,
              message: 'Verification failed',
              data: {
                verified: false,
                message: verification.message
              }
            })
          }
        ],
        isError: true
      };
    }

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
            text: JSON.stringify([])
          }
        ],
        isError: true
      };
    }

    // Format response
    const response = beneficiaries.map(beneficiary => ({
      id: beneficiary.id,
      name: beneficiary.name,
      currency: beneficiary.currency,
      country: beneficiary.country
    }));

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
          text: 'Service unavailable'
        }
      ],
      isError: true,
      code: -32603
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
