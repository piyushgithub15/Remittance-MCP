#!/usr/bin/env node

/**
 * One-time migration script to update actual_status field
 * This script updates all existing RemittanceOrder records to set actual_status = status
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RemittanceOrder from '../src/models/RemittanceOrder.js';

// Load environment variables
dotenv.config();

// Database connection
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/remittance-mcp';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function migrateDualStatus() {
  try {
    console.log('🔄 Starting dual status migration...');
    
    // Find all RemittanceOrder records
    const orders = await RemittanceOrder.find({});
    console.log(`📊 Found ${orders.length} orders to migrate`);
    
    if (orders.length === 0) {
      console.log('ℹ️  No orders found to migrate');
      return;
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    
    // Update each order
    for (const order of orders) {
      try {
        // Set actual_status to match status
        await RemittanceOrder.updateOne(
          { _id: order._id },
          { 
            $set: { 
              actual_status: order.status 
            }
          }
        );
        
        console.log(`✅ Updated order ${order.orderNo}: status=${order.status}, actual_status=${order.status}`);
        updatedCount++;
        
      } catch (error) {
        console.error(`❌ Error updating order ${order.orderNo}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} orders`);
    console.log(`❌ Errors: ${errorCount} orders`);
    console.log(`📊 Total processed: ${orders.length} orders`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some errors. Please review the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function verifyMigration() {
  try {
    console.log('\n🔍 Verifying migration...');
    
    // Check for any orders where actual_status != status
    const inconsistentOrders = await RemittanceOrder.find({
      $expr: { $ne: ['$status', '$actual_status'] }
    });
    
    if (inconsistentOrders.length === 0) {
      console.log('✅ All orders have consistent status and actual_status fields');
    } else {
      console.log(`⚠️  Found ${inconsistentOrders.length} orders with inconsistent status fields:`);
      inconsistentOrders.forEach(order => {
        console.log(`   - Order ${order.orderNo}: status=${order.status}, actual_status=${order.actual_status}`);
      });
    }
    
    // Show status distribution
    const statusDistribution = await RemittanceOrder.aggregate([
      {
        $group: {
          _id: { status: '$status', actual_status: '$actual_status' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.status': 1, '_id.actual_status': 1 }
      }
    ]);
    
    console.log('\n📊 Status Distribution:');
    statusDistribution.forEach(item => {
      console.log(`   status=${item._id.status}, actual_status=${item._id.actual_status}: ${item.count} orders`);
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

async function main() {
  try {
    console.log('🚀 Starting RemittanceOrder dual status migration');
    console.log('=' .repeat(50));
    
    // Connect to database
    await connectDatabase();
    
    // Run migration
    await migrateDualStatus();
    
    // Verify migration
    await verifyMigration();
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
main();
