const axios = require('axios');

async function testGeminiAPI() {
  console.log('Testing Gemini API directly...');
  
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [{ parts: [{ text: 'Explain JavaScript variables in 2 sentences.' }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': 'AIzaSyAVzbf7PEYhciZ3cyMMdqamL60n6qkaz_A'
        }
      }
    );

    if (response.data.candidates?.length > 0) {
      console.log('✅ Gemini API working correctly!');
      console.log('Response:', response.data.candidates[0].content.parts[0].text);
    } else {
      console.log('❌ No response from Gemini API');
    }
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

testGeminiAPI();