require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/venue_booking';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line (optional)
    const email = process.argv[2];

    // MODE 1: Promote existing user to super admin
    if (email) {
      // Validate email domain
      if (!email.toLowerCase().endsWith('@uohyd.ac.in')) {
        console.log('❌ Email must be a university email (@uohyd.ac.in)');
        process.exit(1);
      }

      // Find existing user
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      
      if (!existingUser) {
        console.log('❌ User not found with email:', email);
        console.log('\n💡 To create a new super admin account, run without arguments:');
        console.log('   node scripts/create-super-admin-custom.js');
        process.exit(1);
      }

      // Check if already super admin
      if (existingUser.role === 'super_admin') {
        console.log('ℹ️  User is already a super admin\n');
        console.log('📋 Super Admin Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Email:', existingUser.email);
        console.log('Name:', `${existingUser.firstName} ${existingUser.lastName}`);
        console.log('Role: super_admin');
        console.log('Department:', existingUser.department || 'Not specified');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(0);
      }

      // Store old role
      const oldRole = existingUser.role;

      // Promote to super admin
      existingUser.role = 'super_admin';
      await existingUser.save();

      console.log('✅ User promoted to super admin successfully!\n');
      console.log('📋 Updated User Details:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', existingUser.email);
      console.log('Name:', `${existingUser.firstName} ${existingUser.lastName}`);
      console.log('Previous Role:', oldRole);
      console.log('New Role: super_admin');
      console.log('Department:', existingUser.department || 'Not specified');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n✅ Super admin can now:');
      console.log('  - Manage all admins (create, edit, delete, promote, demote)');
      console.log('  - Transfer venues between admins');
      console.log('  - Reset admin passwords');
      console.log('  - View all users and system data');
      console.log('  - Full system access');
      
      process.exit(0);
    }

    // MODE 2: Create default super admin account
    console.log('📝 Creating default super admin account...\n');

    const defaultData = {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@uohyd.ac.in',
      password: 'superadmin123',
      role: 'super_admin',
      department: 'Administration',
      studentId: 'SUPERADMIN001'
    };

    // Check if default super admin already exists
    const existingAdmin = await User.findOne({ email: defaultData.email });
    if (existingAdmin) {
      console.log('⚠️  Default super admin already exists with email:', defaultData.email);
      
      // Update to super_admin role if not already
      if (existingAdmin.role !== 'super_admin') {
        existingAdmin.role = 'super_admin';
        await existingAdmin.save();
        console.log('✅ Updated existing user to super_admin role\n');
      } else {
        console.log('ℹ️  User is already a super admin\n');
      }
      
      console.log('📋 Super Admin Login Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Email:', defaultData.email);
      console.log('Role: super_admin');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n💡 To promote an existing user to super admin:');
      console.log('   node scripts/create-super-admin-custom.js user@uohyd.ac.in');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(defaultData.password, 10);

    // Create super admin user
    const admin = new User({
      firstName: defaultData.firstName,
      lastName: defaultData.lastName,
      email: defaultData.email.toLowerCase(),
      password: hashedPassword,
      role: defaultData.role,
      department: defaultData.department,
      studentId: defaultData.studentId
    });

    await admin.save();
    console.log('✅ Default super admin created successfully!\n');
    console.log('📋 Super Admin Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', defaultData.email);
    console.log('Password:', defaultData.password);
    console.log('Role: super_admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Super admin can:');
    console.log('  - Manage all admins (create, edit, delete, promote, demote)');
    console.log('  - Transfer venues between admins');
    console.log('  - Reset admin passwords');
    console.log('  - View all users and system data');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('\n💡 To promote another user to super admin:');
    console.log('   node scripts/create-super-admin-custom.js user@uohyd.ac.in');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    process.exit(1);
  }
};

console.log('👑 Super Admin Management\n');
console.log('Usage:');
console.log('  Create default super admin:');
console.log('    node scripts/create-super-admin-custom.js');
console.log('');
console.log('  Promote existing user to super admin:');
console.log('    node scripts/create-super-admin-custom.js <email>');
console.log('    Example: node scripts/create-super-admin-custom.js user@uohyd.ac.in');
console.log('');

createSuperAdmin();
