#!/usr/bin/env node

/**
 * Test script for MongoDB integration
 * This script tests the database connection and data seeding
 */

import { connectDatabase } from '../src/config/database.js';
import { seedAllData } from '../src/utils/seedData.js';
import ExchangeRate from '../src/models/ExchangeRate.js';
import Beneficiary from '../src/models/Beneficiary.js';
import RemittanceOrder from '../src/models/RemittanceOrder.js';
import SuggestedAmount from '../src/models/SuggestedAmount.js';

async function testMongoDBIntegration() {
  console.log('🧪 Testing MongoDB Integration...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await connectDatabase();
    console.log('✅ Database connection successful\n');

    // Test data seeding
    console.log('2. Testing data seeding...');
    await seedAllData();
    console.log('✅ Data seeding successful\n');

    // Test queries
    console.log('3. Testing database queries...');
    
    // Test exchange rates
    const exchangeRates = await ExchangeRate.find({ isActive: true });
    console.log(`✅ Found ${exchangeRates.length} exchange rates`);
    
    // Test beneficiaries
    const beneficiaries = await Beneficiary.find({ userId: 'agent1', isActive: true });
    console.log(`✅ Found ${beneficiaries.length} beneficiaries`);
    
    // Test suggested amounts
    const suggestedAmounts = await SuggestedAmount.find({ isActive: true });
    console.log(`✅ Found ${suggestedAmounts.length} suggested amounts`);
    
    // Test remittance orders
    const orders = await RemittanceOrder.find({ userId: 'agent1' });
    console.log(`✅ Found ${orders.length} remittance orders`);

    // Test specific queries
    console.log('\n4. Testing specific queries...');
    
    // Test exchange rate query
    const cnyRate = await ExchangeRate.findOne({
      fromCountry: 'AE',
      fromCurrency: 'AED',
      toCountry: 'CN',
      toCurrency: 'CNY',
      isActive: true
    });
    console.log(`✅ CNY exchange rate: ${cnyRate ? cnyRate.rate : 'Not found'}`);
    
    // Test beneficiary query
    const beneficiary = await Beneficiary.findOne({
      userId: 'agent1',
      name: { $regex: 'John', $options: 'i' }
    });
    console.log(`✅ Found beneficiary: ${beneficiary ? beneficiary.name : 'Not found'}`);
    
    // Test order query with filters
    const successOrders = await RemittanceOrder.find({
      userId: 'agent1',
      status: 'SUCCESS'
    });
    console.log(`✅ Found ${successOrders.length} successful orders`);

    console.log('\n🎉 All MongoDB integration tests passed!');
    
  } catch (error) {
    console.error('❌ MongoDB integration test failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

// Run the test
testMongoDBIntegration();
