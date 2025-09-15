#!/usr/bin/env node

/**
 * JWT Token Generation Script
 * 
 * This script generates JWT tokens for testing and development purposes.
 * 
 * Usage:
 *   node scripts/generate-token.js [userId] [scope]
 * 
 * Examples:
 *   node scripts/generate-token.js
 *   node scripts/generate-token.js agent1 read
 *   node scripts/generate-token.js user123 admin
 */

import { generateJWTToken } from '../src/utils/jwt.js';

const args = process.argv.slice(2);
const userId = args[0] || 'agent1';
const scope = args[1] || 'read';

console.log('🔐 JWT Token Generator');
console.log('====================');
console.log('');

try {
  const token = generateJWTToken(userId, scope);
  
  console.log('✅ Token generated successfully!');
  console.log('');
  console.log('📋 Token Details:');
  console.log(`   User ID: ${userId}`);
  console.log(`   Scope: ${scope}`);
  console.log(`   Expires: 1 hour`);
  console.log('');
  console.log('🔑 Generated Token:');
  console.log(token);
  console.log('');
  console.log('📝 Usage Examples:');
  console.log('');
  console.log('cURL with Authorization Header:');
  console.log(`curl -H "Authorization: Bearer ${token}" \\`);
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}\' \\');
  console.log('     http://localhost:8080/mcp/messages');
  console.log('');
  console.log('cURL with URL Parameter:');
  console.log(`curl "http://localhost:8080/mcp/messages?token=${token}" \\`);
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"method":"queryExchangeRate","params":{"toCountry":"CN","toCurrency":"CNY"}}\'');
  console.log('');
  console.log('JavaScript/Node.js:');
  console.log(`const token = '${token}';`);
  console.log('const response = await fetch("http://localhost:8080/mcp/messages", {');
  console.log('  method: "POST",');
  console.log('  headers: {');
  console.log('    "Authorization": `Bearer ${token}`');
  console.log('    "Content-Type": "application/json"');
  console.log('  },');
  console.log('  body: JSON.stringify({');
  console.log('    method: "queryExchangeRate",');
  console.log('    params: { toCountry: "CN", toCurrency: "CNY" }');
  console.log('  })');
  console.log('});');
  console.log('');
  console.log('⚠️  Security Note:');
  console.log('   - Keep this token secure and do not share it');
  console.log('   - Tokens expire after 1 hour');
  console.log('   - Use environment variables for production secrets');
  
} catch (error) {
  console.error('❌ Error generating token:', error.message);
  process.exit(1);
}
