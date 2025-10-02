/**
 * Verification tracking system
 * Stores verification status and timestamps for users
 */

// In-memory store for verification status
const verificationStore = new Map();

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
export function storeVerification(userId, beneficiaryId, lastFourDigits, expiryDate) {
  const verificationRecord = {
    userId,
    beneficiaryId,
    lastFourDigits,
    expiryDate,
    verifiedAt: new Date(),
    expiresAt: new Date(Date.now() + VERIFICATION_EXPIRY_MS),
    isActive: true
  };
  
  verificationStore.set(userId, verificationRecord);
  
  console.log(`✅ Verification stored for user ${userId}:`, {
    beneficiaryId,
    lastFourDigits: lastFourDigits.replace(/\d/g, '*').slice(0, -4) + lastFourDigits.slice(-4),
    verifiedAt: verificationRecord.verifiedAt.toISOString(),
    expiresAt: verificationRecord.expiresAt.toISOString()
  });
  
  return verificationRecord;
}

/**
 * Check if user is verified within the last 5 minutes
 * @param {string} userId - User ID
 * @returns {Object} Verification status
 */
export function checkVerificationStatus(userId) {
  const verification = verificationStore.get(userId);
  
  if (!verification) {
    return {
      isVerified: false,
      reason: 'NO_VERIFICATION',
      message: 'No verification found for this user',
      requiresVerification: true
    };
  }
  
  if (!verification.isActive) {
    return {
      isVerified: false,
      reason: 'VERIFICATION_INACTIVE',
      message: 'Verification is no longer active',
      requiresVerification: true
    };
  }
  
  const now = new Date();
  const timeRemaining = verification.expiresAt.getTime() - now.getTime();
  
  if (timeRemaining <= 0) {
    // Verification expired, remove from store
    verificationStore.delete(userId);
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
}

/**
 * Clear verification for a user
 * @param {string} userId - User ID
 */
export function clearVerification(userId) {
  verificationStore.delete(userId);
  console.log(`🧹 Verification cleared for user ${userId}`);
}

/**
 * Get all active verifications (for debugging)
 * @returns {Array} Array of active verifications
 */
export function getAllVerifications() {
  const now = new Date();
  const activeVerifications = [];
  
  for (const [userId, verification] of verificationStore.entries()) {
    if (verification.isActive && verification.expiresAt > now) {
      activeVerifications.push({
        userId,
        beneficiaryId: verification.beneficiaryId,
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        timeRemaining: Math.floor((verification.expiresAt.getTime() - now.getTime()) / 1000)
      });
    }
  }
  
  return activeVerifications;
}

/**
 * Clean up expired verifications
 */
export function cleanupExpiredVerifications() {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [userId, verification] of verificationStore.entries()) {
    if (verification.expiresAt <= now) {
      verificationStore.delete(userId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired verifications`);
  }
  
  return cleanedCount;
}

/**
 * Check if verification is required for a specific action
 * @param {string} userId - User ID
 * @param {string} action - Action being performed
 * @returns {Object} Verification requirement status
 */
export function checkVerificationRequired(userId, action = 'transaction') {
  const status = checkVerificationStatus(userId);
  
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
setInterval(cleanupExpiredVerifications, 60000);

export default {
  storeVerification,
  checkVerificationStatus,
  clearVerification,
  getAllVerifications,
  cleanupExpiredVerifications,
  checkVerificationRequired
};
