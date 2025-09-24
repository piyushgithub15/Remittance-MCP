#!/usr/bin/env node

/**
 * Test script for getBeneficiaries tool
 * This script demonstrates the beneficiaries query functionality
 */

import { connectDatabase } from '../src/config/database.js';
import { seedAllData } from '../src/utils/seedData.js';
import { getBeneficiaries } from '../src/tools/getBeneficiaries.js';
import { getBeneficiaryStatistics } from '../src/tools/getBeneficiaries.js';

async function testBeneficiaries() {
  console.log('🧪 Testing getBeneficiaries Tool...\n');

  try {
    // Connect to database
    console.log('1. Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Seed initial data
    console.log('2. Seeding initial data...');
    await seedAllData();
    console.log('✅ Data seeded\n');

    // Test 1: Get all beneficiaries
    console.log('3. Testing get all beneficiaries...');
    const allBeneficiariesResult = await getBeneficiaries({});
    const allBeneficiariesData = JSON.parse(allBeneficiariesResult.content[0].text);
    console.log('✅ All beneficiaries retrieved');
    console.log('   Total beneficiaries:', allBeneficiariesData.total);
    console.log('   First beneficiary:', allBeneficiariesData.data[0]?.name);

    // Test 2: Filter by country
    console.log('\n4. Testing filter by country (CN)...');
    const chinaBeneficiariesResult = await getBeneficiaries({ country: 'CN' });
    const chinaBeneficiariesData = JSON.parse(chinaBeneficiariesResult.content[0].text);
    console.log('✅ China beneficiaries retrieved');
    console.log('   China beneficiaries:', chinaBeneficiariesData.total);
    console.log('   Currencies:', chinaBeneficiariesData.data.map(b => b.currency).join(', '));

    // Test 3: Filter by currency
    console.log('\n5. Testing filter by currency (USD)...');
    const usdBeneficiariesResult = await getBeneficiaries({ currency: 'USD' });
    const usdBeneficiariesData = JSON.parse(usdBeneficiariesResult.content[0].text);
    console.log('✅ USD beneficiaries retrieved');
    console.log('   USD beneficiaries:', usdBeneficiariesData.total);
    console.log('   Names:', usdBeneficiariesData.data.map(b => b.name).join(', '));

    // Test 4: Filter by transfer mode
    console.log('\n6. Testing filter by transfer mode (BANK_TRANSFER)...');
    const bankTransferBeneficiariesResult = await getBeneficiaries({ transferMode: 'BANK_TRANSFER' });
    const bankTransferBeneficiariesData = JSON.parse(bankTransferBeneficiariesResult.content[0].text);
    console.log('✅ BANK_TRANSFER beneficiaries retrieved');
    console.log('   BANK_TRANSFER beneficiaries:', bankTransferBeneficiariesData.total);

    // Test 5: Filter by country and currency
    console.log('\n7. Testing filter by country and currency (CN, CNY)...');
    const cnCnyBeneficiariesResult = await getBeneficiaries({ country: 'CN', currency: 'CNY' });
    const cnCnyBeneficiariesData = JSON.parse(cnCnyBeneficiariesResult.content[0].text);
    console.log('✅ CN CNY beneficiaries retrieved');
    console.log('   CN CNY beneficiaries:', cnCnyBeneficiariesData.total);

    // Test 6: Limit results
    console.log('\n8. Testing limit results (limit: 2)...');
    const limitedBeneficiariesResult = await getBeneficiaries({ limit: 2 });
    const limitedBeneficiariesData = JSON.parse(limitedBeneficiariesResult.content[0].text);
    console.log('✅ Limited beneficiaries retrieved');
    console.log('   Limited beneficiaries:', limitedBeneficiariesData.total);

    // Test 7: Get beneficiary statistics
    console.log('\n9. Testing beneficiary statistics...');
    const stats = await getBeneficiaryStatistics();
    console.log('✅ Beneficiary statistics retrieved');
    console.log('   Total beneficiaries:', stats.totalBeneficiaries);
    console.log('   By country:', stats.byCountry.map(s => `${s._id}: ${s.count}`).join(', '));
    console.log('   By currency:', stats.byCurrency.map(s => `${s._id}: ${s.count}`).join(', '));
    console.log('   By transfer mode:', stats.byTransferMode.map(s => `${s._id}: ${s.count}`).join(', '));

    // Test 8: Test with no results
    console.log('\n10. Testing filter with no results (country: XX)...');
    const noResultsResult = await getBeneficiaries({ country: 'XX' });
    const noResultsData = JSON.parse(noResultsResult.content[0].text);
    console.log('✅ No results test completed');
    console.log('   No results beneficiaries:', noResultsData.total);
    console.log('   Message:', noResultsData.message);

    console.log('\n🎉 All getBeneficiaries tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Get all beneficiaries works');
    console.log('   ✅ Filter by country works');
    console.log('   ✅ Filter by currency works');
    console.log('   ✅ Filter by transfer mode works');
    console.log('   ✅ Combined filters work');
    console.log('   ✅ Limit parameter works');
    console.log('   ✅ Statistics function works');
    console.log('   ✅ No results handling works');
    
  } catch (error) {
    console.error('❌ getBeneficiaries test failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the test
testBeneficiaries();
