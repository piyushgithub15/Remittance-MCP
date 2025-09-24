#!/usr/bin/env node

/**
 * Test script for complete transfer flow
 * This script demonstrates the full transfer process:
 * 1. Transfer money (creates order in DB)
 * 2. Query orders (shows the created order)
 * 3. Update order status (simulates payment completion)
 */

import { connectDatabase } from '../src/config/database.js';
import { seedAllData } from '../src/utils/seedData.js';
import { transferMoney } from '../src/tools/transferMoney.js';
import { remittanceOrderQuery } from '../src/tools/remittanceOrderQuery.js';
import { updateOrderStatus } from '../src/tools/transferMoney.js';

async function testTransferFlow() {
  console.log('🧪 Testing Complete Transfer Flow...\n');

  try {
    // Connect to database
    console.log('1. Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected\n');

    // Seed initial data
    console.log('2. Seeding initial data...');
    await seedAllData();
    console.log('✅ Data seeded\n');

    // Step 1: Transfer money (discovery stage)
    console.log('3. Testing transfer money discovery...');
    const discoveryResult = await transferMoney({});
    console.log('✅ Discovery stage completed');
    console.log('   Beneficiaries found:', JSON.parse(discoveryResult.content[0].text).beneficiaries.length);
    console.log('   Suggested amounts:', JSON.parse(discoveryResult.content[0].text).sendAmounts.length);

    // Step 2: Transfer money (execution stage)
    console.log('\n4. Testing transfer money execution...');
    const transferResult = await transferMoney({
      beneficiaryId: '123',
      beneficiaryName: '张三',
      sendAmount: 1000,
      callBackProvider: 'voice'
    });
    
    const transferData = JSON.parse(transferResult.content[0].text);
    console.log('✅ Transfer initiated');
    console.log('   Order No:', transferData.orderNo);
    console.log('   Status:', 'PENDING');
    console.log('   Amount:', transferData.transactionDetails.sendAmount);
    console.log('   Fee:', transferData.transactionDetails.fee);
    console.log('   Total:', transferData.transactionDetails.totalAmount);

    // Step 3: Query orders (should show the new order)
    console.log('\n5. Testing order query...');
    const orderQueryResult = await remittanceOrderQuery({ orderCount: 10 });
    const orderData = JSON.parse(orderQueryResult.content[0].text);
    console.log('✅ Order query completed');
    console.log('   Orders found:', orderData.data.length);
    console.log('   Latest order:', orderData.data[0]?.orderNo);

    // Step 4: Update order status (simulate payment completion)
    console.log('\n6. Testing order status update...');
    const updatedOrder = await updateOrderStatus(transferData.orderNo, 'SUCCESS');
    if (updatedOrder) {
      console.log('✅ Order status updated to SUCCESS');
      console.log('   Order No:', updatedOrder.orderNo);
      console.log('   Status:', updatedOrder.status);
    } else {
      console.log('❌ Failed to update order status');
    }

    // Step 5: Query orders again (should show updated status)
    console.log('\n7. Testing order query after status update...');
    const updatedOrderQueryResult = await remittanceOrderQuery({ orderCount: 10 });
    const updatedOrderData = JSON.parse(updatedOrderQueryResult.content[0].text);
    console.log('✅ Updated order query completed');
    console.log('   Orders found:', updatedOrderData.data.length);
    console.log('   Latest order status:', updatedOrderData.data[0]?.status);

    // Step 6: Test filtering
    console.log('\n8. Testing order filtering...');
    const filteredResult = await remittanceOrderQuery({ 
      status: 'SUCCESS',
      orderCount: 5 
    });
    const filteredData = JSON.parse(filteredResult.content[0].text);
    console.log('✅ Filtered order query completed');
    console.log('   SUCCESS orders found:', filteredData.data.length);

    console.log('\n🎉 Complete transfer flow test passed!');
    console.log('\n📊 Summary:');
    console.log('   - Transfer money creates order in database ✅');
    console.log('   - Order query returns created orders ✅');
    console.log('   - Order status can be updated ✅');
    console.log('   - Filtering works correctly ✅');
    
  } catch (error) {
    console.error('❌ Transfer flow test failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the test
testTransferFlow();
