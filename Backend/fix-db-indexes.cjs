const mongoose = require('mongoose');

async function fixDatabaseIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect('mongodb+srv://aravindhalkachenu:Satya%409100@starnovacluster.gwo0dow.mongodb.net/?retryWrites=true&w=majority&appName=StarNovaCluster');
    
    console.log('✅ Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // List current indexes
    console.log('\nCurrent indexes on users collection:');
    const indexes = await usersCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    // Drop the problematic username index if it exists
    try {
      await usersCollection.dropIndex('username_1');
      console.log('\n✅ Dropped username_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️ username_1 index does not exist (already dropped)');
      } else {
        console.log('\n❌ Error dropping username_1 index:', error.message);
      }
    }

    // Clear all users to start fresh
    const userCount = await usersCollection.countDocuments();
    if (userCount > 0) {
      await usersCollection.deleteMany({});
      console.log(`\n✅ Cleared ${userCount} existing users`);
    } else {
      console.log('\n✅ No existing users to clear');
    }

    console.log('\nFinal indexes on users collection:');
    const finalIndexes = await usersCollection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database cleanup completed successfully');

  } catch (error) {
    console.error('❌ Database cleanup failed:', error.message);
  }
}

fixDatabaseIndexes();