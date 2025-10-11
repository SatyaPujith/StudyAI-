import { v4 as uuidv4 } from 'uuid';
import StudyPlan from '../models/StudyPlan.js';
import Quiz from '../models/Quiz.js';
import UserProgress from '../models/UserProgress.js';
import User from '../models/User.js';
import aiService from '../services/aiService.js';
import logger from '../utils/logger.js';

class StudyController {
  // Create study plan with ONLY AI-generated content
  async createStudyPlan(req, res) {
    try {
      const { subject, level, duration, learningStyle, goals, syllabus, topics, pdfContent } = req.body;

      if (!subject || !level || !duration) {
        return res.status(400).json({
          success: false,
          message: 'Subject, level, and duration are required'
        });
      }

      logger.info(`🚀 Creating AI-powered study plan for ${subject} (${duration}) by user ${req.userId}`);

      // Parse duration
      let durationInDays = 1;
      const match = duration.match(/(\d+)/);
      durationInDays = match ? parseInt(match[1]) : 1;

      // Combine syllabus content
      let combinedSyllabus = '';
      if (syllabus && syllabus.trim()) combinedSyllabus += syllabus.trim();
      if (topics && topics.trim()) combinedSyllabus += (combinedSyllabus ? '\n\n' : '') + topics.trim();
      if (pdfContent && pdfContent.trim()) combinedSyllabus += (combinedSyllabus ? '\n\n' : '') + pdfContent.trim();

      // Step 1: Generate study plan structure using AI
      logger.info(`🤖 Step 1: Generating study plan structure with AI...`);
      
      let studyPlanStructure = null;
      try {
        if (aiService && typeof aiService.generateStudyPlan === 'function') {
          const aiPlanResult = await aiService.generateStudyPlan(subject, level, duration, learningStyle, combinedSyllabus);
          if (aiPlanResult.success && Array.isArray(aiPlanResult.content)) {
            studyPlanStructure = aiPlanResult.content;
            logger.info(`✅ AI generated study plan structure with ${studyPlanStructure.length} days`);
          }
        }
      } catch (error) {
        logger.warn('AI study plan generation failed:', error.message);
      }

      // If AI failed, create basic structure
      if (!studyPlanStructure) {
        logger.info(`📝 Creating basic study plan structure...`);
        studyPlanStructure = [];
        for (let day = 1; day <= durationInDays; day++) {
          studyPlanStructure.push({
            day: day,
            title: `Day ${day}: ${subject} - Advanced Topics`,
            objectives: [`Master ${subject} concepts for day ${day}`],
            syllabusSection: combinedSyllabus || `${subject} fundamentals`,
            keywords: [subject.toLowerCase(), 'advanced', 'concepts']
          });
        }
      }

      // Create initial study plan
      const studyPlan = new StudyPlan({
        user: req.userId,
        title: `${subject} - ${duration} Study Plan`,
        subject,
        difficulty: level,
        duration: durationInDays,
        syllabus: combinedSyllabus,
        learningStyle: learningStyle || 'visual',
        goals: goals || [],
        dailyContent: studyPlanStructure.map(item => ({
          day: item.day,
          title: item.title,
          objectives: item.objectives || [],
          syllabusSection: item.syllabusSection || '',
          keywords: item.keywords || [],
          content: {
            overview: '',
            keyPoints: [],
            examples: [],
            exercises: [],
            resources: []
          },
          isContentGenerated: false,
          status: 'not_started',
          timeSpent: 0
        })),
        progress: {
          completedDays: 0,
          totalDays: studyPlanStructure.length,
          percentage: 0,
          totalTimeSpent: 0
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + (durationInDays * 24 * 60 * 60 * 1000)),
          studyDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          dailyStudyTime: 60
        },
        aiGenerated: false,
        status: 'generating'
      });

      await studyPlan.save();
      logger.info(`📚 Study plan structure created: ${studyPlan._id}`);

      // Step 2: Generate comprehensive content for each day using AI
      logger.info(`🤖 Step 2: Generating comprehensive AI content for ${studyPlan.dailyContent.length} days...`);
      
      let aiSuccessCount = 0;
      const totalDays = studyPlan.dailyContent.length;
      
      for (let i = 0; i < studyPlan.dailyContent.length; i++) {
        const dayContent = studyPlan.dailyContent[i];
        
        logger.info(`🎯 Generating AI content for Day ${dayContent.day}: ${dayContent.title}`);
        
        try {
          // FORCE AI content generation - no fallbacks
          if (!aiService || typeof aiService.generateDailyContent !== 'function') {
            throw new Error('AI service not available');
          }

          const aiResult = await aiService.generateDailyContent(
            dayContent.title,
            dayContent.day,
            studyPlan.subject,
            studyPlan.difficulty,
            dayContent.syllabusSection || studyPlan.syllabus,
            dayContent.keywords || []
          );

          if (!aiResult || !aiResult.success || !aiResult.content) {
            throw new Error(`AI content generation failed: ${aiResult?.error || 'No content returned'}`);
          }

          // Process AI content
          let parsedContent = aiResult.content;
          
          if (typeof parsedContent === 'string') {
            try {
              parsedContent = JSON.parse(parsedContent);
            } catch (parseError) {
              // If JSON parsing fails, create structured content from raw text
              parsedContent = {
                overview: parsedContent,
                keyPoints: [`AI-generated key concepts for ${dayContent.title}`],
                examples: [`AI-generated examples for ${dayContent.title}`],
                exercises: [`AI-generated exercises for ${dayContent.title}`],
                resources: []
              };
            }
          }

          // Format resources properly with type mapping
          const typeMapping = {
            'website': 'article',
            'documentation': 'article',
            'tutorial': 'practice',
            'course': 'video',
            'exercise': 'practice',
            'reference': 'book',
            'guide': 'article',
            'tool': 'practice'
          };

          const formattedResources = (parsedContent.resources || []).map(resource => {
            if (typeof resource === 'string') {
              return {
                type: 'article',
                title: resource,
                description: `AI-recommended resource: ${resource}`,
                url: ''
              };
            }
            
            // Map AI-generated types to valid enum values
            let resourceType = resource.type || 'article';
            if (typeMapping[resourceType.toLowerCase()]) {
              resourceType = typeMapping[resourceType.toLowerCase()];
            } else if (!['video', 'article', 'book', 'practice', 'quiz'].includes(resourceType.toLowerCase())) {
              resourceType = 'article'; // Default fallback
            }
            
            return {
              type: resourceType.toLowerCase(),
              title: resource.title || 'AI-Generated Resource',
              description: resource.description || `AI-generated learning resource`,
              url: resource.url || ''
            };
          });

          // Ensure we have comprehensive content
          dayContent.content = {
            overview: parsedContent.overview || `AI-generated comprehensive overview for ${dayContent.title}`,
            keyPoints: parsedContent.keyPoints || parsedContent.key_points || [],
            examples: parsedContent.examples || [],
            exercises: parsedContent.exercises || [],
            resources: formattedResources
          };

          dayContent.isContentGenerated = true;
          aiSuccessCount++;
          
          logger.info(`✅ AI content generated for Day ${dayContent.day}`);
          logger.info(`   📝 Overview: ${dayContent.content.overview?.length || 0} chars`);
          logger.info(`   🔑 Key Points: ${dayContent.content.keyPoints?.length || 0}`);
          logger.info(`   💡 Examples: ${dayContent.content.examples?.length || 0}`);
          logger.info(`   🏋️ Exercises: ${dayContent.content.exercises?.length || 0}`);
          logger.info(`   📚 Resources: ${dayContent.content.resources?.length || 0}`);

          // Realistic delay between AI calls (2-3 seconds per day)
          if (i < studyPlan.dailyContent.length - 1) {
            const delay = 2000 + Math.random() * 1000; // 2-3 seconds
            logger.info(`⏳ Waiting ${(delay/1000).toFixed(1)}s before next AI generation...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

        } catch (error) {
          logger.error(`❌ AI content generation failed for Day ${dayContent.day}:`, error.message);
          
          // If AI fails, return error instead of fallback
          throw new Error(`Failed to generate AI content for Day ${dayContent.day}: ${error.message}`);
        }
      }

      // Update study plan with AI success
      studyPlan.status = 'ready';
      studyPlan.aiGenerated = aiSuccessCount > 0;
      studyPlan.contentGeneratedAt = new Date();
      await studyPlan.save();

      logger.info(`🎉 Study plan completed with ${aiSuccessCount}/${totalDays} days of AI content`);

      res.status(201).json({
        success: true,
        message: `🤖 AI-powered study plan created successfully! Generated comprehensive content for all ${totalDays} days.`,
        studyPlan: studyPlan
      });

    } catch (error) {
      logger.error('❌ AI study plan creation failed:', error);
      
      // Return specific error message
      res.status(500).json({
        success: false,
        message: `Failed to create AI-powered study plan: ${error.message}`,
        error: 'AI_GENERATION_FAILED'
      });
    }
  }

  // Get user's study plans
  async getStudyPlans(req, res) {
    try {
      const studyPlans = await StudyPlan.find({ user: req.userId })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        studyPlans
      });
    } catch (error) {
      logger.error('Get study plans error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get daily content
  async getDailyContent(req, res) {
    try {
      const { planId, day } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      const dayNumber = parseInt(day);
      const dailyContent = studyPlan.dailyContent.find(d => d.day === dayNumber);

      if (!dailyContent) {
        return res.status(404).json({
          success: false,
          message: 'Day content not found'
        });
      }

      // If content is already generated, return it
      if (dailyContent.isContentGenerated && dailyContent.content) {
        return res.json({
          success: true,
          content: dailyContent.content,
          title: dailyContent.title,
          objectives: dailyContent.objectives,
          day: dailyContent.day,
          status: dailyContent.status
        });
      }

      // Generate content using AI
      logger.info(`Generating content for Day ${dayNumber}: ${dailyContent.title}`);

      let aiResult;
      try {
        aiResult = await aiService.generateDailyContent(
          dailyContent.title,
          dayNumber,
          studyPlan.subject,
          studyPlan.difficulty,
          dailyContent.syllabusSection,
          dailyContent.keywords
        );
      } catch (error) {
        logger.error('AI daily content generation error:', error);
        aiResult = { success: false };
      }

      let content;
      if (aiResult.success) {
        content = aiResult.content;
      } else {
        // Use fallback content
        content = aiService.generateFallbackDailyContent(dailyContent.title, studyPlan.subject);
      }

      // Update the daily content
      dailyContent.content = content;
      dailyContent.isContentGenerated = true;
      await studyPlan.save();

      logger.info(`Content generated successfully for Day ${dayNumber}`);

      res.json({
        success: true,
        content,
        title: dailyContent.title,
        objectives: dailyContent.objectives,
        day: dailyContent.day,
        status: dailyContent.status
      });
    } catch (error) {
      logger.error('Get daily content error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update day progress
  async updateDayProgress(req, res) {
    try {
      const { planId, day } = req.params;
      const { status, timeSpent, sectionsCompleted } = req.body;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      const dayNumber = parseInt(day);
      const dailyContent = studyPlan.dailyContent.find(d => d.day === dayNumber);

      if (!dailyContent) {
        return res.status(404).json({
          success: false,
          message: 'Day content not found'
        });
      }

      // Update daily content status
      if (status) {
        dailyContent.status = status;
        if (status === 'completed') {
          dailyContent.completedAt = new Date();
        }
      }

      if (timeSpent) {
        dailyContent.timeSpent = (dailyContent.timeSpent || 0) + timeSpent;
      }

      // Update or create user progress using findOneAndUpdate with upsert
      let userProgress = await UserProgress.findOneAndUpdate(
        {
          user: req.userId,
          studyPlan: planId,
          day: dayNumber
        },
        {
          $setOnInsert: {
            user: req.userId,
            studyPlan: planId,
            day: dayNumber,
            status: 'not_started',
            studySessions: [],
            totalStudyTime: 0,
            sessionsCount: 0,
            sectionsViewed: [],
            conceptsLearned: [],
            exercisesCompleted: [],
            resourcesAccessed: []
          },
          $set: {
            lastStudied: new Date()
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      // Update progress based on status
      if (status === 'in_progress' && userProgress.status === 'not_started') {
        await userProgress.startStudySession();
      } else if (status === 'completed') {
        userProgress.status = 'completed';
        userProgress.completedAt = new Date();
        
        // Update learning metrics
        if (sectionsCompleted) {
          await userProgress.updateLearningMetrics(
            sectionsCompleted.concepts || [],
            sectionsCompleted.exercises || [],
            sectionsCompleted.resources || []
          );
        }
        
        await userProgress.save();
      }

      // Update overall study plan progress
      await studyPlan.updateProgress();

      // Update user stats
      const user = await User.findById(req.userId);
      if (user && status === 'completed') {
        user.stats.topicsCompleted += 1;
        user.stats.totalStudyTime += timeSpent || 0;
        user.stats.lastStudyDate = new Date();
        await user.save();
      }

      res.json({
        success: true,
        message: 'Progress updated successfully',
        dailyContent,
        progress: userProgress
      });
    } catch (error) {
      logger.error('Update day progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user progress
  async getUserProgress(req, res) {
    try {
      const { planId } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Get progress for all days
      const progressData = await UserProgress.find({
        user: req.userId,
        studyPlan: planId
      });

      // Calculate overall statistics
      const stats = await UserProgress.getUserStats(req.userId);

      // Get daily progress summary
      const dailyProgress = studyPlan.dailyContent.map(day => {
        const dayProgress = progressData.find(p => p.day === day.day);
        return {
          day: day.day,
          title: day.title,
          status: day.status,
          timeSpent: day.timeSpent || 0,
          completedAt: day.completedAt,
          isContentGenerated: day.isContentGenerated,
          progress: dayProgress ? {
            sessionsCount: dayProgress.sessionsCount,
            totalStudyTime: dayProgress.totalStudyTime,
            conceptsLearned: dayProgress.conceptsLearned.length,
            exercisesCompleted: dayProgress.exercisesCompleted.length
          } : null
        };
      });

      res.json({
        success: true,
        studyPlan: {
          _id: studyPlan._id,
          title: studyPlan.title,
          subject: studyPlan.subject,
          difficulty: studyPlan.difficulty,
          progress: studyPlan.progress
        },
        dailyProgress,
        userStats: stats
      });
    } catch (error) {
      logger.error('Get user progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create quiz
  async createQuiz(req, res) {
    try {
      const { title, topic, difficulty, questionCount = 10, isPublic = true } = req.body;

      logger.info(`Received quiz creation request:`, { title, topic, difficulty, questionCount, isPublic });

      if (!topic || !difficulty) {
        return res.status(400).json({
          success: false,
          message: 'Topic and difficulty are required'
        });
      }
      
      // Set default title if not provided
      const quizTitle = title || `${topic} - ${difficulty} Quiz`;

      logger.info(`Creating AI quiz: ${topic}, ${difficulty}, ${questionCount} questions`);

      // Generate questions using AI
      let aiResult;
      try {
        aiResult = await aiService.generateQuiz(topic, difficulty, questionCount);
      } catch (error) {
        logger.error('AI quiz generation error:', error);
        aiResult = { success: false };
      }

      let questions;
      if (aiResult.success && Array.isArray(aiResult.content)) {
        questions = aiResult.content.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'Explanation not provided',
          points: 1,
          timeLimit: 30
        }));
        logger.info(`Generated ${questions.length} AI questions for quiz`);
      } else {
        // Use fallback questions
        logger.info('Using fallback questions for quiz');
        questions = aiService.generateFallbackQuiz(topic, difficulty, questionCount).map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || 'Explanation not provided',
          points: 1,
          timeLimit: 30
        }));
      }

      const accessCode = !isPublic ? StudyController.generateAccessCode() : undefined;

      const quizData = {
        title: quizTitle,
        topic,
        difficulty,
        creator: req.userId,
        questions,
        isPublic,
        aiGenerated: aiResult ? aiResult.success : false,
        status: 'draft'
      };

      // Only add accessCode if it's not undefined (for private quizzes)
      if (accessCode !== undefined) {
        quizData.accessCode = accessCode;
      }

      logger.info(`Creating quiz with data:`, { 
        title: quizData.title, 
        isPublic: quizData.isPublic, 
        hasAccessCode: !!quizData.accessCode,
        questionsCount: quizData.questions.length 
      });

      const quiz = new Quiz(quizData);

      logger.info(`Saving quiz with ${questions.length} questions`);
      await quiz.save();
      logger.info(`Quiz saved successfully: ${quiz._id}`);

      logger.info(`Quiz created successfully: ${quiz._id}, Access Code: ${accessCode || 'N/A (public)'}`);

      res.status(201).json({
        success: true,
        message: isPublic ? 'Public quiz created successfully' : `Private quiz created with access code: ${accessCode}`,
        quiz: {
          ...quiz.toObject(),
          accessCode: accessCode,
          questionCount: questions.length
        }
      });
    } catch (error) {
      logger.error('Create quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create manual quiz
  async createManualQuiz(req, res) {
    try {
      const { title, topic, difficulty, questions, isPublic = true } = req.body;

      logger.info('Manual quiz creation request:', { title, topic, difficulty, questionsCount: questions?.length, isPublic });

      if (!title || !topic || !difficulty || !questions || !Array.isArray(questions)) {
        logger.error('Missing required fields:', { title: !!title, topic: !!topic, difficulty: !!difficulty, questions: !!questions, isArray: Array.isArray(questions) });
        return res.status(400).json({
          success: false,
          message: 'Missing required fields or invalid questions format'
        });
      }

      if (questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Quiz must have at least one question'
        });
      }

      // Validate questions
      logger.info('Validating questions...');
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const correctAnswer = question.correctAnswer !== undefined ? question.correctAnswer : question.correct;
        logger.info(`Validating question ${i + 1}:`, { 
          hasQuestion: !!question.question, 
          hasOptions: !!question.options, 
          isOptionsArray: Array.isArray(question.options),
          optionsLength: question.options?.length,
          correctAnswer: correctAnswer,
          questionData: question
        });
        
        if (!question.question || !question.options || !Array.isArray(question.options) ||
          question.options.length < 2 || correctAnswer === undefined ||
          correctAnswer < 0 || correctAnswer >= question.options.length) {
          logger.error(`Invalid question format at question ${i + 1}:`, question);
          return res.status(400).json({
            success: false,
            message: `Invalid question format at question ${i + 1}. Expected: question, options array (min 2), correctAnswer (0-${question.options?.length - 1 || 'unknown'})`
          });
        }
      }
      logger.info('All questions validated successfully');

      const accessCode = !isPublic ? StudyController.generateAccessCode() : undefined;

      const quizData = {
        title,
        topic,
        difficulty,
        creator: req.userId,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correct,
          explanation: q.explanation || '',
          points: q.points || 1,
          timeLimit: q.timeLimit || 30
        })),
        isPublic,
        aiGenerated: false,
        status: 'draft'
      };

      // Only add accessCode if it's not undefined (for private quizzes)
      if (accessCode !== undefined) {
        quizData.accessCode = accessCode;
      }

      logger.info(`Creating manual quiz with data:`, { 
        title: quizData.title, 
        isPublic: quizData.isPublic, 
        hasAccessCode: !!quizData.accessCode,
        questionsCount: quizData.questions.length 
      });

      const quiz = new Quiz(quizData);

      // Add creator as a participant
      quiz.participants.push({
        user: req.userId,
        joinedAt: new Date()
      });

      logger.info('Attempting to save quiz to database...');
      try {
        await quiz.save();
        logger.info('Quiz saved successfully to database');
      } catch (saveError) {
        logger.error('Database save error:', saveError);
        return res.status(500).json({
          success: false,
          message: `Database error: ${saveError.message}`
        });
      }

      res.status(201).json({
        success: true,
        message: isPublic ? 'Public manual quiz created successfully' : `Private manual quiz created with access code: ${accessCode}`,
        quiz: {
          ...quiz.toObject(),
          accessCode: accessCode,
          questionCount: questions.length
        }
      });
    } catch (error) {
      logger.error('Create manual quiz error:', error);
      res.status(500).json({
        success: false,
        message: `Internal server error: ${error.message}`
      });
    }
  }

  // Get public quizzes
  async getQuizzes(req, res) {
    try {
      const { topic, difficulty } = req.query;
      
      // Get quizzes that are either:
      // 1. Public quizzes
      // 2. Quizzes created by the user
      // 3. Private quizzes the user has joined
      const publicFilter = { 
        isPublic: true,
        status: { $in: ['scheduled', 'active', 'draft'] }
      };

      const createdFilter = {
        creator: req.userId,
        status: { $in: ['scheduled', 'active', 'draft'] }
      };

      const joinedFilter = {
        'participants.user': req.userId,
        status: { $in: ['scheduled', 'active', 'draft'] }
      };

      if (topic) {
        publicFilter.topic = new RegExp(topic, 'i');
        createdFilter.topic = new RegExp(topic, 'i');
        joinedFilter.topic = new RegExp(topic, 'i');
      }
      if (difficulty) {
        publicFilter.difficulty = difficulty;
        createdFilter.difficulty = difficulty;
        joinedFilter.difficulty = difficulty;
      }

      // Use $or to get quizzes matching any of the conditions
      const quizzes = await Quiz.find({
        $or: [publicFilter, createdFilter, joinedFilter]
      })
        .populate('creator', 'firstName lastName')
        .sort({ createdAt: -1 });

      // Remove duplicates (in case a user created a public quiz they also joined)
      const uniqueQuizzes = quizzes.filter((quiz, index, self) => 
        index === self.findIndex(q => q._id.toString() === quiz._id.toString())
      );

      res.json({
        success: true,
        quizzes: uniqueQuizzes
      });
    } catch (error) {
      logger.error('Get quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Join quiz by access code or quiz ID
  async joinQuizByCode(req, res) {
    try {
      const { accessCode, quizId } = req.body;

      let quiz;

      if (quizId) {
        // Join by quiz ID (for public quizzes)
        quiz = await Quiz.findById(quizId)
          .populate('creator', 'firstName lastName');
          
        if (!quiz) {
          return res.status(404).json({
            success: false,
            message: 'Quiz not found'
          });
        }

        // Check if quiz is public or user is creator
        if (!quiz.isPublic && quiz.creator._id.toString() !== req.userId) {
          return res.status(403).json({
            success: false,
            message: 'This quiz is private. Access code required.'
          });
        }
      } else if (accessCode) {
        // Join by access code (for private quizzes)
        quiz = await Quiz.findOne({ accessCode })
          .populate('creator', 'firstName lastName');

        if (!quiz) {
          return res.status(404).json({
            success: false,
            message: 'Quiz not found with the provided access code'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: 'Either quiz ID or access code is required'
        });
      }

      // Add user as participant
      await quiz.addParticipant(req.userId);

      res.json({
        success: true,
        message: 'Successfully joined the quiz',
        quiz
      });
    } catch (error) {
      logger.error('Join quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Schedule quiz
  async scheduleQuiz(req, res) {
    try {
      const { quizId } = req.params;
      const { scheduledAt, duration } = req.body;

      const quiz = await Quiz.findOne({ _id: quizId, creator: req.userId });

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found or you are not the creator'
        });
      }

      quiz.scheduledAt = new Date(scheduledAt);
      quiz.duration = duration || 30;
      quiz.status = 'scheduled';

      await quiz.save();

      res.json({
        success: true,
        message: 'Quiz scheduled successfully',
        quiz
      });
    } catch (error) {
      logger.error('Schedule quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Start quiz
  async startQuiz(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quiz.findOne({ _id: quizId, creator: req.userId });

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found or you are not the creator'
        });
      }

      quiz.status = 'active';
      await quiz.save();

      // Notify participants via Socket.IO
      if (req.io) {
        req.io.to(`quiz-${quizId}`).emit('quiz-started', { quizId });
      }

      res.json({
        success: true,
        message: 'Quiz started successfully',
        quiz
      });
    } catch (error) {
      logger.error('Start quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Submit quiz answers
  async submitQuizAnswers(req, res) {
    try {
      const { quizId } = req.params;
      const { answers, totalTimeSpent } = req.body;

      const quiz = await Quiz.findById(quizId);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      if (quiz.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Quiz is not currently active'
        });
      }

      // Check if user is a participant
      const participant = quiz.participants.find(p => p.user.toString() === req.userId.toString());
      if (!participant) {
        return res.status(403).json({
          success: false,
          message: 'You are not a participant of this quiz'
        });
      }

      // Allow retakes by resetting completion status if already completed
      if (participant.completedAt) {
        logger.info(`User ${req.userId} is retaking quiz ${quizId}`);
        participant.completedAt = null;
        participant.score = 0;
        participant.percentage = 0;
        participant.answers = [];
        participant.totalTimeSpent = 0;
      }

      await quiz.submitAnswers(req.userId, answers, totalTimeSpent);

      // Create QuizAttempt record for status tracking
      const QuizAttempt = await import('../models/QuizAttempt.js').then(m => m.default).catch(() => null);
      
      if (QuizAttempt) {
        // Check if attempt already exists
        const existingAttempt = await QuizAttempt.findOne({
          user: req.userId,
          quiz: quizId
        });

        if (existingAttempt) {
          // Update existing attempt
          existingAttempt.score = participant.score;
          existingAttempt.percentage = participant.percentage;
          existingAttempt.totalTimeSpent = totalTimeSpent;
          existingAttempt.completedAt = new Date();
          await existingAttempt.save();
        } else {
          // Create new attempt
          const attempt = new QuizAttempt({
            user: req.userId,
            quiz: quizId,
            score: participant.score,
            percentage: participant.percentage,
            totalTimeSpent: totalTimeSpent,
            completedAt: new Date()
          });
          await attempt.save();
        }
      }

      // Update user stats
      const user = await User.findById(req.userId);
      if (user) {
        user.stats.quizzesCompleted += 1;
        await user.save();
      }

      // Notify via Socket.IO
      if (req.io) {
        req.io.to(`quiz-${quizId}`).emit('quiz-submission', { 
          userId: req.userId, 
          score: participant.score 
        });
      }

      res.json({
        success: true,
        message: 'Quiz answers submitted successfully',
        score: participant.score,
        percentage: participant.percentage,
        rank: participant.rank
      });
    } catch (error) {
      logger.error('Submit quiz answers error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get quiz leaderboard
  async getQuizLeaderboard(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quiz.findById(quizId)
        .populate('leaderboard.user', 'firstName lastName');

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      res.json({
        success: true,
        leaderboard: quiz.leaderboard,
        analytics: quiz.analytics
      });
    } catch (error) {
      logger.error('Get quiz leaderboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user quiz history
  async getUserQuizHistory(req, res) {
    try {
      // Get quizzes created by user
      const createdQuizzes = await Quiz.find({ creator: req.userId })
        .populate('creator', 'firstName lastName')
        .sort({ createdAt: -1 });

      // Get quizzes participated by user
      const participatedQuizzes = await Quiz.find({ 
        'participants.user': req.userId,
        'participants.completedAt': { $exists: true }
      })
        .populate('creator', 'firstName lastName')
        .sort({ 'participants.completedAt': -1 });

      res.json({
        success: true,
        createdQuizzes,
        participatedQuizzes
      });
    } catch (error) {
      logger.error('Get user quiz history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get quiz details for taking quiz
  async getQuizForTaking(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quiz.findById(quizId)
        .populate('creator', 'firstName lastName');

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Check if user can access this quiz
      if (!quiz.isPublic && quiz.creator._id.toString() !== req.userId) {
        // Check if user is a participant
        const isParticipant = quiz.participants.some(p => p.user.toString() === req.userId);
        if (!isParticipant) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this quiz'
          });
        }
      }

      // Return quiz without correct answers
      const quizForTaking = {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        topic: quiz.topic,
        difficulty: quiz.difficulty,
        creator: quiz.creator,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          points: q.points,
          timeLimit: q.timeLimit
        })),
        settings: quiz.settings,
        status: quiz.status,
        scheduledAt: quiz.scheduledAt,
        duration: quiz.duration
      };

      res.json({
        success: true,
        quiz: quizForTaking
      });
    } catch (error) {
      logger.error('Get quiz for taking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Submit quiz attempt (for individual quiz taking)
  async submitQuizAttempt(req, res) {
    try {
      const { quizId, answers } = req.body;

      if (!quizId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({
          success: false,
          message: 'Quiz ID and answers array are required'
        });
      }

      const quiz = await Quiz.findById(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Calculate score
      let correctAnswers = 0;
      const results = quiz.questions.map((question, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === question.correctAnswer;
        if (isCorrect) correctAnswers++;
        
        return {
          questionIndex: index,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation
        };
      });

      const score = (correctAnswers / quiz.questions.length) * 100;

      // Create quiz attempt record
      const QuizAttempt = await import('../models/QuizAttempt.js').then(m => m.default).catch(() => null);
      
      let attempt;
      if (QuizAttempt) {
        attempt = new QuizAttempt({
          user: req.userId,
          quiz: quizId,
          answers,
          results,
          score,
          completedAt: new Date()
        });
        await attempt.save();
      }

      // Update user stats
      const user = await User.findById(req.userId);
      if (user) {
        user.stats.quizzesCompleted += 1;
        user.stats.averageScore = user.stats.averageScore 
          ? (user.stats.averageScore + score) / 2 
          : score;
        await user.save();
      }

      res.json({
        success: true,
        message: 'Quiz completed successfully',
        attempt: {
          _id: attempt?._id,
          quizId,
          score,
          results,
          completedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Submit quiz attempt error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's quiz attempts
  async getQuizAttempts(req, res) {
    try {
      // Try to get from QuizAttempt model if it exists
      const QuizAttempt = await import('../models/QuizAttempt.js').then(m => m.default).catch(() => null);
      
      let attempts = [];
      if (QuizAttempt) {
        attempts = await QuizAttempt.find({ user: req.userId })
          .populate('quiz', 'title topic difficulty')
          .sort({ completedAt: -1 });
      } else {
        // Fallback: get from Quiz participants
        const quizzes = await Quiz.find({ 
          'participants.user': req.userId,
          'participants.completedAt': { $exists: true }
        });

        attempts = quizzes.map(quiz => {
          const participant = quiz.participants.find(p => p.user.toString() === req.userId);
          return {
            _id: `${quiz._id}_${req.userId}`,
            quizId: quiz._id,
            quiz: {
              title: quiz.title,
              topic: quiz.topic,
              difficulty: quiz.difficulty
            },
            score: participant.score || 0,
            completedAt: participant.completedAt
          };
        });
      }

      res.json({
        success: true,
        attempts
      });
    } catch (error) {
      logger.error('Get quiz attempts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Helper method to generate access code
  generateAccessCode() {
    const uuid = uuidv4().replace(/-/g, '').toUpperCase();
    return uuid.substring(0, 6);
  }
  
  // Progressive content generation
  static async generateStudyPlanContent(studyPlanId, userId) {
    try {
      logger.info(`Starting content generation for study plan: ${studyPlanId}`);
      
      const studyPlan = await StudyPlan.findById(studyPlanId);
      if (!studyPlan) {
        logger.error(`Study plan not found: ${studyPlanId}`);
        throw new Error('Study plan not found');
      }

      let generatedCount = 0;
      const totalDays = studyPlan.dailyContent.length;
      let aiSuccessCount = 0;

      logger.info(`Generating content for ${totalDays} days...`);

      // Generate content for each day
      for (let i = 0; i < studyPlan.dailyContent.length; i++) {
        const dailyContent = studyPlan.dailyContent[i];
        
        try {
          logger.info(`Generating content for Day ${dailyContent.day}: ${dailyContent.title}`);
          
          // Create a comprehensive prompt for better content generation
          const prompt = `Create comprehensive study content for "${dailyContent.title}" in ${studyPlan.subject}.
          
          Subject: ${studyPlan.subject}
          Difficulty Level: ${studyPlan.difficulty}
          Learning Style: ${studyPlan.learningStyle}
          Day: ${dailyContent.day} of ${totalDays}
          Syllabus Context: ${studyPlan.syllabus}
          
          Please provide:
          1. A detailed overview (2-3 paragraphs)
          2. 5-7 key learning points
          3. 3-4 practical examples
          4. 4-5 hands-on exercises
          5. 3-4 additional resources
          
          Format the response as JSON with keys: overview, keyPoints, examples, exercises, resources`;

          const aiResult = await aiService.generateContent(prompt, {
            temperature: 0.7,
            maxTokens: 2000
          });

          if (aiResult.success) {
            try {
              // Try to parse AI response as JSON
              const parsedContent = JSON.parse(aiResult.content);
              dailyContent.content = {
                overview: parsedContent.overview || `Comprehensive study content for ${dailyContent.title}`,
                keyPoints: parsedContent.keyPoints || [],
                examples: parsedContent.examples || [],
                exercises: parsedContent.exercises || [],
                resources: parsedContent.resources || []
              };
              aiSuccessCount++;
              logger.info(`AI content generated for Day ${dailyContent.day}`);
            } catch (parseError) {
              // If JSON parsing fails, use the raw content
              dailyContent.content = {
                overview: aiResult.content,
                keyPoints: [`Key concepts for ${dailyContent.title}`],
                examples: [`Example related to ${dailyContent.title}`],
                exercises: [`Practice exercise for ${dailyContent.title}`],
                resources: [{
                  type: 'article',
                  title: `Additional resources for ${dailyContent.title}`,
                  description: `Learning resources for ${dailyContent.title}`,
                  url: ''
                }]
              };
              logger.info(`AI content generated (raw) for Day ${dailyContent.day}`);
            }
          } else {
            // Use enhanced fallback content
            dailyContent.content = StudyController.generateEnhancedFallbackContent(
              dailyContent.title, 
              studyPlan.subject, 
              studyPlan.difficulty,
              dailyContent.day,
              totalDays
            );
            logger.info(`Fallback content generated for Day ${dailyContent.day}`);
          }

          dailyContent.isContentGenerated = true;
          generatedCount++;
          
          // Save progress after each day
          await studyPlan.save();
          
          logger.info(`Progress: ${generatedCount}/${totalDays} days completed`);
          
          // Small delay to prevent overwhelming the AI service
          if (i < studyPlan.dailyContent.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          logger.error(`Error generating content for Day ${dailyContent.day}:`, error);
          
          // Use enhanced fallback content on error
          dailyContent.content = StudyController.generateEnhancedFallbackContent(
            dailyContent.title, 
            studyPlan.subject, 
            studyPlan.difficulty,
            dailyContent.day,
            totalDays
          );
          dailyContent.isContentGenerated = true;
          generatedCount++;
        }
      }

      // Mark study plan as ready
      studyPlan.status = 'ready';
      studyPlan.aiGenerated = aiSuccessCount > 0;
      studyPlan.contentGeneratedAt = new Date();
      await studyPlan.save();

      logger.info(`Study plan content generation completed: ${studyPlanId}`);
      logger.info(`Generated ${generatedCount}/${totalDays} days (${aiSuccessCount} with AI)`);

      return studyPlan;

    } catch (error) {
      logger.error(`Content generation error for ${studyPlanId}:`, error);
      
      // Mark as failed
      try {
        const studyPlan = await StudyPlan.findById(studyPlanId);
        if (studyPlan) {
          studyPlan.status = 'failed';
          await studyPlan.save();
        }
      } catch (saveError) {
        logger.error('Error updating study plan status:', saveError);
      }
      
      throw error;
    }
  }

  // Enhanced fallback content generator
  static generateEnhancedFallbackContent(title, subject, difficulty, day, totalDays) {
    const difficultyLevel = difficulty.toLowerCase();
    const progressContext = `Day ${day} of ${totalDays}`;
    
    return {
      overview: `Welcome to ${title}! This ${progressContext} focuses on essential ${subject} concepts at ${difficulty} level. You'll explore fundamental principles, understand practical applications, and develop hands-on skills through structured learning activities. This comprehensive session is designed to build your knowledge progressively and ensure solid understanding of key concepts.`,
      
      keyPoints: [
        `Core ${subject} fundamentals relevant to ${title}`,
        `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}-level concepts and principles`,
        `Practical applications in real-world scenarios`,
        `Best practices and common patterns`,
        `Problem-solving techniques and approaches`,
        `Integration with related ${subject} topics`,
        `Performance considerations and optimization`
      ],
      
      examples: [
        `Practical example demonstrating ${title} concepts`,
        `Step-by-step walkthrough of common ${subject} scenarios`,
        `Real-world application showing ${difficulty}-level implementation`,
        `Comparative example highlighting key differences and similarities`
      ],
      
      exercises: [
        `Hands-on practice: Implement basic ${title} functionality`,
        `Problem-solving exercise: Apply ${subject} concepts to solve practical challenges`,
        `Code review activity: Analyze and improve existing implementations`,
        `Project-based task: Build a small application using ${title} principles`,
        `Debugging challenge: Identify and fix common issues`
      ],
      
      resources: [
        {
          type: 'article',
          title: `Official ${subject} Documentation`,
          description: `Comprehensive official documentation and guides for ${subject}`,
          url: ''
        },
        {
          type: 'practice',
          title: 'Interactive Tutorials and Coding Platforms',
          description: `Hands-on practice platforms and interactive tutorials`,
          url: ''
        },
        {
          type: 'video',
          title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Level Video Tutorials`,
          description: `Video tutorials and online courses for ${difficulty} level learners`,
          url: ''
        },
        {
          type: 'article',
          title: 'Community Forums and Discussion Groups',
          description: `Community support, forums, and discussion groups for ${subject}`,
          url: ''
        },
        {
          type: 'book',
          title: `Advanced ${subject} Books and Articles`,
          description: `Books and articles on advanced ${subject} topics and concepts`,
          url: ''
        }
      ]
    };
  }

  // Static helper method to generate access code
  static generateAccessCode() {
    const uuid = uuidv4().replace(/-/g, '').toUpperCase();
    return uuid.substring(0, 6);
  }

  // Start study session
  async startStudySession(req, res) {
    try {
      const { studyPlanId, topicId, day = 1 } = req.body;

      // Use findOneAndUpdate with upsert to avoid duplicate key errors
      let userProgress = await UserProgress.findOneAndUpdate(
        {
          user: req.userId,
          studyPlan: studyPlanId,
          day: day
        },
        {
          $setOnInsert: {
            user: req.userId,
            studyPlan: studyPlanId,
            day: day,
            status: 'not_started',
            studySessions: [],
            totalStudyTime: 0,
            sessionsCount: 0,
            sectionsViewed: [],
            conceptsLearned: [],
            exercisesCompleted: [],
            resourcesAccessed: []
          }
        },
        {
          upsert: true,
          new: true,
          runValidators: true
        }
      );

      // Start the study session
      await userProgress.startStudySession();

      res.json({
        success: true,
        message: 'Study session started',
        sessionId: userProgress._id
      });
    } catch (error) {
      logger.error('Start study session error:', error);
      res.status(500).json({
        success: false,
        message: `Internal server error: ${error.message}`
      });
    }
  }

  // Generate day content on-demand when starting study session
  async generateDayContentOnDemand(req, res) {
    try {
      const { planId, day } = req.params;
      const dayNumber = parseInt(day);

      logger.info(`🤖 Generating on-demand content for plan ${planId}, day ${dayNumber}`);

      // Find the study plan
      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Find the specific day
      const dailyContent = studyPlan.dailyContent.find(d => d.day === dayNumber);
      if (!dailyContent) {
        return res.status(404).json({
          success: false,
          message: 'Day content not found'
        });
      }

      // Check if content is already generated
      if (dailyContent.isContentGenerated && dailyContent.content.overview) {
        logger.info(`Content already exists for day ${dayNumber}, returning existing content`);
        return res.json({
          success: true,
          content: dailyContent.content,
          title: dailyContent.title,
          day: dayNumber,
          isGenerated: true,
          cached: true
        });
      }

      // Generate fresh AI content
      logger.info(`🤖 Generating fresh AI content for: ${dailyContent.title}`);
      
      try {
        const aiResult = await aiService.generateDailyContent(
          dailyContent.title,
          dayNumber,
          studyPlan.subject,
          studyPlan.difficulty,
          dailyContent.syllabusSection || '',
          dailyContent.keywords || []
        );

        if (aiResult.success) {
          // Parse the AI response
          let parsedContent;
          try {
            if (typeof aiResult.content === 'string') {
              // Try to extract JSON from the response
              const jsonMatch = aiResult.content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                parsedContent = JSON.parse(jsonMatch[0]);
              } else {
                throw new Error('No JSON found in AI response');
              }
            } else {
              parsedContent = aiResult.content;
            }
          } catch (parseError) {
            logger.warn('Failed to parse AI content as JSON, using fallback parsing');
            // Fallback: parse the text content manually
            parsedContent = this.parseAIContentFallback(aiResult.content, dailyContent.title);
          }

          // Update the daily content with AI-generated content
          dailyContent.content = {
            overview: parsedContent.overview || `Comprehensive overview for ${dailyContent.title}`,
            keyPoints: parsedContent.keyPoints || parsedContent.key_points || [],
            examples: parsedContent.examples || [],
            exercises: parsedContent.exercises || [],
            resources: parsedContent.resources || this.generateDefaultResources(studyPlan.subject, dailyContent.title)
          };

          dailyContent.isContentGenerated = true;
          dailyContent.contentGeneratedAt = new Date();

          // Save the updated study plan
          await studyPlan.save();

          logger.info(`✅ AI content generated successfully for day ${dayNumber}`);
          logger.info(`   📝 Overview: ${dailyContent.content.overview?.length || 0} chars`);
          logger.info(`   🔑 Key Points: ${dailyContent.content.keyPoints?.length || 0}`);
          logger.info(`   💡 Examples: ${dailyContent.content.examples?.length || 0}`);
          logger.info(`   🏋️ Exercises: ${dailyContent.content.exercises?.length || 0}`);

          res.json({
            success: true,
            content: dailyContent.content,
            title: dailyContent.title,
            day: dayNumber,
            isGenerated: true,
            message: '🤖 AI-powered study content generated successfully!'
          });

        } else {
          throw new Error(aiResult.error || 'AI content generation failed');
        }

      } catch (aiError) {
        logger.error(`❌ AI content generation failed for day ${dayNumber}:`, aiError.message);
        
        // Generate fallback content
        const fallbackContent = this.generateFallbackContent(dailyContent.title, studyPlan.subject, dayNumber);
        
        dailyContent.content = fallbackContent;
        dailyContent.isContentGenerated = true;
        dailyContent.contentGeneratedAt = new Date();
        await studyPlan.save();

        res.json({
          success: true,
          content: fallbackContent,
          title: dailyContent.title,
          day: dayNumber,
          isGenerated: true,
          fallback: true,
          message: 'Study content generated (fallback mode)'
        });
      }

    } catch (error) {
      logger.error('Generate day content on-demand error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate study content',
        error: error.message
      });
    }
  }

  // Helper function to parse AI content when JSON parsing fails
  parseAIContentFallback(content, title) {
    const sections = {
      overview: '',
      keyPoints: [],
      examples: [],
      exercises: [],
      resources: []
    };

    const lines = content.split('\n').filter(line => line.trim());
    let currentSection = null;
    let currentItem = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('overview')) {
        currentSection = 'overview';
        currentItem = '';
      } else if (trimmedLine.toLowerCase().includes('key point') || trimmedLine.toLowerCase().includes('main point')) {
        currentSection = 'keyPoints';
        currentItem = '';
      } else if (trimmedLine.toLowerCase().includes('example')) {
        currentSection = 'examples';
        currentItem = '';
      } else if (trimmedLine.toLowerCase().includes('exercise') || trimmedLine.toLowerCase().includes('activity')) {
        currentSection = 'exercises';
        currentItem = '';
      } else if (trimmedLine.toLowerCase().includes('resource')) {
        currentSection = 'resources';
        currentItem = '';
      } else if (trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./)) {
        // This is a list item
        const cleanItem = trimmedLine.replace(/^[-\d.]\s*/, '').trim();
        if (currentSection && cleanItem) {
          if (currentSection === 'overview') {
            sections.overview += cleanItem + ' ';
          } else {
            sections[currentSection].push(cleanItem);
          }
        }
      } else if (trimmedLine && currentSection) {
        // Continue building current item
        if (currentSection === 'overview') {
          sections.overview += trimmedLine + ' ';
        } else {
          currentItem += trimmedLine + ' ';
        }
      }
    }

    // Ensure we have some content
    if (!sections.overview) {
      sections.overview = `Comprehensive study session for ${title}. This session covers essential concepts, practical applications, and hands-on exercises to help you master the topic effectively.`;
    }

    if (sections.keyPoints.length === 0) {
      sections.keyPoints = [
        `Understanding the fundamentals of ${title}`,
        `Practical applications and real-world usage`,
        `Common challenges and how to overcome them`,
        `Best practices and industry standards`,
        `Advanced techniques and optimization`
      ];
    }

    return sections;
  }

  // Helper function to generate fallback content
  generateFallbackContent(title, subject, day) {
    return {
      overview: `Welcome to Day ${day} of your ${subject} study journey! Today's focus is on ${title}. This comprehensive study session will provide you with essential knowledge, practical examples, and hands-on exercises to master the concepts effectively. You'll learn key principles, explore real-world applications, and practice with guided exercises designed to reinforce your understanding.`,
      keyPoints: [
        `Understanding the core concepts of ${title}`,
        `Practical applications in ${subject}`,
        `Common challenges and solutions`,
        `Best practices and industry standards`,
        `Advanced techniques and optimization strategies`,
        `Real-world implementation examples`,
        `Testing and validation approaches`
      ],
      examples: [
        `Basic implementation example for ${title}`,
        `Advanced use case in ${subject}`,
        `Real-world application scenario`,
        `Common problem-solving approach`,
        `Industry best practice example`
      ],
      exercises: [
        `Practice exercise: Implement basic ${title} concepts`,
        `Hands-on activity: Build a simple project`,
        `Problem-solving: Debug common issues`,
        `Creative challenge: Design your own solution`,
        `Review exercise: Explain concepts to others`,
        `Advanced practice: Optimize your implementation`,
        `Portfolio project: Create a comprehensive example`,
        `Peer review: Evaluate different approaches`
      ],
      resources: this.generateDefaultResources(subject, title)
    };
  }

  // Helper function to generate default resources
  generateDefaultResources(subject, title) {
    return [
      {
        type: 'documentation',
        title: `Official ${subject} Documentation`,
        url: '#',
        description: `Comprehensive documentation for ${subject}`
      },
      {
        type: 'tutorial',
        title: `${title} Tutorial`,
        url: '#',
        description: `Step-by-step tutorial for ${title}`
      },
      {
        type: 'video',
        title: `${title} Video Guide`,
        url: '#',
        description: `Visual learning resource for ${title}`
      },
      {
        type: 'practice',
        title: `${title} Practice Problems`,
        url: '#',
        description: `Additional practice exercises for ${title}`
      },
      {
        type: 'reference',
        title: `${subject} Reference Guide`,
        url: '#',
        description: `Quick reference for ${subject} concepts`
      }
    ];
  }

  // End study session
  async endStudySession(req, res) {
    try {
      const { sessionId, timeSpent } = req.body;

      const userProgress = await UserProgress.findById(sessionId);
      if (!userProgress) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      userProgress.totalStudyTime += timeSpent || 0;
      userProgress.lastStudied = new Date();
      await userProgress.save();

      res.json({
        success: true,
        message: 'Study session ended'
      });
    } catch (error) {
      logger.error('End study session error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update section progress
  async updateSectionProgress(req, res) {
    try {
      const { sessionId, sectionType, sectionId } = req.body;

      const userProgress = await UserProgress.findById(sessionId);
      if (!userProgress) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      // Update learning metrics based on section type
      if (sectionType === 'concept') {
        if (!userProgress.conceptsLearned.includes(sectionId)) {
          userProgress.conceptsLearned.push(sectionId);
        }
      } else if (sectionType === 'exercise') {
        if (!userProgress.exercisesCompleted.includes(sectionId)) {
          userProgress.exercisesCompleted.push(sectionId);
        }
      }

      await userProgress.save();

      res.json({
        success: true,
        message: 'Section progress updated'
      });
    } catch (error) {
      logger.error('Update section progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get topic content
  async getTopicContent(req, res) {
    try {
      const { planId, topicId } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Find the daily content for the topic
      const dailyContent = studyPlan.dailyContent.find(d => 
        d.day.toString() === topicId.replace('day-', '') || 
        `day-${d.day}` === topicId
      );

      if (!dailyContent) {
        return res.status(404).json({
          success: false,
          message: 'Topic content not found'
        });
      }

      // If content is not generated yet, generate it on-demand
      if (!dailyContent.isContentGenerated || !dailyContent.content || 
          !dailyContent.content.overview || dailyContent.content.overview === '') {
        
        logger.info(`Generating on-demand content for ${dailyContent.title}`);
        
        try {
          // Generate content immediately
          const prompt = `Create comprehensive study content for "${dailyContent.title}" in ${studyPlan.subject}.
          
          Subject: ${studyPlan.subject}
          Difficulty Level: ${studyPlan.difficulty}
          Learning Style: ${studyPlan.learningStyle}
          Day: ${dailyContent.day}
          Syllabus Context: ${studyPlan.syllabus}
          
          Please provide detailed content including overview, key points, examples, exercises, and resources.`;

          const aiResult = await aiService.generateContent(prompt, {
            temperature: 0.7,
            maxTokens: 1500
          });

          if (aiResult.success) {
            try {
              const parsedContent = JSON.parse(aiResult.content);
              dailyContent.content = {
                overview: parsedContent.overview || `Comprehensive study content for ${dailyContent.title}`,
                keyPoints: parsedContent.keyPoints || [],
                examples: parsedContent.examples || [],
                exercises: parsedContent.exercises || [],
                resources: parsedContent.resources || []
              };
            } catch (parseError) {
              dailyContent.content = {
                overview: aiResult.content,
                keyPoints: [`Key concepts for ${dailyContent.title}`],
                examples: [`Example for ${dailyContent.title}`],
                exercises: [`Exercise for ${dailyContent.title}`],
                resources: [{
                  type: 'article',
                  title: `Resources for ${dailyContent.title}`,
                  description: `Learning resources for ${dailyContent.title}`,
                  url: ''
                }]
              };
            }
          } else {
            // Use enhanced fallback
            dailyContent.content = StudyController.generateEnhancedFallbackContent(
              dailyContent.title,
              studyPlan.subject,
              studyPlan.difficulty,
              dailyContent.day,
              studyPlan.dailyContent.length
            );
          }

          dailyContent.isContentGenerated = true;
          await studyPlan.save();
          
          logger.info(`On-demand content generated for ${dailyContent.title}`);
          
        } catch (error) {
          logger.error('On-demand content generation error:', error);
          
          // Use enhanced fallback content
          dailyContent.content = StudyController.generateEnhancedFallbackContent(
            dailyContent.title,
            studyPlan.subject,
            studyPlan.difficulty,
            dailyContent.day,
            studyPlan.dailyContent.length
          );
          dailyContent.isContentGenerated = true;
          await studyPlan.save();
        }
      }

      res.json({
        success: true,
        content: dailyContent.content,
        title: dailyContent.title,
        day: dailyContent.day,
        isGenerated: dailyContent.isContentGenerated
      });
    } catch (error) {
      logger.error('Get topic content error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get quiz by ID (for joined private quizzes)
  async getQuizById(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quiz.findById(quizId)
        .populate('creator', 'firstName lastName');

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      // Check if user can access this quiz
      if (!quiz.isPublic) {
        // Check if user is the creator or a participant
        const isCreator = quiz.creator._id.toString() === req.userId;
        const isParticipant = quiz.participants.some(p => p.user.toString() === req.userId);
        
        if (!isCreator && !isParticipant) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this quiz'
          });
        }
      }

      res.json({
        success: true,
        quiz
      });
    } catch (error) {
      logger.error('Get quiz by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update topic status
  async updateTopicStatus(req, res) {
    try {
      const { planId, topicId } = req.params;
      const { status } = req.body;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      // Find and update the daily content
      const dayNumber = parseInt(topicId.replace('day-', ''));
      const dailyContent = studyPlan.dailyContent.find(d => d.day === dayNumber);

      if (!dailyContent) {
        return res.status(404).json({
          success: false,
          message: 'Topic not found'
        });
      }

      dailyContent.status = status;
      if (status === 'completed') {
        dailyContent.completedAt = new Date();
      }

      await studyPlan.save();

      res.json({
        success: true,
        message: 'Topic status updated successfully'
      });
    } catch (error) {
      logger.error('Update topic status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get study plan status
  async getStudyPlanStatus(req, res) {
    try {
      const { planId } = req.params;

      const studyPlan = await StudyPlan.findOne({
        _id: planId,
        user: req.userId
      });

      if (!studyPlan) {
        return res.status(404).json({
          success: false,
          message: 'Study plan not found'
        });
      }

      const generatedCount = studyPlan.dailyContent.filter(d => d.isContentGenerated).length;
      const totalCount = studyPlan.dailyContent.length;

      res.json({
        success: true,
        status: studyPlan.status,
        progress: {
          generated: generatedCount,
          total: totalCount,
          percentage: Math.round((generatedCount / totalCount) * 100)
        },
        contentGeneratedAt: studyPlan.contentGeneratedAt,
        message: StudyController.getStatusMessage(studyPlan.status, generatedCount, totalCount)
      });
    } catch (error) {
      logger.error('Get study plan status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Helper method for status messages
  static getStatusMessage(status, generated, total) {
    switch (status) {
      case 'generating':
        return `Generating study content... (${generated}/${total} days completed)`;
      case 'ready':
        return 'Your study plan is ready!';
      case 'partial':
        return `Study plan partially generated (${generated}/${total} days available)`;
      case 'failed':
        return 'Content generation failed, but basic plan is available';
      default:
        return 'Study plan status unknown';
    }
  }
  // Get quiz completion status for a user
  async getQuizStatus(req, res) {
    try {
      const { quizId } = req.params;
      const userId = req.user.id;

      // Check if user has completed this quiz
      const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
      
      const attempt = await QuizAttempt.findOne({
        quiz: quizId,
        user: userId
      }).sort({ createdAt: -1 }); // Get the latest attempt

      if (attempt) {
        res.json({
          success: true,
          completed: true,
          attempt: {
            score: attempt.score,
            percentage: attempt.percentage,
            totalTimeSpent: attempt.totalTimeSpent,
            completedAt: attempt.createdAt
          }
        });
      } else {
        res.json({
          success: true,
          completed: false,
          attempt: null
        });
      }

    } catch (error) {
      logger.error('Error getting quiz status:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
  // Generate exercise questions
  async generateExerciseQuestions(req, res) {
    try {
      const { exerciseTitle, subject, difficulty = 'beginner' } = req.body;

      if (!exerciseTitle || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Exercise title and subject are required'
        });
      }

      logger.info(`Generating exercise questions for: ${exerciseTitle} in ${subject}`);

      const result = await aiService.generateExerciseQuestions(exerciseTitle, subject, difficulty);

      if (result.success) {
        res.json({
          success: true,
          questions: result.questions
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to generate exercise questions'
        });
      }
    } catch (error) {
      logger.error('Generate exercise questions error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

export default new StudyController();