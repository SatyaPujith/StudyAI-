const mongoose = require('mongoose');

async function fixQuizIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect('mongodb+srv://aravindhalkachenu:Satya%409100@starnovacluster.gwo0dow.mongodb.net/?retryWrites=true&w=majority&appName=StarNovaCluster');
    
    console.log('✅ Connected to MongoDB');

    // Get the quizzes collection
    const db = mongoose.connection.db;
    const quizzesCollection = db.collection('quizzes');

    // List current indexes
    console.log('\nCurrent indexes on quizzes collection:');
    const indexes = await quizzesCollection.indexes();
    indexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    // Drop the problematic accessCode index if it exists
    try {
      await quizzesCollection.dropIndex('accessCode_1');
      console.log('\n✅ Dropped accessCode_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️ accessCode_1 index does not exist (already dropped)');
      } else {
        console.log('\n❌ Error dropping accessCode_1 index:', error.message);
      }
    }

    // Clear all quizzes to start fresh
    const quizCount = await quizzesCollection.countDocuments();
    if (quizCount > 0) {
      await quizzesCollection.deleteMany({});
      console.log(`\n✅ Cleared ${quizCount} existing quizzes`);
    } else {
      console.log('\n✅ No existing quizzes to clear');
    }

    // Create a proper sparse unique index for accessCode
    await quizzesCollection.createIndex(
      { accessCode: 1 }, 
      { 
        unique: true, 
        sparse: true
      }
    );
    console.log('\n✅ Created proper sparse unique index for accessCode');

    console.log('\nFinal indexes on quizzes collection:');
    const finalIndexes = await quizzesCollection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, index.key);
    });

    await mongoose.disconnect();
    console.log('\n✅ Quiz collection cleanup completed successfully');

  } catch (error) {
    console.error('❌ Quiz collection cleanup failed:', error.message);
  }
}

fixQuizIndexes();