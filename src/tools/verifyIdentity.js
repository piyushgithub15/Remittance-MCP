import { z } from 'zod';
import Beneficiary from '../models/Beneficiary.js';
import { storeVerification } from '../utils/verificationStore.js';

// Validation schema for identity verification parameters
export const verifyIdentitySchema = z.object({
  lastFourDigits: z.string().length(4, 'lastFourDigits must be exactly 4 digits').regex(/^\d{4}$/, 'lastFourDigits must contain only digits'),
  expiryDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'expiryDate must be in DD/MM/YYYY format'),
  beneficiaryId: z.string().optional()
});

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

/**
 * Verify customer identity using last four digits of EID and expiry date
 * @param {Object} params - Parameters object
 * @param {string} params.lastFourDigits - Last 4 digits of Emirates ID
 * @param {string} params.expiryDate - Expiry date in DD/MM/YYYY format
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

    const { lastFourDigits, expiryDate, beneficiaryId } = validation.data;

    // Build query to find matching beneficiary by last 4 digits only
    // Use a more specific regex to match exactly the last 4 digits at the end
    const query = { 
      userId: DEFAULT_USER_ID,
      'idCard.idNumber': { $regex: `-\\d{4}-${lastFourDigits}$` } // Match exactly last 4 digits after dash-4digits-dash pattern
    };

    // If beneficiaryId is provided, add it to the query
    if (beneficiaryId) {
      query.id = parseInt(beneficiaryId);
    }

    // Search for matching beneficiaries (should be only one)
    const beneficiaries = await Beneficiary.find(query);
    
    // Ensure only one beneficiary matches
    if (beneficiaries.length === 0) {
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
        isError: true
      };
    }
    
    if (beneficiaries.length > 1) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 400,
              message: 'Identity verification failed: Multiple beneficiaries found with same last 4 digits',
              data: {
                verified: false,
                reason: 'MULTIPLE_MATCHES',
                lastFourDigits: lastFourDigits,
                matchCount: beneficiaries.length
              }
            })
          }
        ],
        isError: true,
        code: -32602
      };
    }
    
    const beneficiary = beneficiaries[0];

    // Parse the provided expiry date (DD/MM/YYYY format)
    const [day, month, year] = expiryDate.split('/');
    const providedExpiryDate = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    
    // Check if the provided date is valid
    if (isNaN(providedExpiryDate.getTime())) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 400,
              message: 'Identity verification failed: Invalid expiry date format',
              data: {
                verified: false,
                reason: 'INVALID_DATE_FORMAT',
                lastFourDigits: lastFourDigits,
                providedExpiryDate: expiryDate
              }
            })
          }
        ],
        isError: true,
        code: -32602
      };
    }

    // Get stored expiry date from beneficiary record
    const storedExpiryDate = new Date(beneficiary.idCard.expiryDate);
    
    // Check if the provided expiry date matches the stored expiry date
    // Normalize both dates to YYYY-MM-DD format for comparison
    const providedDateStr = providedExpiryDate.toISOString().split('T')[0];
    const storedDateStr = storedExpiryDate.toISOString().split('T')[0];
    
    // Also check if the provided date components match the stored date
    const providedYear = providedExpiryDate.getFullYear();
    const providedMonth = providedExpiryDate.getMonth() + 1; // getMonth() is 0-indexed
    const providedDay = providedExpiryDate.getDate();
    
    const storedYear = storedExpiryDate.getFullYear();
    const storedMonth = storedExpiryDate.getMonth() + 1;
    const storedDay = storedExpiryDate.getDate();
    
    if (providedYear !== storedYear || providedMonth !== storedMonth || providedDay !== storedDay) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 400,
              message: 'Identity verification failed: Expiry date does not match',
              data: {
                verified: false,
                reason: 'EXPIRY_DATE_MISMATCH',
                lastFourDigits: lastFourDigits,
                providedExpiryDate: expiryDate,
                storedExpiryDate: storedDateStr
              }
            })
          }
        ],
        isError: true,
        code: -32602
      };
    }

    // Check if the Emirates ID is expired
    const currentDate = new Date();
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
                expiryDate: storedDateStr
              }
            })
          }
        ],
        isError: true,
        code: -32602
      };
    }

    // Store verification status for 5 minutes
    const verificationRecord = await storeVerification(
      DEFAULT_USER_ID,
      beneficiary.id.toString(),
      lastFourDigits,
      expiryDate
    );

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
              providedExpiryDate: expiryDate,
              storedExpiryDate: beneficiary.idCard.expiryDate.toISOString().split('T')[0],
              verification: {
                verifiedAt: verificationRecord.verifiedAt.toISOString(),
                expiresAt: verificationRecord.expiresAt.toISOString(),
                timeRemaining: Math.floor((verificationRecord.expiresAt.getTime() - new Date().getTime()) / 1000)
              }
            }
          })
        }
      ],
      isError: false
    };

  } catch (error) {
    console.error('Verify identity failed');
    return {
      content: [
        {
          type: 'text',
          text: 'Identity verification failed'
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
    console.error('Get beneficiaries failed');
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
