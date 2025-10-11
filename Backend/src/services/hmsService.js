import axios from 'axios';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

class HMSService {
  constructor() {
    this.appAccessKey = process.env.HMS_APP_ACCESS_KEY;
    this.appSecret = process.env.HMS_APP_SECRET;
    this.templateId = process.env.HMS_TEMPLATE_ID;
    this.baseURL = 'https://api.100ms.live/v2';
    this.initialized = false;
    this.initializationPromise = null;
  }

  async ensureInitialized() {
    if (!this.initializationPromise) {
      this.initializationPromise = this.initializeService();
    }
    return this.initializationPromise;
  }

  async initializeService() {
    try {
      // Get credentials from environment (fresh read)
      this.appAccessKey = process.env.HMS_APP_ACCESS_KEY;
      this.appSecret = process.env.HMS_APP_SECRET;
      this.templateId = process.env.HMS_TEMPLATE_ID;
      
      logger.info(`100ms API Key status: ${this.appAccessKey ? 'Present' : 'Missing'}`);
      
      if (!this.appAccessKey || !this.appSecret) {
        logger.warn('100ms credentials not found - using fallback mode');
        this.initialized = false;
        return false;
      }

      // Test the API by getting rooms list
      logger.info('Testing 100ms API connection...');
      const token = this.generateManagementToken();
      
      const response = await axios.get(`${this.baseURL}/rooms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: { limit: 1 }
      });

      if (response.status === 200) {
        this.initialized = true;
        logger.info('100ms API initialized successfully');
        logger.info(`Existing rooms: ${response.data.data?.length || 0}`);
        return true;
      }
    } catch (error) {
      logger.error('Failed to initialize 100ms service:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        logger.error('100ms API credentials are invalid');
      } else if (error.response?.status === 403) {
        logger.error('100ms API credentials do not have required permissions');
      }
      logger.warn('100ms integration disabled - using fallback mode');
      this.initialized = false;
      return false;
    }
  }

  generateManagementToken() {
    return jwt.sign(
      { access_key: this.appAccessKey },
      this.appSecret,
      { algorithm: 'HS256', expiresIn: '24h' }
    );
  }

  generateAuthToken(roomId, userId, role = 'guest') {
    return jwt.sign(
      {
        access_key: this.appAccessKey,
        room_id: roomId,
        user_id: userId,
        role: role,
        type: 'app'
      },
      this.appSecret,
      { algorithm: 'HS256', expiresIn: '24h' }
    );
  }

  async createRoom(roomData) {
    // Ensure service is initialized
    await this.ensureInitialized();
    
    // Always try to create a real room first
    if (!this.appAccessKey || !this.appSecret || this.appAccessKey === 'your_app_access_key_here') {
      logger.warn('100ms credentials not available, using fallback');
      return this.generateFallbackRoom(roomData);
    }

    try {
      const roomName = this.generateRoomName(roomData.title);
      const roomConfig = {
        name: roomName,
        description: roomData.description || 'Study session created from StudyAI'
        // Remove template_id if not provided to use default
      };

      // Only add template_id if it's provided and not empty
      if (this.templateId && this.templateId.trim() !== '') {
        roomConfig.template_id = this.templateId;
      }

      logger.info(`Creating 100ms room: ${roomName}`);
      
      const token = this.generateManagementToken();
      const response = await axios.post(`${this.baseURL}/rooms`, roomConfig, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const room = response.data;
      
      logger.info(`100ms room created successfully: ${room.id}`);

      return {
        success: true,
        roomUrl: `https://meet.jit.si/${room.id}`,
        roomName: room.name,
        roomId: room.id,
        meetingLink: `https://meet.jit.si/${room.id}`,
        meetingId: room.id,
        roomData: room,
        provider: 'jitsi-meet'
      };

    } catch (error) {
      logger.error('100ms room creation error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        logger.error('100ms API authentication failed - check your App Access Key and App Secret');
      } else if (error.response?.status === 403) {
        logger.error('100ms API permission denied');
      } else if (error.response?.status === 429) {
        logger.error('100ms API rate limit exceeded');
      }
      
      // Fall back to generated room
      logger.info('Falling back to generated room URL');
      return this.generateFallbackRoom(roomData);
    }
  }

  async createMeeting(meetingData) {
    return this.createRoom(meetingData);
  }

  async scheduleMeeting(meetingData) {
    // For scheduled meetings, we create the room but it will be available immediately
    // 100ms doesn't have built-in scheduling, so we handle this at the application level
    return this.createRoom({
      ...meetingData,
      scheduled: true
    });
  }

  async deleteRoom(roomId) {
    await this.ensureInitialized();
    
    if (!this.initialized) {
      return { success: true, message: 'Room deleted (fallback mode)' };
    }

    try {
      const token = this.generateManagementToken();
      await axios.post(`${this.baseURL}/rooms/${roomId}/disable`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      logger.info(`100ms room disabled: ${roomId}`);
      
      return {
        success: true,
        message: 'Room disabled successfully'
      };
    } catch (error) {
      logger.error('Disable room error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async endMeeting(roomId) {
    // 100ms rooms can be disabled to end them
    return this.deleteRoom(roomId);
  }

  async getRoomInfo(roomId) {
    await this.ensureInitialized();
    
    if (!this.initialized) {
      return {
        success: true,
        room: {
          id: roomId,
          name: `room-${roomId}`,
          enabled: true
        },
        fallback: true
      };
    }

    try {
      const token = this.generateManagementToken();
      const response = await axios.get(`${this.baseURL}/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      return {
        success: true,
        room: response.data
      };
    } catch (error) {
      logger.error('Get room info error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getMeetingInfo(meetingId) {
    return this.getRoomInfo(meetingId);
  }

  generateRoomName(title) {
    // Simple room name generation
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 6);
    const safeName = title ? title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20) : 'study-room';
    return `${safeName}-${timestamp}-${randomId}`;
  }

  generateFallbackRoom(roomData) {
    // Generate a simple room ID for fallback using StudyAI prefix
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 6);
    const roomId = `StudyAI-${timestamp}-${randomId}`;
    
    // Use Jitsi Meet as a reliable, free video conferencing solution
    const roomUrl = `https://meet.jit.si/${roomId}`;
    
    logger.info(`Generated Jitsi meeting room: ${roomUrl}`);
    
    return {
      success: true,
      roomUrl,
      roomName: roomId,
      roomId: roomId,
      meetingLink: roomUrl,
      meetingId: roomId,
      fallback: true,
      provider: 'jitsi-meet',
      message: 'Meeting room created with Jitsi Meet - professional video conferencing',
      instructions: 'Click "Join Meeting" to open the video conference in a new tab'
    };
  }

  // Generate auth token for a user to join a room
  async generateUserToken(roomId, userId, userName, role = 'guest') {
    const token = this.generateAuthToken(roomId, userId, role);
    
    return {
      success: true,
      token: token,
      roomId: roomId,
      userId: userId,
      userName: userName,
      role: role
    };
  }

  isValidRoomUrl(url) {
    const hmsRegex = /^https:\/\/.*\.100ms\.live\/meeting\/[a-zA-Z0-9-]+$/;
    const fallbackRegex = /^#hms-room-/;
    return hmsRegex.test(url) || fallbackRegex.test(url);
  }

  extractRoomId(url) {
    if (url.startsWith('#hms-room-')) {
      return url.replace('#hms-room-', '');
    }
    
    const match = url.match(/\/meeting\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }
}

export default new HMSService();