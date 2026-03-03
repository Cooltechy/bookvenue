require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function listAdmins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all super admins
    const superAdmins = await User.find({ role: 'super_admin' })
      .select('email firstName lastName department createdAt')
      .sort({ createdAt: -1 });

    // Find all admins
    const admins = await User.find({ role: 'admin' })
      .select('email firstName lastName department createdAt')
      .sort({ createdAt: -1 });

    console.log('\n========================================');
    console.log('SUPER ADMINS');
    console.log('========================================');
    
    if (superAdmins.length === 0) {
      console.log('No super admins found.');
    } else {
      console.log(`Total: ${superAdmins.length}\n`);
      superAdmins.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Department: ${user.department || 'N/A'}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log(`   ID: ${user._id}`);
        console.log('');
      });
    }

    console.log('========================================');
    console.log('ADMINS');
    console.log('========================================');
    
    if (admins.length === 0) {
      console.log('No admins found.');
    } else {
      console.log(`Total: ${admins.length}\n`);
      admins.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Department: ${user.department || 'N/A'}`);
        console.log(`   Created: ${user.createdAt.toLocaleString()}`);
        console.log(`   ID: ${user._id}`);
        console.log('');
      });
    }

    console.log('========================================');
    console.log(`Total Super Admins: ${superAdmins.length}`);
    console.log(`Total Admins: ${admins.length}`);
    console.log(`Total Admin Users: ${superAdmins.length + admins.length}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error listing admins:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

listAdmins();
