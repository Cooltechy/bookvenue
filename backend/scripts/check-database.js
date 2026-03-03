require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Venue = require('../src/models/Venue');
const Booking = require('../src/models/Booking');
const Notification = require('../src/models/Notification');
const BookingRule = require('../src/models/BookingRule');

async function checkDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/venue-booking');
    console.log('✅ Connected to MongoDB\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    DATABASE SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Users
    const users = await User.find({});
    const admins = users.filter(u => u.role === 'admin');
    const superAdmins = users.filter(u => u.role === 'super_admin');
    const regularUsers = users.filter(u => u.role === 'user');
    
    console.log('👥 USERS:');
    console.log(`   Total: ${users.length}`);
    console.log(`   - Super Admins: ${superAdmins.length}`);
    console.log(`   - Admins: ${admins.length}`);
    console.log(`   - Regular Users: ${regularUsers.length}\n`);

    if (users.length > 0) {
      users.forEach(user => {
        const roleIcon = user.role === 'super_admin' ? '👑' : user.role === 'admin' ? '🔑' : '👤';
        console.log(`   ${roleIcon} ${user.firstName} ${user.lastName} (${user.email}) - ${user.role}`);
      });
      console.log();
    }

    // Venues
    const venues = await Venue.find({});
    const activeVenues = venues.filter(v => !v.isDeleted);
    const deletedVenues = venues.filter(v => v.isDeleted);
    
    console.log('🏢 VENUES:');
    console.log(`   Total: ${venues.length}`);
    console.log(`   - Active: ${activeVenues.length}`);
    console.log(`   - Deleted: ${deletedVenues.length}\n`);

    if (activeVenues.length > 0) {
      activeVenues.forEach(venue => {
        console.log(`   ✅ ${venue.name} (${venue.location}) - Capacity: ${venue.capacity}`);
      });
      console.log();
    }

    // Bookings
    const bookings = await Booking.find({});
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const approvedBookings = bookings.filter(b => b.status === 'approved');
    const rejectedBookings = bookings.filter(b => b.status === 'rejected');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
    
    console.log('📅 BOOKINGS:');
    console.log(`   Total: ${bookings.length}`);
    console.log(`   - Pending: ${pendingBookings.length}`);
    console.log(`   - Approved: ${approvedBookings.length}`);
    console.log(`   - Rejected: ${rejectedBookings.length}`);
    console.log(`   - Cancelled: ${cancelledBookings.length}\n`);

    // Notifications
    const notifications = await Notification.find({});
    const unreadNotifications = notifications.filter(n => !n.isRead);
    
    console.log('🔔 NOTIFICATIONS:');
    console.log(`   Total: ${notifications.length}`);
    console.log(`   - Unread: ${unreadNotifications.length}\n`);

    // Booking Rules
    try {
      const bookingRules = await BookingRule.find({});
      const activeRules = bookingRules.filter(r => r.isActive);
      
      console.log('📋 BOOKING RULES:');
      console.log(`   Total: ${bookingRules.length}`);
      console.log(`   - Active: ${activeRules.length}\n`);
    } catch (err) {
      console.log('📋 BOOKING RULES:');
      console.log(`   (Model not available)\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();
