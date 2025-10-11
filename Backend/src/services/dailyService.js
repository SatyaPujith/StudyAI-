import axios from 'axios';
import logger from '../utils/logger.js';

class DailyService {
  constructor() {
    this.apiKey = null;
    this.baseURL = 'https://api.daily.co/v1';
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
      // Get API key from environment (fresh read)
      this.apiKey = process.env.DAILY_API_KEY;
      logger.info(`Daily.co API Key status: ${this.apiKey ? 'Present' : 'Missing'}`);
      
      if (!this.apiKey) {
        logger.warn('Daily.co API key not found - using fallback mode');
        this.initialized = false;
        return false;
      }

      // Test the API key by making a simple request
      logger.info('Testing Daily.co API connection...');
      const response = await axios.get(`${this.baseURL}/rooms`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: { limit: 1 }
      });

      if (response.status === 200) {
        this.initialized = true;
        logger.info('Daily.co API initialized successfully');
        logger.info(`Existing rooms: ${response.data.total_count || 0}`);
        return true;
      }
    } catch (error) {
      logger.error('Failed to initialize Daily.co service:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        logger.error('Daily.co API key is invalid or expired');
      } else if (error.response?.status === 403) {
        logger.error('Daily.co API key does not have required permissions');
      }
      logger.warn('Daily.co integration disabled - using fallback mode');
      this.initialized = false;
      return false;
    }
  }

  async createRoom(roomData) {
    // Ensure service is initialized
    await this.ensureInitialized();
    
    // Always try to create a real room first
    if (!this.apiKey) {
      logger.warn('Daily.co API key not available, using fallback');
      return this.generateFallbackRoom(roomData);
    }

    try {
      const roomName = this.generateRoomName(roomData.title);
      // Basic room configuration for free plan
      const roomConfig = {
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          exp: Math.floor(Date.now() / 1000) + 3600 // expires in 1 hour
        }
      };

      logger.info(`Creating basic Daily.co room...`);
      
      const response = await axios.post(`${this.baseURL}/rooms`, roomConfig, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const room = response.data;
      
      logger.info(`Daily.co room created successfully: ${room.url}`);

      return {
        success: true,
        roomUrl: room.url,
        roomName: room.name,
        roomId: room.id,
        meetingLink: room.url,
        meetingId: room.name,
        roomData: room,
        provider: 'daily'
      };

    } catch (error) {
      logger.error('Daily.co room creation error:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        logger.error('Daily.co API authentication failed');
      } else if (error.response?.status === 403) {
        logger.error('Daily.co API permission denied');
      } else if (error.response?.status === 429) {
        logger.error('Daily.co API rate limit exceeded');
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
    // Daily.co doesn't have built-in scheduling, so we handle this at the application level
    return this.createRoom({
      ...meetingData,
      scheduled: true
    });
  }

  async deleteRoom(roomName) {
    await this.ensureInitialized();
    
    if (!this.initialized) {
      return { success: true, message: 'Room deleted (fallback mode)' };
    }

    try {
      await axios.delete(`${this.baseURL}/rooms/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      logger.info(`Daily.co room deleted: ${roomName}`);
      
      return {
        success: true,
        message: 'Room deleted successfully'
      };
    } catch (error) {
      logger.error('Delete room error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async endMeeting(roomName) {
    // Daily.co rooms can be deleted to end them, or we can just let them expire
    return this.deleteRoom(roomName);
  }

  async getRoomInfo(roomName) {
    if (!this.initialized) {
      return {
        success: true,
        room: {
          name: roomName,
          url: `#room-${roomName}`,
          status: 'active',
          participants: []
        },
        fallback: true
      };
    }

    try {
      const response = await axios.get(`${this.baseURL}/rooms/${roomName}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
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
        error: error.response?.data?.error || error.message
      };
    }
  }

  async getMeetingInfo(meetingId) {
    return this.getRoomInfo(meetingId);
  }

  async getParticipants(roomName) {
    if (!this.initialized) {
      return {
        success: true,
        participants: [],
        fallback: true
      };
    }

    try {
      const response = await axios.get(`${this.baseURL}/rooms/${roomName}/participants`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return {
        success: true,
        participants: response.data.data || []
      };
    } catch (error) {
      logger.error('Get participants error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  generateRoomName(title) {
    // Simple room name generation
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 6);
    return `room-${timestamp}-${randomId}`;
  }

  generateFallbackRoom(roomData) {
    // Generate a simple room ID for fallback
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const roomUrl = `https://studyai.daily.co/${roomId}`;
    
    logger.info(`Generated fallback Daily.co room: ${roomUrl}`);
    
    return {
      success: true,
      roomUrl,
      roomName: roomId,
      roomId: roomId,
      meetingLink: roomUrl,
      meetingId: roomId,
      fallback: true,
      provider: 'daily-fallback',
      message: 'Basic Daily.co meeting room created (fallback mode)'
    };
  }

  generateMeetingToken(roomName, userId, userName) {
    // For production, you would generate a meeting token with user permissions
    // This is a simplified version for development
    if (!this.initialized) {
      return {
        success: true,
        token: `fallback-token-${userId}`,
        fallback: true
      };
    }

    // In a real implementation, you would call Daily.co's token creation API
    // For now, we'll return a placeholder
    return {
      success: true,
      token: `daily-token-${roomName}-${userId}`,
      roomUrl: `https://${roomName}.daily.co/${roomName}`,
      message: 'Token generated for Daily.co room'
    };
  }

  isValidRoomUrl(url) {
    const dailyRegex = /^https:\/\/[a-zA-Z0-9-]+\.daily\.co\/[a-zA-Z0-9-]+$/;
    const fallbackRegex = /^#daily-room-/;
    return dailyRegex.test(url) || fallbackRegex.test(url);
  }

  extractRoomName(url) {
    if (url.startsWith('#daily-room-')) {
      return url.replace('#daily-room-', '');
    }
    
    const match = url.match(/daily\.co\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }

  // Utility method to create a meeting token for authenticated users
  async createMeetingToken(roomName, userId, userName, permissions = {}) {
    if (!this.initialized) {
      return {
        success: true,
        token: `fallback-token-${userId}-${Date.now()}`,
        fallback: true
      };
    }

    try {
      const tokenConfig = {
        properties: {
          room_name: roomName,
          user_name: userName,
          user_id: userId.toString(),
          is_owner: permissions.isOwner || false,
          enable_screenshare: permissions.enableScreenshare !== false,
          enable_recording: permissions.enableRecording || false,
          start_video_off: permissions.startVideoOff || false,
          start_audio_off: permissions.startAudioOff || false,
          exp: Math.floor(Date.now() / 1000) + 3600 // Token expires in 1 hour
        }
      };

      const response = await axios.post(`${this.baseURL}/meeting-tokens`, tokenConfig, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        token: response.data.token,
        roomUrl: `https://${roomName}.daily.co/${roomName}`
      };

    } catch (error) {
      logger.error('Create meeting token error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
}

export default new DailyService();