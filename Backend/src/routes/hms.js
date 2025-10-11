import express from 'express';
import hmsService from '../services/hmsService.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Generate auth token for user to join room
router.post('/get-token', async (req, res) => {
  try {
    const { userId, roomId, role, userName } = req.body;

    if (!userId || !roomId) {
      return res.status(400).json({
        success: false,
        message: 'userId and roomId are required'
      });
    }

    const tokenResult = await hmsService.generateUserToken(
      roomId,
      userId,
      userName || 'User',
      role || 'guest'
    );

    if (tokenResult.success) {
      res.json({
        success: true,
        token: tokenResult.token,
        roomId: tokenResult.roomId,
        userId: tokenResult.userId,
        userName: tokenResult.userName,
        role: tokenResult.role
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to generate token'
      });
    }
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;