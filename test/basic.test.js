import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import the tool functions
import { queryExchangeRate } from '../src/tools/queryExchangeRate.js';
import { transferMoney } from '../src/tools/transferMoney.js';
import { remittanceOrderQuery } from '../src/tools/remittanceOrderQuery.js';
import { generateJWTToken, verifyJWTToken } from '../src/utils/jwt.js';

describe('Remittance MCP Server Tests', () => {
  describe('JWT Utilities', () => {
    it('should generate a valid JWT token', () => {
      const token = generateJWTToken('test-user', 'read');
      assert(typeof token === 'string');
      assert(token.length > 0);
    });

    it('should verify a valid JWT token', () => {
      const token = generateJWTToken('test-user', 'read');
      const decoded = verifyJWTToken(token);
      assert(decoded.sub === 'test-user');
      assert(decoded.scope === 'read');
    });

    it('should throw error for invalid JWT token', () => {
      assert.throws(() => {
        verifyJWTToken('invalid-token');
      }, /Invalid JWT token/);
    });
  });

  describe('queryExchangeRate', () => {
    it('should return exchange rate for valid country and currency', async () => {
      const result = await queryExchangeRate({
        toCountry: 'CN',
        toCurrency: 'CNY'
      });
      
      assert(result.isError === false);
      assert(result.content.length > 0);
      
      const response = JSON.parse(result.content[0].text);
      assert(response.head.applyStatus === 'SUCCESS');
      assert(response.body.exchangeRate > 0);
    });

    it('should return error for invalid country/currency', async () => {
      const result = await queryExchangeRate({
        toCountry: 'XX',
        toCurrency: 'XXX'
      });
      
      assert(result.isError === false);
      const response = JSON.parse(result.content[0].text);
      assert(response.head.applyStatus === 'FAILED');
    });

    it('should return error for missing parameters', async () => {
      const result = await queryExchangeRate({});
      
      assert(result.isError === true);
      assert(result.content[0].text.includes('required'));
    });
  });

  describe('transferMoney', () => {
    it('should return discovery data when called without parameters', async () => {
      const result = await transferMoney({});
      
      assert(result.isError === false);
      const response = JSON.parse(result.content[0].text);
      assert(response.code === 200);
      assert(Array.isArray(response.beneficiaries));
      assert(Array.isArray(response.sendAmounts));
    });

    it('should return error for missing required parameters in execution', async () => {
      const result = await transferMoney({
        beneficiaryName: 'John Smith'
        // Missing sendAmount
      });
      
      assert(result.isError === true);
      assert(result.content[0].text.includes('required'));
    });

    it('should process valid transfer request', async () => {
      const result = await transferMoney({
        beneficiaryId: '123',
        beneficiaryName: 'John Smith',
        sendAmount: 1000,
        callBackProvider: 'voice'
      });
      
      assert(result.isError === false);
      const response = JSON.parse(result.content[0].text);
      assert(response.code === 200);
      assert(response.button);
      assert(response.button.link);
    });
  });

  describe('remittanceOrderQuery', () => {
    it('should return order history with default parameters', async () => {
      const result = await remittanceOrderQuery({});
      
      assert(result.isError === false);
      const response = JSON.parse(result.content[0].text);
      assert(response.code === 200);
      assert(Array.isArray(response.data));
    });

    it('should filter orders by country', async () => {
      const result = await remittanceOrderQuery({
        country: 'CN',
        orderCount: 5
      });
      
      assert(result.isError === false);
      const response = JSON.parse(result.content[0].text);
      assert(response.code === 200);
      assert(Array.isArray(response.data));
    });

    it('should validate order count limits', async () => {
      const result = await remittanceOrderQuery({
        orderCount: 100 // Exceeds max of 50
      });
      
      assert(result.isError === true);
      assert(result.content[0].text.includes('maximum'));
    });
  });
});
