const mongoose = require('mongoose');
require('dotenv').config();

const SystemParameter = require('../src/models/SystemParameter');

async function setAdvanceBookingDays() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const days = process.argv[2];
    
    if (!days || isNaN(parseInt(days, 10))) {
      console.error('Usage: node set-advance-booking-days.js <number_of_days>');
      console.error('Example: node set-advance-booking-days.js 10');
      process.exit(1);
    }

    const daysValue = parseInt(days, 10);
    
    if (daysValue < 0) {
      console.error('Number of days must be 0 or greater');
      process.exit(1);
    }

    // Update or create the parameter
    const result = await SystemParameter.findOneAndUpdate(
      { key: 'MIN_ADVANCE_BOOKING_DAYS' },
      {
        key: 'MIN_ADVANCE_BOOKING_DAYS',
        value: daysValue.toString(),
        description: 'Minimum number of days in advance that bookings must be made'
      },
      { upsert: true, new: true }
    );

    console.log('\n✓ Minimum advance booking days set successfully!');
    console.log(`  Days: ${daysValue}`);
    console.log(`  Description: ${result.description}`);
    console.log('\nUsers must now book venues at least', daysValue, 'day(s) in advance.');

  } catch (error) {
    console.error('Error setting advance booking days:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

setAdvanceBookingDays();
