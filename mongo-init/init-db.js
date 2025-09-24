// MongoDB initialization script
// This script runs when the MongoDB container starts for the first time

// Switch to the remittance-mcp database
db = db.getSiblingDB('remittance-mcp');

// Create collections with validation
db.createCollection('exchangerates', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['fromCountry', 'fromCurrency', 'toCountry', 'toCurrency', 'rate'],
      properties: {
        fromCountry: { bsonType: 'string', minLength: 2, maxLength: 2 },
        fromCurrency: { bsonType: 'string', minLength: 3, maxLength: 3 },
        toCountry: { bsonType: 'string', minLength: 2, maxLength: 2 },
        toCurrency: { bsonType: 'string', minLength: 3, maxLength: 3 },
        rate: { bsonType: 'number', minimum: 0 },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('beneficiaries', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['userId', 'id', 'title', 'name', 'currency', 'country', 'transferModes', 'accountNumber', 'bankName'],
      properties: {
        userId: { bsonType: 'string' },
        id: { bsonType: 'number' },
        title: { bsonType: 'string' },
        name: { bsonType: 'string' },
        currency: { bsonType: 'string', minLength: 3, maxLength: 3 },
        country: { bsonType: 'string', minLength: 2, maxLength: 2 },
        transferModes: { 
          bsonType: 'array',
          items: { 
            bsonType: 'string',
            enum: ['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI']
          }
        },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('remittanceorders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['orderNo', 'userId', 'beneficiaryId', 'fromAmount', 'feeAmount', 'totalPayAmount', 'status', 'transferMode', 'country', 'currency', 'beneficiaryName', 'description'],
      properties: {
        orderNo: { bsonType: 'string' },
        userId: { bsonType: 'string' },
        status: { 
          bsonType: 'string',
          enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'AML_HOLD']
        },
        transferMode: { 
          bsonType: 'string',
          enum: ['BANK_TRANSFER', 'CASH_PICK_UP', 'MOBILE_WALLET', 'UPI']
        },
        fromAmount: { bsonType: 'number', minimum: 0 },
        feeAmount: { bsonType: 'number', minimum: 0 },
        totalPayAmount: { bsonType: 'number', minimum: 0 }
      }
    }
  }
});

db.createCollection('suggestedamounts', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['amount', 'currency'],
      properties: {
        amount: { bsonType: 'number', minimum: 0 },
        currency: { bsonType: 'string', minLength: 3, maxLength: 3 },
        isActive: { bsonType: 'bool' }
      }
    }
  }
});

// Create indexes for better performance
db.exchangerates.createIndex({ fromCountry: 1, fromCurrency: 1, toCountry: 1, toCurrency: 1 }, { unique: true });
db.exchangerates.createIndex({ isActive: 1 });

db.beneficiaries.createIndex({ userId: 1, isActive: 1 });
db.beneficiaries.createIndex({ userId: 1, country: 1, currency: 1 });

db.remittanceorders.createIndex({ orderNo: 1 }, { unique: true });
db.remittanceorders.createIndex({ userId: 1, status: 1 });
db.remittanceorders.createIndex({ userId: 1, date: -1 });
db.remittanceorders.createIndex({ userId: 1, transferMode: 1 });
db.remittanceorders.createIndex({ userId: 1, country: 1 });
db.remittanceorders.createIndex({ userId: 1, currency: 1 });

db.suggestedamounts.createIndex({ isActive: 1, sortOrder: 1 });

print('MongoDB initialization completed successfully!');
