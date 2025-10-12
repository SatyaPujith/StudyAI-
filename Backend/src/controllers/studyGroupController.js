import { v4 as uuidv4 } from 'uuid';
import StudyGroup from '../models/StudyGroup.js';
import hmsService from '../services/hmsService.js';
import logger from '../utils/logger.js';

class StudyGroupController {
  // Create study group
  async createStudyGroup(req, res) {
    try {
      const { name, description, subject, isPublic = true, maxMembers = 50, tags } = req.body;

      if (!name || !subject) {
        return res.status(400).json({
          success: false,
          message: 'Name and subject are required'
        });
      }

      // Generate access code for private groups using UUID
      const accessCode = !isPublic ? uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase() : undefined;
      
      logger.info(`Creating study group: ${name}, isPublic: ${isPublic}, accessCode: ${accessCode || 'N/A'}`);

      const studyGroup = new StudyGroup({
        name,
        description,
        subject,
        creator: req.userId,
        members: [{
          user: req.userId,
          role: 'admin'
        }],
        maxMembers,
        isPublic,
        accessCode,
        tags: tags || []
      });

      await studyGroup.save();

      // Populate creator info
      await studyGroup.populate('creator', 'firstName lastName');
      await studyGroup.populate('members.user', 'firstName lastName');

      logger.info(`Study group created: ${name} by user ${req.userId}, Public: ${isPublic}, Access Code: ${studyGroup.accessCode || 'N/A'}`);

      res.status(201).json({
        success: true,
        message: isPublic ? 'Public study group created successfully' : `Private study group created with access code: ${studyGroup.accessCode}`,
        studyGroup
      });
    } catch (error) {
      logger.error('Create study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get study groups
  async getStudyGroups(req, res) {
    try {
      const { subject, search } = req.query;
      const filter = { status: 'active' };

      // Include both public groups and groups where user is a member
      const userGroups = await StudyGroup.find({
        'members.user': req.userId
      }).select('_id');
      
      const userGroupIds = userGroups.map(g => g._id);
      
      filter.$or = [
        { isPublic: true },
        { _id: { $in: userGroupIds } }
      ];

      if (subject) filter.subject = new RegExp(subject, 'i');
      if (search) {
        const searchFilter = [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
        
        if (filter.$or) {
          filter.$and = [
            { $or: filter.$or },
            { $or: searchFilter }
          ];
          delete filter.$or;
        } else {
          filter.$or = searchFilter;
        }
      }

      const studyGroups = await StudyGroup.find(filter)
        .populate('creator', 'firstName lastName')
        .populate('members.user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(50);

      // Transform meetings to sessions for frontend compatibility
      const transformedGroups = studyGroups.map(group => {
        const groupObj = group.toObject();
        groupObj.sessions = groupObj.meetings || [];
        return groupObj;
      });

      res.json({
        success: true,
        groups: transformedGroups, // Changed from studyGroups to groups
        studyGroups: transformedGroups // Keep both for compatibility
      });
    } catch (error) {
      logger.error('Get study groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get user's study groups
  async getUserStudyGroups(req, res) {
    try {
      const studyGroups = await StudyGroup.find({
        'members.user': req.userId
      })
        .populate('creator', 'firstName lastName')
        .populate('members.user', 'firstName lastName')
        .sort({ createdAt: -1 });

      // Transform meetings to sessions for frontend compatibility
      const transformedGroups = studyGroups.map(group => {
        const groupObj = group.toObject();
        groupObj.sessions = groupObj.meetings || [];
        return groupObj;
      });

      res.json({
        success: true,
        groups: transformedGroups, // Changed from studyGroups to groups
        studyGroups: transformedGroups // Keep both for compatibility
      });
    } catch (error) {
      logger.error('Get user study groups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Join study group by access code
  async joinStudyGroupByCode(req, res) {
    try {
      const { accessCode } = req.body;

      if (!accessCode) {
        return res.status(400).json({
          success: false,
          message: 'Access code is required'
        });
      }

      const studyGroup = await StudyGroup.findOne({ accessCode });

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found with the provided access code'
        });
      }

      // Add member
      await studyGroup.addMember(req.userId);

      await studyGroup.populate('creator', 'firstName lastName');
      await studyGroup.populate('members.user', 'firstName lastName');

      logger.info(`User ${req.userId} joined study group ${studyGroup._id} via access code ${accessCode}`);

      res.json({
        success: true,
        message: 'Successfully joined the study group',
        studyGroup
      });
    } catch (error) {
      logger.error('Join study group by code error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Join public study group
  async joinStudyGroup(req, res) {
    try {
      const { id } = req.params;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      if (!studyGroup.isPublic) {
        return res.status(403).json({
          success: false,
          message: 'This is a private group. You need an access code to join.'
        });
      }

      // Add member
      await studyGroup.addMember(req.userId);

      await studyGroup.populate('creator', 'firstName lastName');
      await studyGroup.populate('members.user', 'firstName lastName');

      logger.info(`User ${req.userId} joined public study group ${id}`);

      res.json({
        success: true,
        message: 'Successfully joined the study group',
        studyGroup
      });
    } catch (error) {
      logger.error('Join study group error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  // Leave study group
  async leaveStudyGroup(req, res) {
    try {
      const { id } = req.params;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is a member
      if (!studyGroup.isMember(req.userId)) {
        return res.status(400).json({
          success: false,
          message: 'You are not a member of this group'
        });
      }

      // Check if user is the creator
      if (studyGroup.creator.toString() === req.userId) {
        return res.status(400).json({
          success: false,
          message: 'Group creator cannot leave. Transfer ownership or delete the group.'
        });
      }

      // Remove member
      await studyGroup.removeMember(req.userId);

      logger.info(`User ${req.userId} left study group ${id}`);

      res.json({
        success: true,
        message: 'Successfully left the study group'
      });
    } catch (error) {
      logger.error('Leave study group error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Schedule meeting
  async scheduleMeeting(req, res) {
    try {
      const { id } = req.params;
      const { title, description, scheduledAt, duration } = req.body;

      logger.info('Schedule meeting request:', { 
        groupId: id, 
        title, 
        scheduledAt, 
        params: req.params, 
        url: req.url 
      });

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Group ID is required'
        });
      }

      if (!title || !scheduledAt) {
        return res.status(400).json({
          success: false,
          message: 'Title and scheduled time are required'
        });
      }

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is creator or admin
      const isCreator = studyGroup.creator.toString() === req.userId;
      const isAdmin = studyGroup.members.some(member => 
        member.user.toString() === req.userId && member.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the group creator or admins can schedule meetings'
        });
      }

      // Create 100ms meeting room
      logger.info(`Creating 100ms meeting room for: ${title}`);
      const meetingResult = await hmsService.createRoom({
        title,
        description,
        duration: duration || 60,
        maxParticipants: studyGroup.maxMembers || 50,
        scheduledAt: new Date(scheduledAt)
      });

      // Schedule the meeting
      await studyGroup.scheduleMeeting({
        title,
        description,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60
      }, req.userId);

      // Update the latest meeting with 100ms details
      const latestMeeting = studyGroup.meetings[studyGroup.meetings.length - 1];
      latestMeeting.meetingLink = meetingResult.roomUrl;
      latestMeeting.meetingId = meetingResult.roomId;
      latestMeeting.roomId = meetingResult.roomId;

      await studyGroup.save();

      // Notify all group members
      if (req.io) {
        req.io.to(`study-group-${id}`).emit('meeting-scheduled', {
          groupId: id,
          meeting: latestMeeting,
          meetingLink: meetingResult.roomUrl,
          roomUrl: meetingResult.roomUrl,
          provider: '100ms'
        });
      }

      logger.info(`Meeting scheduled successfully with 100ms: ${meetingResult.roomUrl}`);

      res.json({
        success: true,
        message: 'Meeting scheduled successfully with 100ms',
        meeting: latestMeeting,
        meetingLink: meetingResult.roomUrl,
        roomUrl: meetingResult.roomUrl,
        provider: '100ms'
      });
    } catch (error) {
      logger.error('Schedule meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Start instant meeting
  async startInstantMeeting(req, res) {
    try {
      const { id } = req.params;
      const { title, description, duration } = req.body;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is creator or admin
      const isCreator = studyGroup.creator.toString() === req.userId;
      const isAdmin = studyGroup.members.some(member => 
        member.user.toString() === req.userId && member.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the group creator or admins can start meetings'
        });
      }

      // Create 100ms meeting room
      const meetingResult = await hmsService.createRoom({
        title: title || `${studyGroup.name} - Instant Meeting`,
        description: description || 'Instant study group meeting',
        duration: duration || 60,
        maxParticipants: studyGroup.maxMembers || 50
      });

      // Create meeting
      await studyGroup.scheduleMeeting({
        title: title || `${studyGroup.name} - Instant Meeting`,
        description: description || 'Instant study group meeting',
        scheduledAt: new Date(),
        duration: duration || 60
      }, req.userId);

      // Update the latest meeting and start it
      const latestMeeting = studyGroup.meetings[studyGroup.meetings.length - 1];
      latestMeeting.meetingLink = meetingResult.roomUrl;
      latestMeeting.meetingId = meetingResult.roomId;
      latestMeeting.roomId = meetingResult.roomId;
      await studyGroup.startMeeting(latestMeeting._id, meetingResult.roomUrl, meetingResult.roomId);

      // Notify all group members
      if (req.io) {
        req.io.to(`study-group-${id}`).emit('instant-meeting-started', {
          groupId: id,
          meeting: latestMeeting,
          meetingLink: meetingResult.roomUrl,
          roomUrl: meetingResult.roomUrl,
          provider: '100ms'
        });
      }

      logger.info(`Instant meeting started for group ${id}: ${meetingResult.roomUrl}`);

      res.json({
        success: true,
        message: 'Instant meeting started successfully',
        meeting: latestMeeting,
        meetingLink: meetingResult.roomUrl,
        roomUrl: meetingResult.roomUrl,
        provider: '100ms'
      });
    } catch (error) {
      logger.error('Start instant meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Join meeting
  async joinMeeting(req, res) {
    try {
      const { id, meetingId } = req.params;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is a member
      if (!studyGroup.isMember(req.userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to join meetings'
        });
      }

      await studyGroup.joinMeeting(meetingId, req.userId);

      const meeting = studyGroup.meetings.id(meetingId);

      // Notify other participants
      if (req.io) {
        req.io.to(`study-group-${id}`).emit('user-joined-meeting', {
          userId: req.userId,
          meetingId,
          groupId: id
        });
      }

      res.json({
        success: true,
        message: 'Joined meeting successfully',
        meetingLink: meeting.meetingLink,
        meeting
      });
    } catch (error) {
      logger.error('Join meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // End meeting
  async endMeeting(req, res) {
    try {
      const { id, meetingId } = req.params;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Only group creator can end meetings
      if (studyGroup.creator.toString() !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the group creator can end meetings'
        });
      }

      const meeting = studyGroup.meetings.id(meetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // End 100ms meeting room if it exists
      if (meeting.meetingId) {
        try {
          await hmsService.deleteRoom(meeting.meetingId);
          logger.info(`100ms room ${meeting.meetingId} disabled`);
        } catch (meetError) {
          logger.error('Error disabling 100ms room:', meetError);
        }
      }

      await studyGroup.endMeeting(meetingId);

      // Notify participants
      if (req.io) {
        req.io.to(`study-group-${id}`).emit('meeting-ended', { 
          groupId: id, 
          meetingId 
        });
      }

      res.json({
        success: true,
        message: 'Meeting ended successfully',
        meeting: studyGroup.meetings.id(meetingId)
      });
    } catch (error) {
      logger.error('End meeting error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get real-time meeting status
  async getMeetingStatus(req, res) {
    try {
      const { id, meetingId } = req.params;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Update meeting statuses based on current time
      await studyGroup.updateMeetingStatuses();

      const meetingStatus = studyGroup.getCurrentMeetingStatus(meetingId);

      if (!meetingStatus) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      const meeting = studyGroup.meetings.id(meetingId);

      res.json({
        success: true,
        meeting: {
          id: meeting._id,
          title: meeting.title,
          scheduledAt: meeting.scheduledAt,
          duration: meeting.duration,
          meetingLink: meeting.meetingLink,
          attendeeCount: meeting.attendees.length
        },
        status: meetingStatus
      });
    } catch (error) {
      logger.error('Get meeting status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Start meeting manually
  async startMeetingManually(req, res) {
    try {
      const { id, meetingId } = req.params;

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is creator or admin
      const isCreator = studyGroup.creator.toString() === req.userId;
      const isAdmin = studyGroup.members.some(member => 
        member.user.toString() === req.userId && member.role === 'admin'
      );

      if (!isCreator && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only the group creator or admins can start meetings'
        });
      }

      const meeting = studyGroup.meetings.id(meetingId);
      if (!meeting) {
        return res.status(404).json({
          success: false,
          message: 'Meeting not found'
        });
      }

      // Start the meeting
      meeting.status = 'active';
      meeting.isLive = true;
      meeting.actualStartTime = new Date();

      await studyGroup.save();

      // Notify all group members
      if (req.io) {
        req.io.to(`study-group-${id}`).emit('meeting-started', {
          groupId: id,
          meetingId,
          startTime: meeting.actualStartTime,
          meetingLink: meeting.meetingLink,
          roomUrl: meeting.meetingLink,
          provider: '100ms'
        });
      }

      logger.info(`Meeting ${meetingId} started manually by user ${req.userId}`);

      res.json({
        success: true,
        message: 'Meeting started successfully',
        meeting: {
          id: meeting._id,
          status: meeting.status,
          isLive: meeting.isLive,
          actualStartTime: meeting.actualStartTime,
          meetingLink: meeting.meetingLink
        }
      });
    } catch (error) {
      logger.error('Start meeting manually error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Send chat message
  async sendChatMessage(req, res) {
    try {
      const { id } = req.params;
      const { content, type = 'text' } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      const studyGroup = await StudyGroup.findById(id);

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is a member
      if (!studyGroup.isMember(req.userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to send messages'
        });
      }

      await studyGroup.addMessage(req.userId, content.trim(), type);

      // Get the latest message with user info
      await studyGroup.populate('messages.sender', 'firstName lastName');
      const latestMessage = studyGroup.messages[studyGroup.messages.length - 1];

      // Emit to all group members
      if (req.io) {
        req.io.to(`study-group-${id}`).emit('new-message', {
          groupId: id,
          message: latestMessage
        });
      }

      res.json({
        success: true,
        message: latestMessage
      });
    } catch (error) {
      logger.error('Send chat message error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get chat messages
  async getChatMessages(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, before } = req.query;

      const studyGroup = await StudyGroup.findById(id)
        .populate('messages.sender', 'firstName lastName');

      if (!studyGroup) {
        return res.status(404).json({
          success: false,
          message: 'Study group not found'
        });
      }

      // Check if user is a member
      if (!studyGroup.isMember(req.userId)) {
        return res.status(403).json({
          success: false,
          message: 'You must be a member to view messages'
        });
      }

      let messages = studyGroup.messages;

      // Filter messages before a certain date if specified
      if (before) {
        messages = messages.filter(msg => msg.timestamp < new Date(before));
      }

      // Get latest messages
      messages = messages.slice(-limit);

      res.json({
        success: true,
        messages
      });
    } catch (error) {
      logger.error('Get chat messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Helper method to generate access code
  generateAccessCode() {
    return uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  }
}

export default new StudyGroupController();