/**
 * Verification tracking system
 * Stores verification status and timestamps for users in database
 */

import Verification from '../models/Verification.js';
import Beneficiary from '../models/Beneficiary.js';

// Verification expiry time in milliseconds (5 minutes)
const VERIFICATION_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Store verification status for a user
 * @param {string} userId - User ID
 * @param {string} beneficiaryId - Beneficiary ID that was verified
 * @param {string} lastFourDigits - Last 4 digits used for verification
 * @param {string} expiryDate - Expiry date used for verification
 * @returns {Object} Verification record
 */
export async function storeVerification(userId, beneficiaryId, lastFourDigits, expiryDate) {
  try {
    // First, deactivate any existing verification for this user
    await Verification.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );

    // Create new verification record
    const verificationRecord = new Verification({
      userId,
      beneficiaryId,
      lastFourDigits,
      expiryDate,
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + VERIFICATION_EXPIRY_MS),
      isActive: true
    });
    
    await verificationRecord.save();
    
    console.log(`✅ Verification stored for user ${userId}:`, {
      beneficiaryId,
      lastFourDigits: lastFourDigits.replace(/\d/g, '*').slice(0, -4) + lastFourDigits.slice(-4),
      verifiedAt: verificationRecord.verifiedAt.toISOString(),
      expiresAt: verificationRecord.expiresAt.toISOString()
    });
    
    return verificationRecord;
  } catch (error) {
    console.error('Store verification failed');
    throw error;
  }
}

/**
 * Check if user is verified (always requires verification)
 * @param {string} userId - User ID
 * @returns {Object} Verification status
 */
export async function checkVerificationStatus(userId) {
  // Always require verification - no expiry logic
  return {
    isVerified: false,
    reason: 'VERIFICATION_REQUIRED',
    message: 'Verification required for every operation',
    requiresVerification: true
  };
}

/**
 * Clear verification for a user
 * @param {string} userId - User ID
 */
export async function clearVerification(userId) {
  try {
    await Verification.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
    console.log(`🧹 Verification cleared for user ${userId}`);
  } catch (error) {
    console.error('Clear verification failed');
    throw error;
  }
}

/**
 * Get all active verifications (for debugging)
 * @returns {Array} Array of active verifications
 */
export async function getAllVerifications() {
  try {
    const now = new Date();
    const activeVerifications = await Verification.find({
      isActive: true,
      expiresAt: { $gt: now }
    }).sort({ verifiedAt: -1 });
    
    return activeVerifications.map(verification => ({
      userId: verification.userId,
      beneficiaryId: verification.beneficiaryId,
      verifiedAt: verification.verifiedAt,
      expiresAt: verification.expiresAt,
      timeRemaining: Math.floor((verification.expiresAt.getTime() - now.getTime()) / 1000)
    }));
  } catch (error) {
    console.error('Get verifications failed');
    return [];
  }
}

/**
 * Clean up expired verifications
 */
export async function cleanupExpiredVerifications() {
  try {
    const now = new Date();
    const result = await Verification.updateMany(
      { 
        isActive: true,
        expiresAt: { $lte: now }
      },
      { isActive: false }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned up ${result.modifiedCount} expired verifications`);
    }
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Cleanup failed');
    return 0;
  }
}

/**
 * Check if verification is required for a specific action
 * @param {string} userId - User ID
 * @param {string} action - Action being performed
 * @returns {Object} Verification requirement status
 */
export async function checkVerificationRequired(userId, action = 'transaction') {
  const status = await checkVerificationStatus(userId);
  
  if (status.requiresVerification) {
    return {
      requiresVerification: true,
      message: `Identity verification required for ${action}. Please provide the last 4 digits of your Emirates ID and expiry date.`,
      status
    };
  }
  
  return {
    requiresVerification: false,
    message: 'User is verified and can proceed',
    status
  };
}

// Clean up expired verifications every minute
setInterval(async () => {
  try {
    await cleanupExpiredVerifications();
  } catch (error) {
    console.error('Cleanup interval failed');
  }
}, 60000);

/**
 * Simple verification function for tools to call directly
 * @param {string} userId - User ID
 * @param {string} lastFourDigits - Last 4 digits of Emirates ID
 * @param {string} expiryDate - Expiry date in DD/MM/YYYY format
 * @returns {Object} Verification result
 */
export async function verifyUser(userId, lastFourDigits, expiryDate) {
  try {

    // Validate input format
    if (!lastFourDigits || lastFourDigits.length !== 4 || !/^\d{4}$/.test(lastFourDigits)) {
      return {
        verified: false,
        message: 'Invalid last 4 digits format'
      };
    }

    if (!expiryDate || !/^\d{2}\/\d{2}\/\d{4}$/.test(expiryDate)) {
      return {
        verified: false,
        message: 'Invalid expiry date format'
      };
    }

    // Search for beneficiary with matching last 4 digits
    const beneficiary = await Beneficiary.findOne({
      userId,
      'idCard.idNumber': { $regex: `-\\d{4}-${lastFourDigits}$` },
      isActive: true
    });

    if (!beneficiary) {
      return {
        verified: false,
        message: 'No matching beneficiary found'
      };
    }

    // Check if multiple beneficiaries match (should be unique)
    const matchingBeneficiaries = await Beneficiary.find({
      userId,
      'idCard.idNumber': { $regex: `-\\d{4}-${lastFourDigits}$` },
      isActive: true
    });

    if (matchingBeneficiaries.length > 1) {
      return {
        verified: false,
        message: 'Multiple beneficiaries found with same last 4 digits'
      };
    }

    // Parse the provided expiry date (DD/MM/YYYY format)
    const [day, month, year] = expiryDate.split('/');
    const providedExpiryDate = new Date(year, month - 1, day); // month is 0-indexed

    // Check if the provided date is valid
    if (isNaN(providedExpiryDate.getTime())) {
      return {
        verified: false,
        message: 'Invalid expiry date format'
      };
    }

    // Get stored expiry date from beneficiary record
    const storedExpiryDate = new Date(beneficiary.idCard.expiryDate);

    // Check if the provided expiry date matches the stored expiry date
    const providedYear = providedExpiryDate.getFullYear();
    const providedMonth = providedExpiryDate.getMonth() + 1; // getMonth() is 0-indexed
    const providedDay = providedExpiryDate.getDate();

    const storedYear = storedExpiryDate.getFullYear();
    const storedMonth = storedExpiryDate.getMonth() + 1;
    const storedDay = storedExpiryDate.getDate();

    if (providedYear !== storedYear || providedMonth !== storedMonth || providedDay !== storedDay) {
      return {
        verified: false,
        message: 'Expiry date does not match'
      };
    }

    // Check if the Emirates ID is expired
    const currentDate = new Date();
    if (storedExpiryDate < currentDate) {
      return {
        verified: false,
        message: 'Emirates ID has expired'
      };
    }

    return {
      verified: true,
      message: 'Identity verified successfully'
    };
  } catch (error) {
    console.error('Verify user failed');
    return {
      verified: false,
      message: 'Verification failed'
    };
  }
}

export default {
  storeVerification,
  checkVerificationStatus,
  clearVerification,
  getAllVerifications,
  cleanupExpiredVerifications,
  checkVerificationRequired,
  verifyUser
};
