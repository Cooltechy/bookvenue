require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const User = require('../src/models/User');

// Function to verify user exists in university database
async function verifyUniversityEmail(email) {
  try {
    const apiUrl = process.env.UNIVERSITY_DB_API_URL || 'http://localhost:3002';
    const apiKey = process.env.UNIVERSITY_DB_API_KEY;
    
    const response = await axios.get(
      `${apiUrl}/api/users/email/${email}`,
      {
        headers: {
          'x-api-key': apiKey
        }
      }
    );
    
    return {
      exists: true,
      user: response.data.user
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { exists: false, user: null };
    }
    throw new Error('Unable to connect to university database');
  }
}

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/venue_booking';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line (REQUIRED)
    const email = process.argv[2];

    if (!email) {
      console.log('❌ Email is required!\n');
      console.log('Usage:');
      console.log('  node scripts/create-super-admin.js <email>');
      console.log('  Example: node scripts/create-super-admin.js user@uohyd.ac.in');
      process.exit(1);
    }

    // Validate email domain
    if (!email.toLowerCase().endsWith('@uohyd.ac.in')) {
      console.log('❌ Email must be a university email (@uohyd.ac.in)');
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase();

    // Step 1: Check if user exists in local database
    console.log('🔍 Checking local database...');
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      // User exists in local database - promote them
      if (existingUser.role === 'super_admin') {
        console.log('ℹ️  User is already a super admin\n');
        console.log('📋 Super Admin Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email:', existingUser.email);
        console.log('Role: super_admin');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
      }

      // Verify user is faculty or staff before promoting
      console.log('🔍 Verifying user type in university database...');
      const universityVerification = await verifyUniversityEmail(normalizedEmail);
      
      if (!universityVerification.exists) {
        console.log('❌ Email not found in university database');
        process.exit(1);
      }

      if (universityVerification.user.type === 'student') {
        console.log('\n❌ Students cannot be made super admin');
        console.log('⚠️  Only faculty and staff members can be assigned super admin role');
        process.exit(1);
      }

      const oldRole = existingUser.role;
      existingUser.role = 'super_admin';
      await existingUser.save();

      console.log('✅ User promoted to super admin successfully!\n');
      console.log('📋 Updated User Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', existingUser.email);
      console.log('Previous Role:', oldRole);
      console.log('New Role: super_admin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n✅ Super admin can now:');
      console.log('  - Manage all admins (create, edit, delete, promote, demote)');
      console.log('  - Transfer venues between admins');
      console.log('  - Reset admin passwords');
      console.log('  - View all users and system data');
      console.log('  - Full system access');
      
      process.exit(0);
    }

    // Step 2: User not in local database - verify with university database
    console.log('👤 User not found in local database');
    console.log('🔍 Verifying with university database...');
    
    const universityVerification = await verifyUniversityEmail(normalizedEmail);
    
    if (!universityVerification.exists) {
      console.log('❌ Email not found in university database');
      console.log('\n⚠️  Only users registered in the university database can be made super admin');
      console.log('Please ensure the email exists in the university system first.');
      process.exit(1);
    }

    const universityUser = universityVerification.user;
    console.log('✅ User found in university database');
    console.log(`   Name: ${universityUser.name}`);
    console.log(`   Type: ${universityUser.type}`);
    console.log(`   Department: ${universityUser.department || 'N/A'}`);

    // Check if user is faculty or staff (not student)
    if (universityUser.type === 'student') {
      console.log('\n❌ Students cannot be made super admin');
      console.log('⚠️  Only faculty and staff members can be assigned super admin role');
      process.exit(1);
    }

    // Step 3: Create new super admin with default password
    const defaultPassword = 'superadmin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const newSuperAdmin = new User({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'super_admin'
    });

    await newSuperAdmin.save();
    
    console.log('\n✅ Super admin created successfully!\n');
    console.log('📋 Super Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', normalizedEmail);
    console.log('Password:', defaultPassword);
    console.log('Role: super_admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Super admin can:');
    console.log('  - Manage all admins (create, edit, delete, promote, demote)');
    console.log('  - Transfer venues between admins');
    console.log('  - Reset admin passwords');
    console.log('  - View all users and system data');
    console.log('  - Full system access');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
};

console.log('👑 Super Admin Management\n');
console.log('Usage:');
console.log('  node scripts/create-super-admin.js <email>');
console.log('  Example: node scripts/create-super-admin.js user@uohyd.ac.in');
console.log('');

createSuperAdmin();
