require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../src/models/Venue');
const User = require('../src/models/User');

const seedVenuesForAdmins = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/venue_booking';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get all admins
    const admins = await User.find({ role: 'admin' });
    
    if (admins.length === 0) {
      console.log('❌ No admins found. Please create admins first using:');
      console.log('   node scripts/create-venue-admin.js');
      process.exit(1);
    }

    if (admins.length < 2) {
      console.log('⚠️  Only 1 admin found. Creating venues for this admin...\n');
    } else {
      console.log(`✅ Found ${admins.length} admins\n`);
    }

    // Venues for Admin 1
    const admin1Venues = [
      {
        name: 'Main Auditorium',
        description: 'Large auditorium with state-of-the-art audio-visual equipment, perfect for conferences and seminars.',
        capacity: 500,
        location: 'Central Campus, Building A',
        authority: 'Campus Events Authority',
        price: 200,
        halfDayPrice: 3000,
        fullDayPrice: 5000,
        amenities: ['WiFi', 'Parking', 'Catering', 'Audio System', 'Projector'],
        currency: 'INR',
        ownerId: admins[0]._id
      },
      {
        name: 'Conference Hall',
        description: 'Modern conference facility with video conferencing capabilities, ideal for meetings and workshops.',
        capacity: 100,
        location: 'Administrative Block, 2nd Floor',
        authority: 'Academic Affairs Department',
        price: 180,
        halfDayPrice: 2500,
        fullDayPrice: 4500,
        amenities: ['WiFi', 'Parking', 'Video Conferencing', 'Breakout Rooms', 'Catering'],
        currency: 'INR',
        ownerId: admins[0]._id
      },
      {
        name: 'Seminar Room A',
        description: 'Intimate seminar space perfect for small group discussions and presentations.',
        capacity: 50,
        location: 'Academic Block, 3rd Floor',
        authority: 'Academic Affairs Department',
        price: 100,
        halfDayPrice: 1500,
        fullDayPrice: 2500,
        amenities: ['WiFi', 'Whiteboard', 'Projector', 'Air Conditioning'],
        currency: 'INR',
        ownerId: admins[0]._id
      }
    ];

    // Venues for Admin 2 (if exists)
    const admin2Venues = admins.length >= 2 ? [
      {
        name: 'Open Air Theatre',
        description: 'Outdoor amphitheater with natural acoustics, suitable for cultural performances and large gatherings.',
        capacity: 300,
        location: 'Near Sports Complex',
        authority: 'Cultural Affairs Office',
        price: 150,
        halfDayPrice: 2000,
        fullDayPrice: 3500,
        amenities: ['Parking', 'Outdoor Seating', 'Lighting', 'Restrooms', 'Stage'],
        currency: 'INR',
        ownerId: admins[1]._id
      },
      {
        name: 'Student Activity Center',
        description: 'Multipurpose space for student clubs and organizations, equipped with flexible seating.',
        capacity: 80,
        location: 'Student Union Building',
        authority: 'Student Activities Board',
        price: 100,
        halfDayPrice: 1500,
        fullDayPrice: 2500,
        amenities: ['WiFi', 'Whiteboard', 'Lounge Area', 'Kitchen'],
        currency: 'INR',
        ownerId: admins[1]._id
      },
      {
        name: 'Rooftop Lounge',
        description: 'Scenic rooftop venue with panoramic views, perfect for social events and networking.',
        capacity: 60,
        location: 'Library Building, Top Floor',
        authority: 'Student Affairs',
        price: 120,
        halfDayPrice: 1800,
        fullDayPrice: 3000,
        amenities: ['WiFi', 'Kitchen', 'Terrace', 'Premium Sound System', 'Bar Counter'],
        currency: 'INR',
        ownerId: admins[1]._id
      }
    ] : [];

    // Insert venues
    console.log(`Creating venues for Admin 1: ${admins[0].email}`);
    await Venue.insertMany(admin1Venues);
    console.log(`✅ Created ${admin1Venues.length} venues for ${admins[0].firstName} ${admins[0].lastName}\n`);

    if (admin2Venues.length > 0) {
      console.log(`Creating venues for Admin 2: ${admins[1].email}`);
      await Venue.insertMany(admin2Venues);
      console.log(`✅ Created ${admin2Venues.length} venues for ${admins[1].firstName} ${admins[1].lastName}\n`);
    }

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];
      const venueCount = await Venue.countDocuments({ ownerId: admin._id });
      console.log(`\n${i + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
      console.log(`   Department: ${admin.department || 'Not specified'}`);
      console.log(`   Venues: ${venueCount}`);
      
      const venues = await Venue.find({ ownerId: admin._id });
      venues.forEach(v => {
        console.log(`      - ${v.name} (Capacity: ${v.capacity})`);
      });
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ All venues created successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Login as each admin to see their venues');
    console.log('   2. Go to Admin → Manage Venues');
    console.log('   3. Each admin will only see their own venues');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedVenuesForAdmins();
