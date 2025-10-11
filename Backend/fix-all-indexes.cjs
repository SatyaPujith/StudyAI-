const mongoose = require('mongoose');

async function fixAllIndexes() {
  try {
    console.log('🔧 Fixing all database indexes...');
    
    await mongoose.connect('mongodb+srv://aravindhalkachenu:Satya%409100@starnovacluster.gwo0dow.mongodb.net/?retryWrites=true&w=majority&appName=StarNovaCluster');
    
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Fix Users collection
    console.log('\n📋 Fixing Users collection...');
    const usersCollection = db.collection('users');
    
    try {
      await usersCollection.dropIndex('username_1');
      console.log('✅ Dropped users.username_1 index');
    } catch (error) {
      console.log('⚠️ users.username_1 index already dropped or doesn\'t exist');
    }

    // Fix Quizzes collection
    console.log('\n📋 Fixing Quizzes collection...');
    const quizzesCollection = db.collection('quizzes');
    
    // Drop all existing indexes except _id
    const quizIndexes = await quizzesCollection.indexes();
    for (const index of quizIndexes) {
      if (index.name !== '_id_') {
        try {
          await quizzesCollection.dropIndex(index.name);
          console.log(`✅ Dropped quiz index: ${index.name}`);
        } catch (error) {
          console.log(`⚠️ Could not drop quiz index: ${index.name}`);
        }
      }
    }

    // Clear all existing quizzes to start fresh
    const quizCount = await quizzesCollection.countDocuments();
    if (quizCount > 0) {
      await quizzesCollection.deleteMany({});
      console.log(`✅ Cleared ${quizCount} existing quizzes`);
    }

    // Create proper indexes for quizzes
    await quizzesCollection.createIndex({ creator: 1, createdAt: -1 });
    await quizzesCollection.createIndex({ isPublic: 1, status: 1 });
    await quizzesCollection.createIndex({ scheduledAt: 1, status: 1 });
    
    // Create sparse unique index for accessCode (only for non-null values)
    await quizzesCollection.createIndex(
      { accessCode: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'accessCode_sparse_unique'
      }
    );
    
    console.log('✅ Created proper quiz indexes');

    // Fix StudyGroups collection
    console.log('\n📋 Fixing StudyGroups collection...');
    const studyGroupsCollection = db.collection('studygroups');
    
    try {
      // Create proper indexes for study groups
      await studyGroupsCollection.createIndex({ creator: 1 });
      await studyGroupsCollection.createIndex({ subject: 1, isPublic: 1 });
      await studyGroupsCollection.createIndex(
        { accessCode: 1 }, 
        { 
          unique: true, 
          sparse: true,
          name: 'studygroup_accessCode_sparse_unique'
        }
      );
      console.log('✅ Created study group indexes');
    } catch (error) {
      console.log('⚠️ Study group indexes already exist or error:', error.message);
    }

    console.log('\n📊 Final database state:');
    
    // Show final indexes
    const finalQuizIndexes = await quizzesCollection.indexes();
    console.log('Quiz indexes:', finalQuizIndexes.map(i => i.name));
    
    const finalUserIndexes = await usersCollection.indexes();
    console.log('User indexes:', finalUserIndexes.map(i => i.name));

    await mongoose.disconnect();
    console.log('\n🎉 All database indexes fixed successfully!');

  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
  }
}

fixAllIndexes();