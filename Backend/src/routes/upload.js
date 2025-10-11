import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import auth from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.doc', '.docx', '.txt'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

// Upload and parse file
router.post('/parse', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let extractedText = '';

    try {
      switch (fileExt) {
        case '.doc':
        case '.docx':
          const docBuffer = fs.readFileSync(filePath);
          const docResult = await mammoth.extractRawText({ buffer: docBuffer });
          extractedText = docResult.value;
          break;

        case '.txt':
          extractedText = fs.readFileSync(filePath, 'utf8');
          break;

        default:
          throw new Error('Unsupported file type');
      }

      // Clean up the file
      fs.unlinkSync(filePath);

      // Clean and validate extracted text
      extractedText = extractedText.trim();
      
      if (!extractedText) {
        return res.status(400).json({
          success: false,
          message: 'No text could be extracted from the file'
        });
      }

      if (extractedText.length > 50000) {
        extractedText = extractedText.substring(0, 50000) + '...';
      }

      logger.info(`File parsed successfully: ${req.file.originalname}, extracted ${extractedText.length} characters`);

      res.json({
        success: true,
        message: 'File parsed successfully',
        data: {
          filename: req.file.originalname,
          text: extractedText,
          length: extractedText.length
        }
      });

    } catch (parseError) {
      // Clean up the file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      logger.error('File parsing error:', parseError);
      
      res.status(400).json({
        success: false,
        message: 'Failed to parse file content',
        error: parseError.message
      });
    }

  } catch (error) {
    logger.error('Upload error:', error);
    
    // Clean up the file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Upload syllabus and generate study plan
router.post('/syllabus', auth, upload.array('files', 10), async (req, res) => {
  try {
    const { subject, level, duration, learningStyle } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    let combinedText = '';
    const processedFiles = [];

    // Process each uploaded file
    for (const file of req.files) {
      const filePath = file.path;
      const fileExt = path.extname(file.originalname).toLowerCase();
      let extractedText = '';

      try {
        switch (fileExt) {
          case '.doc':
          case '.docx':
            const docBuffer = fs.readFileSync(filePath);
            const docResult = await mammoth.extractRawText({ buffer: docBuffer });
            extractedText = docResult.value;
            break;

          case '.txt':
            extractedText = fs.readFileSync(filePath, 'utf8');
            break;

          default:
            logger.warn(`Unsupported file type: ${fileExt}`);
            continue;
        }

        combinedText += extractedText + '\n\n';
        processedFiles.push({
          filename: file.originalname,
          size: file.size,
          textLength: extractedText.length
        });

        // Clean up the file
        fs.unlinkSync(filePath);

      } catch (parseError) {
        logger.error(`Error parsing file ${file.originalname}:`, parseError);
        // Clean up the file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    if (!combinedText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'No text could be extracted from the uploaded files'
      });
    }

    // Import the study controller to create study plan
    const studyController = (await import('../controllers/studyController.js')).default;
    
    // Create a mock request object for the study plan creation
    const mockReq = {
      user: req.user,
      userId: req.user.id,
      body: {
        subject: subject || 'Uploaded Course Material',
        level,
        duration,
        learningStyle,
        goals: ['exam_prep', 'skill_building'],
        syllabusContent: combinedText.trim()
      }
    };

    const mockRes = {
      json: (data) => data,
      status: (code) => ({ json: (data) => ({ ...data, statusCode: code }) })
    };

    // Generate study plan using a different approach
    let studyPlanResult;
    try {
      // Create the study plan directly
      const StudyPlan = (await import('../models/StudyPlan.js')).default;
      const aiService = (await import('../services/aiService.js')).default;
      
      // Parse duration to number
      const durationMatch = duration.match(/(\d+)/);
      const durationInDays = durationMatch ? parseInt(durationMatch[1]) : 7;
      
      // Calculate schedule dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + durationInDays);

      // Generate AI content for the study plan
      let studyPlanData = {
        title: subject || 'Uploaded Course Material',
        subject: subject || 'Uploaded Course Material',
        difficulty: level,
        duration: durationInDays,
        learningStyle,
        goals: ['exam_prep', 'skill_building'],
        user: req.user.id,
        syllabus: combinedText.trim(),
        schedule: {
          startDate,
          endDate,
          studyDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          dailyStudyTime: 60
        },
        dailyContent: [],
        progress: {
          completedDays: 0,
          totalDays: durationInDays,
          percentage: 0,
          totalTimeSpent: 0
        },
        aiGenerated: true,
        status: 'ready'
      };

      // Try to generate AI content
      if (aiService && typeof aiService.generateStudyPlan === 'function') {
        try {
          const aiResult = await aiService.generateStudyPlan(
            subject || 'Uploaded Course Material',
            level,
            duration,
            learningStyle,
            combinedText.trim()
          );
          
          if (aiResult.success && Array.isArray(aiResult.content)) {
            studyPlanData.dailyContent = aiResult.content;
          }
        } catch (aiError) {
          logger.warn('AI generation failed, using basic structure:', aiError.message);
        }
      }

      // If no AI content, create basic structure
      if (studyPlanData.dailyContent.length === 0) {
        for (let i = 1; i <= durationInDays; i++) {
          studyPlanData.dailyContent.push({
            day: i,
            title: `Day ${i}: Study Session`,
            objectives: [`Learn key concepts from uploaded material`],
            syllabusSection: `Section ${i}`,
            keywords: ['study', 'learning', 'uploaded content'],
            content: {
              overview: `Day ${i} study session based on your uploaded content.`,
              keyPoints: [`Key point ${i} from uploaded material`],
              examples: [`Example ${i} from your content`],
              exercises: [`Exercise ${i} to practice concepts`],
              resources: []
            },
            isContentGenerated: false,
            status: 'not_started',
            timeSpent: 0
          });
        }
      }

      const studyPlan = new StudyPlan(studyPlanData);
      await studyPlan.save();
      
      logger.info(`Study plan created from uploaded files for user ${req.user.id}`);
      
      res.json({
        success: true,
        message: 'Files processed and study plan created successfully',
        data: {
          processedFiles,
          studyPlan: studyPlan,
          totalTextLength: combinedText.length
        }
      });
      
    } catch (studyPlanError) {
      logger.error('Error creating study plan:', studyPlanError);
      res.status(400).json({
        success: false,
        message: 'Failed to create study plan from uploaded content',
        error: studyPlanError.message
      });
    }

  } catch (error) {
    logger.error('Syllabus upload error:', error);
    
    // Clean up any remaining files on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;