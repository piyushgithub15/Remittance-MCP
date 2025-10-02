import { z } from 'zod';
import { checkVerificationStatus, checkVerificationRequired } from '../utils/verificationStore.js';

// Default user ID for demo purposes
const DEFAULT_USER_ID = 'agent1';

// Validation schema for check verification status parameters
export const checkVerificationStatusSchema = z.object({
  action: z.string().optional().default('transaction')
});

/**
 * Check if user is verified within the last 5 minutes
 * @param {Object} params - Parameters object
 * @param {string} [params.action] - Action being performed (default: 'transaction')
 * @returns {Object} ToolResult with verification status
 */
export async function checkVerificationStatusTool(params) {
  try {
    // Validate input parameters
    const validation = checkVerificationStatusSchema.safeParse(params);
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

    const { action } = validation.data;

    // Check verification status
    const verificationCheck = checkVerificationRequired(DEFAULT_USER_ID, action);

    if (verificationCheck.requiresVerification) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: 401,
              message: 'Identity verification required',
              data: {
                verified: false,
                requiresVerification: true,
                reason: verificationCheck.status.reason,
                message: verificationCheck.message,
                verificationPrompt: verificationCheck.verificationPrompt,
                action: action
              }
            })
          }
        ],
        isError: true
      };
    }

    // User is verified
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            code: 200,
            message: 'User is verified and can proceed',
            data: {
              verified: true,
              requiresVerification: false,
              verification: verificationCheck.status.verification,
              action: action
            }
          })
        }
      ],
      isError: false
    };

  } catch (error) {
    console.error('Error in checkVerificationStatus:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Verification status check failed: ${error.message}`
        }
      ],
      isError: true,
      code: -32603
    };
  }
}

/**
 * Get verification status for debugging
 * @returns {Object} Current verification status
 */
export function getVerificationDebugInfo() {
  const status = checkVerificationStatus(DEFAULT_USER_ID);
  return {
    status,
    timestamp: new Date().toISOString()
  };
}
