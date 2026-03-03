require('dotenv').config();
const mongoose = require('mongoose');

const cleanDatabase = async () => {
  try {
    // Connect to MongoDB (works with both local and Atlas)
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/venue_booking';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');

    // Get database name
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📦 Database: ${dbName}\n`);

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('✅ Database is already empty!');
      process.exit(0);
    }

    console.log(`Found ${collections.length} collections:\n`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n⚠️  WARNING: This will delete ALL data from these collections!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('🗑️  Deleting collections...\n');

    // Drop each collection
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`   ✅ Deleted: ${collection.name}`);
    }

    console.log('\n✅ Database cleaned successfully!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Create super admin: node scripts/create-super-admin.js');
    console.log('   2. Create venue admins: node scripts/create-venue-admin.js');
    console.log('   3. Seed venues: node scripts/seed-venues-for-admins.js');
    console.log('   4. Start the application\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

console.log('🧹 Database Cleaner\n');
console.log('This script will delete ALL data from your database.');
console.log('Make sure you have a backup if needed!\n');

cleanDatabase();
