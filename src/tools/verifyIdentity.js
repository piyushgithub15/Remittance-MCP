import { z } from 'zod';
import Beneficiary from '../models/Beneficiary.js';

// Validation schema for identity verification parameters
export const verifyIdentitySchema = z.object({
  lastFourDigits: z.string().length(4, 'lastFourDigits must be exactly 4 digits').regex(/^\d{4}$/, 'lastFourDigits must contain only digits'),
  beneficiaryId: z.string().optional()
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

/**
 * Verify customer identity using last four digits of EID (expiry date from beneficiary record)
 * @param {Object} params - Parameters object
 * @param {string} params.lastFourDigits - Last 4 digits of Emirates ID
 * @param {string} [params.beneficiaryId] - Optional beneficiary ID to verify against
 * @returns {Object} ToolResult with verification status
 */
export async function verifyIdentity(params) {
  try {
    // Validate input parameters
    const validation = verifyIdentitySchema.safeParse(params);
    if (!validation.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${validation.error.errors[0].message}`
          }
        ],
        isError: true,
        code: -32602
      };
    }

    const { lastFourDigits, beneficiaryId } = validation.data;

    // Build query to find matching beneficiary by last 4 digits only
    const query = { 
      userId: DEFAULT_USER_ID,
      'idCard.idNumber': { $regex: lastFourDigits + '$' } // Match last 4 digits
    };

    // If beneficiaryId is provided, add it to the query
    if (beneficiaryId) {
      query.id = parseInt(beneficiaryId);
    }

    // Search for matching beneficiary
    const beneficiary = await Beneficiary.findOne(query);

    if (!beneficiary) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 404,
              message: 'Identity verification failed: No matching beneficiary found',
              data: {
                verified: false,
                reason: 'NO_MATCH',
                lastFourDigits: lastFourDigits
              }
            })
          }
        ],
        isError: false
      };
    }

    // Check if the beneficiary's Emirates ID is expired using stored expiry date
    const currentDate = new Date();
    const storedExpiryDate = new Date(beneficiary.idCard.expiryDate);

    if (storedExpiryDate < currentDate) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 400,
              message: 'Identity verification failed: Emirates ID has expired',
              data: {
                verified: false,
                reason: 'EXPIRED_ID',
                lastFourDigits: lastFourDigits,
                expiryDate: beneficiary.idCard.expiryDate.toISOString().split('T')[0]
              }
            })
          }
        ],
        isError: true,
        code: -32602
      };
    }

    // Identity verified successfully
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            code: 200,
            message: 'Identity verified successfully',
            data: {
              verified: true,
              beneficiary: {
                id: beneficiary.id,
                name: beneficiary.name,
                country: beneficiary.country,
                currency: beneficiary.currency,
                bankName: beneficiary.bankName,
                accountNumber: beneficiary.accountNumber
              },
              lastFourDigits: lastFourDigits,
              expiryDate: beneficiary.idCard.expiryDate.toISOString().split('T')[0]
            }
          })
        }
      ],
      isError: false
    };

  } catch (error) {
    console.error('Error in verifyIdentity:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Identity verification failed: ${error.message}`
        }
      ],
      isError: true,
      code: -32603
    };
  }
}

/**
 * Get all beneficiaries for a user (for reference)
 * @param {string} userId - User ID
 * @returns {Array} List of beneficiaries
 */
export async function getAllBeneficiaries(userId = DEFAULT_USER_ID) {
  try {
    const beneficiaries = await Beneficiary.find({ userId, isActive: true })
      .select('id name country currency bankName accountNumber idCard.idNumber idCard.expiryDate')
      .sort({ name: 1 });

    return beneficiaries;
  } catch (error) {
    console.error('Error getting beneficiaries:', error);
    return [];
  }
}

/**
 * Check if Emirates ID is expired
 * @param {string} expiryDate - Expiry date in YYYY-MM-DD format
 * @returns {boolean} True if expired, false otherwise
 */
export function isIdExpired(expiryDate) {
  const expiryDateObj = new Date(expiryDate);
  const currentDate = new Date();
  return expiryDateObj < currentDate;
}

/**
 * Format Emirates ID for display (masked)
 * @param {string} idNumber - Full Emirates ID number
 * @returns {string} Masked ID (e.g., 784-****-****-1234)
 */
export function formatMaskedId(idNumber) {
  if (!idNumber || idNumber.length < 4) {
    return '****-****-****-****';
  }
  
  const lastFour = idNumber.slice(-4);
  return `784-****-****-${lastFour}`;
}
