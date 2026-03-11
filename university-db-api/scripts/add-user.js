// Script to add a new user to the university database
// Usage: node scripts/add-user.js <universityId> <email> <name> <type> <department> [phone]

require('dotenv').config();
const mongoose = require('mongoose');
const UniversityUser = require('../models/universityUsers');

const universityId = process.argv[2];
const email = process.argv[3];
const name = process.argv[4];
const type = process.argv[5];
const department = process.argv[6];
const phone = process.argv[7] || '';

if (!universityId || !email || !name || !type || !department) {
  console.error('Usage: node scripts/add-user.js <universityId> <email> <name> <type> <department> [phone]');
  console.error('Type must be: student, faculty, or staff');
  process.exit(1);
}

async function addUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await UniversityUser.create({
      universityId,
      email: email.toLowerCase(),
      name,
      type,
      department,
      phone,
      isActive: true
    });

    console.log('User added successfully:');
    console.log({
      universityId: user.universityId,
      email: user.email,
      name: user.name,
      type: user.type,
      department: user.department,
      phone: user.phone
    });

    process.exit(0);
  } catch (error) {
    console.error('Error adding user:', error.message);
    process.exit(1);
  }
}

addUser();
