import dotenv from 'dotenv';
import aiService from './src/services/aiService.js';

dotenv.config();

async function testAI() {
  console.log('Testing Gemini AI integration...');
  
  try {
    const result = await aiService.generateContent('Explain JavaScript variables in 2 sentences.');
    
    if (result.success) {
      console.log('✅ AI Service working correctly!');
      console.log('Response:', result.content);
    } else {
      console.log('❌ AI Service failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Error testing AI:', error.message);
  }
}

testAI();