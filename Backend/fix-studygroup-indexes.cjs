const mongoose = require('mongoose');
require('dotenv').config();

const fixStudyGroupIndexes = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('studygroups');

    console.log('Checking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the problematic accessCode index if it exists
    try {
      await collection.dropIndex('accessCode_1');
      console.log('Dropped accessCode_1 index');
    } catch (error) {
      console.log('accessCode_1 index does not exist or already dropped');
    }

    // Remove any documents with null accessCode
    const result = await collection.updateMany(
      { accessCode: null },
      { $unset: { accessCode: "" } }
    );
    console.log(`Updated ${result.modifiedCount} documents to remove null accessCode`);

    // Create the sparse index again
    await collection.createIndex(
      { accessCode: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'accessCode_1_sparse'
      }
    );
    console.log('Created new sparse accessCode index');

    console.log('StudyGroup indexes fixed successfully!');
    
  } catch (error) {
    console.error('Error fixing StudyGroup indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

fixStudyGroupIndexes();