import ExchangeRate from '../models/ExchangeRate.js';
import Beneficiary from '../models/Beneficiary.js';
import RemittanceOrder from '../models/RemittanceOrder.js';
import SuggestedAmount from '../models/SuggestedAmount.js';

/**
 * Seed exchange rates data
 */
export async function seedExchangeRates() {
  try {
    // Check if data already exists
    const existingRates = await ExchangeRate.countDocuments();
    if (existingRates > 0) {
      console.log('Exchange rates already seeded');
      return;
    }

    const exchangeRates = [
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'CN',
        toCurrency: 'CNY',
        rate: 1.89,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'China',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.cn.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'US',
        toCurrency: 'USD',
        rate: 0.27,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'United States',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.us.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'IN',
        toCurrency: 'INR',
        rate: 22.50,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'India',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.in.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'GB',
        toCurrency: 'GBP',
        rate: 0.21,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'United Kingdom',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.gb.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'EU',
        toCurrency: 'EUR',
        rate: 0.25,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'European Union',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.eu.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'JP',
        toCurrency: 'JPY',
        rate: 40.50,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'Japan',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.jp.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'AU',
        toCurrency: 'AUD',
        rate: 0.41,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'Australia',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.au.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'CA',
        toCurrency: 'CAD',
        rate: 0.37,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'Canada',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.ca.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'SG',
        toCurrency: 'SGD',
        rate: 0.37,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'Singapore',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.sg.png'
      },
      {
        fromCountry: 'AE',
        fromCurrency: 'AED',
        toCountry: 'MY',
        toCurrency: 'MYR',
        rate: 1.28,
        fromCountryName: 'United Arab Emirates',
        toCountryName: 'Malaysia',
        fromCurrencyIcon: 'https://icon.ae.png',
        toCurrencyIcon: 'https://icon.my.png'
      }
    ];

    await ExchangeRate.insertMany(exchangeRates);
    console.log('Exchange rates seeded successfully');
  } catch (error) {
    console.error('Error seeding exchange rates:', error);
    throw error;
  }
}

/**
 * Seed beneficiaries data
 */
export async function seedBeneficiaries() {
  try {
    // Check if data already exists
    const existingBeneficiaries = await Beneficiary.countDocuments();
    if (existingBeneficiaries > 0) {
      console.log('Beneficiaries already seeded');
      return;
    }

    const beneficiaries = [
      {
        userId: 'agent1',
        id: 123,
        title: 'Bank of China 1234567890',
        name: '张三',
        currency: 'CNY',
        icon: 'https://icon.bank.png',
        country: 'CN',
        transferModes: ['BANK_TRANSFER'],
        accountNumber: '1234567890',
        bankName: 'Bank of China'
      },
      {
        userId: 'agent1',
        id: 124,
        title: 'ICBC - 6543210987',
        name: '李四',
        currency: 'CNY',
        icon: 'https://icon.icbc.png',
        country: 'CN',
        transferModes: ['BANK_TRANSFER'],
        accountNumber: '6543210987',
        bankName: 'ICBC'
      },
      {
        userId: 'agent1',
        id: 125,
        title: 'John Smith - Wells Fargo',
        name: 'John Smith',
        currency: 'USD',
        icon: 'https://icon.wellsfargo.png',
        country: 'US',
        transferModes: ['BANK_TRANSFER'],
        accountNumber: '9876543210',
        bankName: 'Wells Fargo'
      },
      {
        userId: 'agent1',
        id: 126,
        title: 'Mary Johnson - Chase',
        name: 'Mary Johnson',
        currency: 'USD',
        icon: 'https://icon.chase.png',
        country: 'US',
        transferModes: ['BANK_TRANSFER', 'CASH_PICK_UP'],
        accountNumber: '1234567890',
        bankName: 'Chase Bank'
      },
      {
        userId: 'agent1',
        id: 127,
        title: 'Raj Patel - SBI',
        name: 'Raj Patel',
        currency: 'INR',
        icon: 'https://icon.sbi.png',
        country: 'IN',
        transferModes: ['BANK_TRANSFER', 'UPI'],
        accountNumber: '1122334455',
        bankName: 'State Bank of India'
      }
    ];

    await Beneficiary.insertMany(beneficiaries);
    console.log('Beneficiaries seeded successfully');
  } catch (error) {
    console.error('Error seeding beneficiaries:', error);
    throw error;
  }
}

/**
 * Seed suggested amounts data
 */
export async function seedSuggestedAmounts() {
  try {
    // Check if data already exists
    const existingAmounts = await SuggestedAmount.countDocuments();
    if (existingAmounts > 0) {
      console.log('Suggested amounts already seeded');
      return;
    }

    const suggestedAmounts = [
      { amount: 1000.00, sortOrder: 1 },
      { amount: 2000.00, sortOrder: 2 },
      { amount: 5000.00, sortOrder: 3 },
      { amount: 10000.00, sortOrder: 4 }
    ];

    await SuggestedAmount.insertMany(suggestedAmounts);
    console.log('Suggested amounts seeded successfully');
  } catch (error) {
    console.error('Error seeding suggested amounts:', error);
    throw error;
  }
}

/**
 * Seed remittance orders data
 */
export async function seedRemittanceOrders() {
  try {
    // Check if data already exists
    const existingOrders = await RemittanceOrder.countDocuments();
    if (existingOrders > 0) {
      console.log('Remittance orders already seeded');
      return;
    }

    // Get beneficiary IDs for reference
    const beneficiaries = await Beneficiary.find({ userId: 'agent1' });
    if (beneficiaries.length === 0) {
      console.log('No beneficiaries found, skipping order seeding');
      return;
    }

    const orders = [
      {
        orderNo: '1234567890',
        userId: 'agent1',
        beneficiaryId: beneficiaries[0]._id,
        fromAmount: 1000.00,
        feeAmount: 10.00,
        totalPayAmount: 1010.00,
        status: 'SUCCESS',
        dateDesc: '2024-06-01',
        date: new Date('2024-06-01T12:00:00Z'),
        failReason: null,
        amlHoldUrl: null,
        orderDetailUrl: 'https://order-detail.example.com/1234567890',
        transferMode: 'BANK_TRANSFER',
        country: 'CN',
        currency: 'CNY',
        beneficiaryName: '张三',
        description: 'Transfer to Bank of China',
        exchangeRate: 1.89,
        receivedAmount: 1890.00
      },
      {
        orderNo: '1234567891',
        userId: 'agent1',
        beneficiaryId: beneficiaries[2]._id,
        fromAmount: 2000.00,
        feeAmount: 15.00,
        totalPayAmount: 2015.00,
        status: 'PENDING',
        dateDesc: '2024-06-02',
        date: new Date('2024-06-02T14:30:00Z'),
        failReason: null,
        amlHoldUrl: null,
        orderDetailUrl: 'https://order-detail.example.com/1234567891',
        transferMode: 'BANK_TRANSFER',
        country: 'US',
        currency: 'USD',
        beneficiaryName: 'John Smith',
        description: 'Transfer to Wells Fargo',
        exchangeRate: 0.27,
        receivedAmount: 540.00
      },
      {
        orderNo: '1234567892',
        userId: 'agent1',
        beneficiaryId: beneficiaries[4]._id,
        fromAmount: 500.00,
        feeAmount: 8.00,
        totalPayAmount: 508.00,
        status: 'FAILED',
        dateDesc: '2024-06-03',
        date: new Date('2024-06-03T09:15:00Z'),
        failReason: 'Insufficient funds',
        amlHoldUrl: null,
        orderDetailUrl: 'https://order-detail.example.com/1234567892',
        transferMode: 'CASH_PICK_UP',
        country: 'IN',
        currency: 'INR',
        beneficiaryName: 'Raj Patel',
        description: 'Cash pickup at SBI branch',
        exchangeRate: 22.50,
        receivedAmount: 11250.00
      }
    ];

    await RemittanceOrder.insertMany(orders);
    console.log('Remittance orders seeded successfully');
  } catch (error) {
    console.error('Error seeding remittance orders:', error);
    throw error;
  }
}

/**
 * Seed all data
 */
export async function seedAllData() {
  try {
    console.log('Starting data seeding...');
    
    await seedExchangeRates();
    await seedBeneficiaries();
    await seedSuggestedAmounts();
    await seedRemittanceOrders();
    
    console.log('All data seeded successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}
