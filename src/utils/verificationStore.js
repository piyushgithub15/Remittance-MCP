/**
 * Verification tracking system
 * Stores verification status and timestamps for users in database
 */

import Verification from '../models/Verification.js';

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
 * Check if user is verified within the last 5 minutes
 * @param {string} userId - User ID
 * @returns {Object} Verification status
 */
export async function checkVerificationStatus(userId) {
  try {
    const verification = await Verification.findOne({
      userId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ verifiedAt: -1 });
    
    if (!verification) {
      return {
        isVerified: false,
        reason: 'NO_VERIFICATION',
        message: 'No verification found for this user',
        requiresVerification: true
      };
    }
    
    const now = new Date();
    const timeRemaining = verification.expiresAt.getTime() - now.getTime();
    
    if (timeRemaining <= 0) {
      // Verification expired, deactivate it
      await Verification.updateOne(
        { _id: verification._id },
        { isActive: false }
      );
      return {
        isVerified: false,
        reason: 'VERIFICATION_EXPIRED',
        message: 'Verification has expired (older than 5 minutes)',
        requiresVerification: true
      };
    }
    
    return {
      isVerified: true,
      reason: 'VERIFIED',
      message: 'User is verified and within 5-minute window',
      requiresVerification: false,
      verification: {
        beneficiaryId: verification.beneficiaryId,
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        timeRemaining: Math.floor(timeRemaining / 1000) // seconds remaining
      }
    };
  } catch (error) {
    console.error('Check verification failed');
    return {
      isVerified: false,
      reason: 'ERROR',
      message: 'Verification check failed',
      requiresVerification: true
    };
  }
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
      verificationPrompt: {
        lastFourDigits: 'Please provide the last 4 digits of your Emirates ID',
        expiryDate: 'Please provide the expiry date in DD/MM/YYYY format'
      },
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

export default {
  storeVerification,
  checkVerificationStatus,
  clearVerification,
  getAllVerifications,
  cleanupExpiredVerifications,
  checkVerificationRequired
};
