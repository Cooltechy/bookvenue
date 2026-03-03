require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const demoteSuperAdmin = async () => {
  try {
    // Get email from command line
    const email = process.argv[2];
    
    if (!email) {
      console.log('❌ Usage: node scripts/demote-super-admin.js <email>');
      console.log('Example: node scripts/demote-super-admin.js admin@uohyd.ac.in');
      console.log('\n📝 This will demote a super admin to a regular user.');
      console.log('   The account will remain but lose all admin privileges.');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/venue_booking';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('❌ User not found with email:', email);
      process.exit(1);
    }

    // Check if user is super admin
    if (user.role !== 'super_admin') {
      console.log('❌ User is not a super admin');
      console.log(`   Current role: ${user.role}`);
      console.log('\n💡 To demote regular admins, use the Admin Manager UI');
      process.exit(1);
    }

    // Check how many super admins exist
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    
    if (superAdminCount === 1) {
      console.log('⚠️  WARNING: This is the ONLY super admin in the system!');
      console.log('   Demoting this account will leave the system without a super admin.');
      console.log('\n❌ Operation cancelled for safety.');
      console.log('\n💡 Create another super admin first:');
      console.log('   node scripts/create-super-admin-custom.js <email> <password> <firstName> <lastName>');
      process.exit(1);
    }

    // Display user details
    console.log('📋 Super Admin to Demote:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', `${user.firstName} ${user.lastName}`);
    console.log('Email:', user.email);
    console.log('Current Role:', user.role);
    console.log('Department:', user.department || 'Not specified');
    console.log('Created:', user.createdAt.toLocaleDateString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`ℹ️  There are ${superAdminCount} super admin(s) in the system.`);
    console.log('📝 After demotion:');
    console.log('   - User will become a regular user (role: user)');
    console.log('   - Account will remain active');
    console.log('   - User can still login and make bookings');
    console.log('   - User will lose all admin privileges');
    console.log('\n⚠️  This action can be reversed by promoting the user again.');
    console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Store old role
    const oldRole = user.role;

    // Demote to regular user
    user.role = 'user';
    await user.save();

    console.log('✅ Super admin demoted successfully!');
    console.log('\n📋 Updated User Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name:', `${user.firstName} ${user.lastName}`);
    console.log('Email:', user.email);
    console.log('Previous Role:', oldRole);
    console.log('New Role:', user.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📊 Remaining super admins:');
    const remainingSuperAdmins = await User.find({ role: 'super_admin' });
    remainingSuperAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email})`);
    });

    console.log('\n💡 To promote this user back to super admin:');
    console.log(`   node scripts/promote-user-to-super-admin.js ${user.email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error demoting super admin:', error.message);
    process.exit(1);
  }
};

console.log('👤 Demote Super Admin to Regular User\n');
console.log('This script will demote a super admin to a regular user.');
console.log('The account will remain active but lose all admin privileges.\n');

demoteSuperAdmin();
