import axios from 'axios';
import logger from '../utils/logger.js';

class AIService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    // Debug API key availability
    logger.info('AI Service initialized:', {
      hasApiKey: !!this.geminiApiKey,
      apiKeyLength: this.geminiApiKey?.length || 0,
      baseURL: this.baseURL
    });
  }

  async generateContent(prompt, options = {}) {
    // Re-check API key from environment (in case it wasn't loaded during construction)
    const apiKey = this.geminiApiKey || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      logger.warn('Gemini API key not configured', {
        constructorKey: !!this.geminiApiKey,
        envKey: !!process.env.GEMINI_API_KEY,
        envKeyLength: process.env.GEMINI_API_KEY?.length || 0
      });
      return { success: false, error: 'API key not configured' };
    }
    
    logger.info('Using Gemini API key:', {
      hasKey: !!apiKey,
      keyLength: apiKey.length,
      keyPreview: apiKey.substring(0, 10) + '...'
    });

    try {
      const response = await axios.post(
        this.baseURL,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000,
            topP: options.topP || 0.8,
            topK: options.topK || 40
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey
          }
        }
      );

      if (response.data.candidates?.length > 0) {
        return {
          success: true,
          content: response.data.candidates[0].content.parts[0].text
        };
      } else {
        throw new Error('No content generated');
      }
    } catch (error) {
      logger.error('Gemini API error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  async generateStudyPlan(subject, level, duration, learningStyle, syllabus = '') {
    const durationInDays = this.parseDuration(duration);
    
    const prompt = `Create a comprehensive ${durationInDays}-day study plan for ${subject} at ${level} level.
Learning style: ${learningStyle}
${syllabus ? `Syllabus content: ${syllabus}` : ''}

Generate a structured study plan with daily topics. Return ONLY a JSON array:
[
  {
    "day": 1,
    "title": "Day 1: [Specific topic]",
    "objectives": ["Learn X", "Understand Y", "Master Z"],
    "syllabusSection": "${syllabus ? 'Relevant section from syllabus' : 'Introduction to ' + subject}",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]

Make sure each day covers distinct topics and builds upon previous days.`;

    const result = await this.generateContent(prompt, { maxTokens: 3000 });
    
    if (result.success) {
      try {
        let content = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        const studyPlan = JSON.parse(content);
        
        // Ensure we only return the requested number of days
        const limitedPlan = Array.isArray(studyPlan) ? studyPlan.slice(0, durationInDays) : studyPlan;
        logger.info(`AI generated ${Array.isArray(studyPlan) ? studyPlan.length : 0} days, limited to ${durationInDays} days`);
        
        return { success: true, content: limitedPlan };
      } catch (parseError) {
        logger.error('Failed to parse study plan JSON:', parseError);
        return { success: false, error: 'Failed to parse AI response' };
      }
    }
    
    return result;
  }

  async generateDailyContent(title, day, subject, level, syllabusSection = '', keywords = []) {
    const prompt = `Generate comprehensive educational content for: ${title}

Subject: ${subject}
Level: ${level}
Day: ${day}
Syllabus Section: ${syllabusSection}
Keywords: ${keywords.join(', ')}

Create detailed educational content with the following sections:

IMPORTANT FORMATTING RULES:
- Use clean, readable text WITHOUT asterisks (*) or markdown formatting
- Write in clear, professional language
- For exercises, create specific subtopics that can become interactive questions
- Make content engaging and educational

1. OVERVIEW (200+ words): Comprehensive introduction explaining what students will learn
2. KEY POINTS (5-7 detailed points): Each point should be a complete explanation (50+ words)
3. EXAMPLES (4-5 detailed examples): Real-world, practical examples with explanations (100+ words each)
4. EXERCISES (5-8 practical exercises): Interactive exercise topics with descriptions
5. RESOURCES (3-5 resources): Specific learning materials with working links

Return ONLY a valid JSON object:
{
  "overview": "Comprehensive overview in clean text without asterisks or formatting...",
  "keyPoints": [
    "Detailed explanation of first concept in plain text...",
    "Comprehensive description of second concept without formatting..."
  ],
  "examples": [
    "Detailed real-world example with clear explanation...",
    "Specific case study with practical context..."
  ],
  "exercises": [
    {
      "title": "Specific Exercise Topic Name",
      "description": "Clear description of what this exercise covers and what students will learn",
      "type": "quiz"
    },
    {
      "title": "Another Practical Exercise Topic",
      "description": "Description of this hands-on exercise and its learning objectives",
      "type": "practice"
    }
  ],
  "resources": [
    {
      "type": "video", 
      "title": "Specific Video Title", 
      "description": "What this video covers and why it's useful",
      "url": "working_url_will_be_generated"
    },
    {
      "type": "article", 
      "title": "Comprehensive Guide Title", 
      "description": "In-depth article description and learning value",
      "url": "working_url_will_be_generated"
    }
  ]
}`;

    const result = await this.generateContent(prompt, { maxTokens: 4000 });
    
    if (result.success) {
      try {
        let content = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        let dailyContent = JSON.parse(content);
        
        // Clean up any remaining asterisks or markdown formatting
        if (dailyContent.overview) {
          dailyContent.overview = this.cleanText(dailyContent.overview);
        }
        if (Array.isArray(dailyContent.keyPoints)) {
          dailyContent.keyPoints = dailyContent.keyPoints.map(point => this.cleanText(point));
        }
        if (Array.isArray(dailyContent.examples)) {
          dailyContent.examples = dailyContent.examples.map(example => this.cleanText(example));
        }
        
        // Generate working URLs for resources
        if (Array.isArray(dailyContent.resources)) {
          dailyContent.resources = dailyContent.resources.map(resource => ({
            ...resource,
            url: this.generateResourceUrl(resource.type, subject, title)
          }));
        }
        
        return { success: true, content: dailyContent };
      } catch (parseError) {
        logger.error('Failed to parse daily content JSON:', parseError);
        return { success: false, error: 'Failed to parse AI response' };
      }
    }
    
    return result;
  }

  // Helper method to clean text of markdown formatting
  cleanText(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/\*\*/g, '') // Remove bold asterisks
      .replace(/\*/g, '')   // Remove italic asterisks
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/`/g, '')    // Remove code backticks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links, keep text
      .trim();
  }

  // Helper method to generate working resource URLs
  generateResourceUrl(type, subject, topic) {
    const searchTerm = encodeURIComponent(`${subject} ${topic}`);
    
    switch (type) {
      case 'video':
        return `https://www.youtube.com/results?search_query=${searchTerm}+tutorial`;
      case 'article':
        return `https://www.google.com/search?q=${searchTerm}+guide+tutorial`;
      case 'book':
        return `https://www.google.com/search?q=${searchTerm}+book+pdf`;
      case 'practice':
        return `https://www.google.com/search?q=${searchTerm}+practice+exercises`;
      case 'quiz':
        return `https://www.google.com/search?q=${searchTerm}+quiz+test`;
      default:
        return `https://www.google.com/search?q=${searchTerm}`;
    }
  }

  // Generate interactive exercise questions
  async generateExerciseQuestions(exerciseTitle, subject, difficulty = 'beginner') {
    const prompt = `Generate 5 interactive questions for the exercise: "${exerciseTitle}" in ${subject} at ${difficulty} level.

Create questions that test understanding and application of the exercise topic.

Return ONLY a valid JSON array:
[
  {
    "question": "Clear, specific question about the exercise topic",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct and how it relates to the exercise"
  }
]

Make questions practical and relevant to the exercise topic.`;

    const result = await this.generateContent(prompt, { maxTokens: 2000 });
    
    if (result.success) {
      try {
        let content = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        const questions = JSON.parse(content);
        return { success: true, questions };
      } catch (parseError) {
        logger.error('Failed to parse exercise questions JSON:', parseError);
        return { success: false, error: 'Failed to parse AI response' };
      }
    }
    
    return result;
  }

  async generateQuiz(topic, difficulty, questionCount = 10) {
    const prompt = `Create ${questionCount} ${difficulty} level multiple choice quiz questions about ${topic}.

Requirements:
- Each question should test understanding of ${topic} concepts
- Provide 4 options (A, B, C, D) for each question
- Include detailed explanations for correct answers
- Make questions challenging but fair for ${difficulty} level

Return ONLY a valid JSON array:
[
  {
    "question": "What is the primary purpose of...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct"
  }
]

Generate exactly ${questionCount} questions.`;

    const result = await this.generateContent(prompt, { maxTokens: 3000 });
    
    if (result.success) {
      try {
        let content = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          content = jsonMatch[0];
        }
        const questions = JSON.parse(content);
        return { success: true, content: questions };
      } catch (parseError) {
        logger.error('Failed to parse quiz JSON:', parseError);
        return { success: false, error: 'Failed to parse AI response' };
      }
    }
    
    return result;
  }

  parseDuration(duration) {
    if (!duration) return 30;
    
    const durationStr = duration.toLowerCase();
    if (durationStr.includes('month')) {
      const months = parseInt(durationStr) || 1;
      return months * 30;
    } else if (durationStr.includes('week')) {
      const weeks = parseInt(durationStr) || 1;
      return weeks * 7;
    } else if (durationStr.includes('day')) {
      return parseInt(durationStr) || 30;
    } else {
      return parseInt(duration) || 30;
    }
  }

  generateFallbackStudyPlan(subject, level, durationInDays) {
    const plan = [];
    
    for (let day = 1; day <= durationInDays; day++) {
      plan.push({
        day,
        title: `Day ${day}: ${subject} Fundamentals`,
        objectives: [
          `Learn key concepts of ${subject}`,
          `Understand practical applications`,
          `Practice problem-solving skills`
        ],
        syllabusSection: `Introduction to ${subject} - Day ${day}`,
        keywords: [`${subject.toLowerCase()}`, 'fundamentals', 'basics']
      });
    }
    
    return plan;
  }

  generateFallbackDailyContent(title, subject) {
    return {
      overview: `Welcome to ${title}. This comprehensive study session will provide you with essential knowledge and practical skills in ${subject}. Through this lesson, you'll explore fundamental concepts, see real-world applications, and develop hands-on experience through various exercises and examples.`,
      keyPoints: [
        `Understanding the fundamental definition and scope of ${title}`,
        `Exploring the historical context and evolution of these concepts`,
        `Identifying key principles and underlying theories`,
        `Recognizing patterns and relationships within the subject matter`,
        `Learning standard terminology and professional vocabulary`
      ],
      examples: [
        `Real-world application: How ${title} concepts are used in professional environments`,
        `Case study analysis: Detailed examination of a successful implementation`,
        `Step-by-step walkthrough: Complete process demonstration with explanations`,
        `Comparative analysis: Examining different approaches and their effectiveness`
      ],
      exercises: [
        `Foundational practice: Complete basic exercises to reinforce core concepts`,
        `Applied problem solving: Work through realistic scenarios and challenges`,
        `Creative application: Design your own solution using learned principles`,
        `Analytical exercise: Evaluate existing solutions and identify improvements`
      ],
      resources: [
        { type: 'video', title: `${title} Tutorial`, description: 'Comprehensive video explanation of key concepts' },
        { type: 'article', title: `${title} Guide`, description: 'Detailed written resource covering theoretical foundations' },
        { type: 'practice', title: 'Interactive Exercises', description: 'Hands-on practice activities and simulations' }
      ]
    };
  }

  generateFallbackQuiz(topic, difficulty, questionCount) {
    const questions = [];
    
    for (let i = 1; i <= questionCount; i++) {
      questions.push({
        question: `What is an important ${difficulty} level concept in ${topic}?`,
        options: [
          `Correct answer about ${topic} concept ${i}`,
          `Incorrect option A for ${topic}`,
          `Incorrect option B for ${topic}`,
          `Incorrect option C for ${topic}`
        ],
        correctAnswer: 0,
        explanation: `This is correct because it represents a fundamental ${difficulty} level concept in ${topic}.`
      });
    }
    
    return questions;
  }
}

export default new AIService();