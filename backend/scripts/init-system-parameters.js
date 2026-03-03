const mongoose = require('mongoose');
require('dotenv').config();

const SystemParameter = require('../src/models/SystemParameter');

async function initSystemParameters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Initialize MIN_ADVANCE_BOOKING_DAYS if it doesn't exist
    const existingParam = await SystemParameter.findOne({ key: 'MIN_ADVANCE_BOOKING_DAYS' });
    
    if (!existingParam) {
      await SystemParameter.create({
        key: 'MIN_ADVANCE_BOOKING_DAYS',
        value: '10',
        description: 'Minimum number of days in advance that bookings must be made'
      });
      console.log('✓ Created MIN_ADVANCE_BOOKING_DAYS parameter with default value: 10 days');
    } else {
      console.log('✓ MIN_ADVANCE_BOOKING_DAYS parameter already exists with value:', existingParam.value, 'days');
    }

    console.log('\nSystem parameters initialized successfully!');

  } catch (error) {
    console.error('Error initializing system parameters:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

initSystemParameters();
