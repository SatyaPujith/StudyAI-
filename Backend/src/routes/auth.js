import express from 'express';
import { body } from 'express-validator';
import authController from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], authController.register);

// Login
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], authController.login);

// Get profile (protected)
router.get('/profile', auth, authController.getProfile);

// Update profile (protected)
router.put('/profile', auth, authController.updateProfile);

// Change password (protected)
router.put('/change-password', auth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], authController.changePassword);

// Get user statistics (protected)
router.get('/stats', auth, authController.getUserStats);

// Export user data (protected)
router.get('/export-data', auth, authController.exportUserData);

// Delete account (protected)
router.delete('/delete-account', auth, authController.deleteAccount);

export default router;