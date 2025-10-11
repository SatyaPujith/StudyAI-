import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User.js';
import logger from '../utils/logger.js';

class AuthController {
  // Register new user
  async register(req, res) {
    try {
      logger.info('Registration attempt:', { body: req.body });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { firstName, lastName, email, password } = req.body;
      logger.info('Creating user with:', { firstName, lastName, email });

      // Check if user already exists
      logger.info('Checking for existing user...');
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        logger.info('User already exists');
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        });
      }

      // Create new user
      logger.info('Creating new user...');
      const user = new User({
        firstName,
        lastName,
        email,
        password
      });

      logger.info('Saving user to database...');
      await user.save();
      logger.info('User saved successfully');

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id,
          email: user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      logger.info('Registration successful');
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user._id,
          email: user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { firstName, lastName, preferences } = req.body;
      
      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (preferences) updateData.preferences = preferences;

      const user = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          preferences: user.preferences,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Find user
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      
      // Import models dynamically to avoid circular dependencies
      const UserProgress = (await import('../models/UserProgress.js')).default;
      const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
      const userProgress = await UserProgress.find({ userId }).sort({ createdAt: -1 });
      
      // Get quiz attempts
      const quizAttempts = await QuizAttempt.find({ userId }).sort({ createdAt: -1 });
      
      // Calculate statistics
      const totalStudyTime = userProgress.reduce((total, progress) => {
        return total + (progress.timeSpent || 0);
      }, 0);
      
      const topicsCompleted = userProgress.filter(p => p.completed).length;
      
      const quizzesCompleted = quizAttempts.length;
      
      const averageScore = quizAttempts.length > 0 
        ? Math.round(quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / quizAttempts.length)
        : 0;
      
      // Calculate study streak (consecutive days with activity)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let studyStreak = 0;
      let currentDate = new Date(today);
      
      while (studyStreak < 30) { // Max 30 days to prevent infinite loop
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const hasActivity = userProgress.some(p => {
          const progressDate = new Date(p.createdAt);
          return progressDate >= dayStart && progressDate <= dayEnd;
        }) || quizAttempts.some(q => {
          const quizDate = new Date(q.createdAt);
          return quizDate >= dayStart && quizDate <= dayEnd;
        });
        
        if (hasActivity) {
          studyStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
      
      // Calculate weekly progress (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weeklyProgress = userProgress
        .filter(p => new Date(p.createdAt) >= weekAgo)
        .reduce((total, progress) => total + (progress.timeSpent || 0), 0);
      
      const totalSessions = userProgress.length + quizAttempts.length;
      
      const lastActivity = [...userProgress, ...quizAttempts]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      
      const stats = {
        totalStudyTime: Math.round(totalStudyTime), // in minutes
        topicsCompleted,
        quizzesCompleted,
        averageScore,
        studyStreak,
        weeklyGoal: 300, // 5 hours in minutes
        weeklyProgress: Math.round(weeklyProgress),
        totalSessions,
        lastStudyDate: lastActivity ? lastActivity.createdAt : null
      };
      
      logger.info('User stats calculated:', { userId, stats });
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      logger.error('Error getting user stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user statistics'
      });
    }
  }

  // Export user data
  async exportUserData(req, res) {
    try {
      const userId = req.user.id;
      
      // Import models dynamically
      const UserProgress = (await import('../models/UserProgress.js')).default;
      const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
      const StudyGroup = (await import('../models/StudyGroup.js')).default;
      
      // Get user data
      const user = await User.findById(userId).select('-password');
      const userProgress = await UserProgress.find({ userId });
      const quizAttempts = await QuizAttempt.find({ userId });
      const studyGroups = await StudyGroup.find({ 
        $or: [
          { creatorId: userId },
          { members: userId }
        ]
      });
      
      const exportData = {
        user,
        progress: userProgress,
        quizAttempts,
        studyGroups,
        exportDate: new Date().toISOString()
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="study-data-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
      
    } catch (error) {
      logger.error('Error exporting user data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export user data'
      });
    }
  }

  // Delete account
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;
      
      // Import models dynamically
      const UserProgress = (await import('../models/UserProgress.js')).default;
      const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
      const StudyGroup = (await import('../models/StudyGroup.js')).default;
      
      // Delete all user data
      await Promise.all([
        User.findByIdAndDelete(userId),
        UserProgress.deleteMany({ userId }),
        QuizAttempt.deleteMany({ userId }),
        StudyGroup.deleteMany({ creatorId: userId }),
        StudyGroup.updateMany(
          { members: userId },
          { $pull: { members: userId } }
        )
      ]);
      
      logger.info('User account deleted:', { userId });
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
      
    } catch (error) {
      logger.error('Error deleting account:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account'
      });
    }
  }
}

export default new AuthController();