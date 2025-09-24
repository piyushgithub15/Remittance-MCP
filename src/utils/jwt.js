import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'kX8jBUle1vefPPoGrG58ZDDU+f+l9PBJUPWoqT3xgEE=';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Generate a JWT token for authentication
 * @param {string} userId - User identifier (e.g., "agent1", "user123")
 * @param {string} scope - Access scope (e.g., "read", "write", "admin")
 * @param {Object} additionalClaims - Additional claims to include in the token
 * @returns {string} JWT token
 */
export function generateJWTToken(userId, scope = 'read', additionalClaims = {}) {
  const payload = {
    sub: userId,
    scope: scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (360000000), // 1 hour default
    ...additionalClaims
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export function verifyJWTToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    throw new Error(`Invalid JWT token: ${error.message}`);
  }
}

/**
 * Decode a JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
export function decodeJWTToken(token) {
  return jwt.decode(token, { complete: true });
}

/**
 * Generate a token with custom expiration
 * @param {string} userId - User identifier
 * @param {string} scope - Access scope
 * @param {number} expiresInSeconds - Expiration time in seconds
 * @returns {string} JWT token
 */
export function generateJWTTokenWithExpiry(userId, scope, expiresInSeconds) {
  const payload = {
    sub: userId,
    scope: scope,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Generate a token for testing purposes
 * @returns {Object} Token information
 */
export function generateTestToken() {
  const userId = 'agent1';
  const scope = 'read';
  const token = generateJWTToken(userId, scope);
  
  return {
    token,
    userId,
    scope,
    expiresIn: JWT_EXPIRES_IN,
    usage: `Authorization: Bearer ${token}`
  };
}

// CLI utility for generating tokens
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const userId = args[0] || 'agent1';
  const scope = args[1] || 'read';
  
  const tokenInfo = generateTestToken();
  console.log('Generated JWT Token:');
  console.log('==================');
  console.log(`User ID: ${tokenInfo.userId}`);
  console.log(`Scope: ${tokenInfo.scope}`);
  console.log(`Expires In: ${tokenInfo.expiresIn}`);
  console.log(`Token: ${tokenInfo.token}`);
  console.log(`\nUsage in cURL:`);
  console.log(`curl -H "Authorization: Bearer ${tokenInfo.token}" ...`);
}
