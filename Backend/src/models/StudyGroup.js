import mongoose from 'mongoose';

const studyGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Study group name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Members management
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  maxMembers: {
    type: Number,
    default: 50,
    min: [2, 'Group must allow at least 2 members'],
    max: [100, 'Group cannot exceed 100 members']
  },
  
  // Group visibility and access
  isPublic: {
    type: Boolean,
    default: true
  },
  accessCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    default: function() {
      // Generate a unique access code only for private groups
      return this.isPublic ? undefined : Math.random().toString(36).substring(2, 8).toUpperCase();
    }
  },
  
  // Meetings/Sessions
  meetings: [{
    title: {
      type: String,
      required: true
    },
    description: String,
    scheduledAt: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // in minutes
      default: 60
    },
    meetingLink: String, // Google Meet link
    meetingId: String, // Google Meet meeting ID
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled', 'waiting'],
      default: 'scheduled'
    },
    actualStartTime: Date, // When the meeting actually started
    actualEndTime: Date, // When the meeting actually ended
    isLive: {
      type: Boolean,
      default: false
    },
    attendees: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      joinedAt: Date,
      leftAt: Date,
      duration: Number // in minutes
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Chat functionality
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    type: {
      type: String,
      enum: ['text', 'file', 'image', 'system'],
      default: 'text'
    },
    attachments: [{
      filename: String,
      url: String,
      size: Number,
      mimeType: String
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date
  }],
  
  tags: [String],
  
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
studyGroupSchema.index({ creator: 1 });
studyGroupSchema.index({ subject: 1, isPublic: 1 });
studyGroupSchema.index({ accessCode: 1 });
studyGroupSchema.index({ 'meetings.scheduledAt': 1, status: 1 });

// Virtual for member count
studyGroupSchema.virtual('memberCount').get(function() {
  return this.members.length;
});

// Methods
studyGroupSchema.methods.addMember = function(userId, role = 'member') {
  if (this.members.length >= this.maxMembers) {
    throw new Error('Study group is full');
  }
  
  const existingMember = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a member');
  }
  
  this.members.push({
    user: userId,
    role,
    joinedAt: new Date()
  });
  
  return this.save();
};

studyGroupSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(member => 
    member.user.toString() !== userId.toString()
  );
  
  return this.save();
};

studyGroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString()
  );
};

studyGroupSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString()
  );
  return member ? member.role : null;
};

studyGroupSchema.methods.scheduleMeeting = function(meetingData, creatorId) {
  const meeting = {
    title: meetingData.title,
    description: meetingData.description,
    scheduledAt: meetingData.scheduledAt,
    duration: meetingData.duration || 60,
    status: 'scheduled',
    createdBy: creatorId,
    attendees: []
  };
  
  this.meetings.push(meeting);
  return this.save();
};

studyGroupSchema.methods.startMeeting = function(meetingId, meetingLink, googleMeetId) {
  const meeting = this.meetings.id(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }
  
  meeting.status = 'active';
  meeting.meetingLink = meetingLink;
  meeting.meetingId = googleMeetId;
  
  return this.save();
};

studyGroupSchema.methods.endMeeting = function(meetingId) {
  const meeting = this.meetings.id(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }
  
  meeting.status = 'completed';
  
  // Calculate duration for attendees
  meeting.attendees.forEach(attendee => {
    if (attendee.joinedAt && !attendee.leftAt) {
      attendee.leftAt = new Date();
    }
    if (attendee.joinedAt && attendee.leftAt) {
      attendee.duration = Math.round((attendee.leftAt - attendee.joinedAt) / (1000 * 60));
    }
  });
  
  return this.save();
};

studyGroupSchema.methods.joinMeeting = function(meetingId, userId) {
  const meeting = this.meetings.id(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }
  
  const existingAttendee = meeting.attendees.find(a => a.user.toString() === userId.toString());
  if (!existingAttendee) {
    meeting.attendees.push({
      user: userId,
      joinedAt: new Date()
    });
  }
  
  return this.save();
};

studyGroupSchema.methods.leaveMeeting = function(meetingId, userId) {
  const meeting = this.meetings.id(meetingId);
  if (!meeting) {
    throw new Error('Meeting not found');
  }
  
  const attendee = meeting.attendees.find(a => a.user.toString() === userId.toString());
  if (attendee && !attendee.leftAt) {
    attendee.leftAt = new Date();
    if (attendee.joinedAt) {
      attendee.duration = Math.round((attendee.leftAt - attendee.joinedAt) / (1000 * 60));
    }
  }
  
  return this.save();
};

// Get current meeting status based on time
studyGroupSchema.methods.getCurrentMeetingStatus = function(meetingId) {
  const meeting = this.meetings.id(meetingId);
  if (!meeting) return null;
  
  const now = new Date();
  const scheduledStart = new Date(meeting.scheduledAt);
  const scheduledEnd = new Date(scheduledStart.getTime() + (meeting.duration * 60 * 1000));
  
  // If manually started/ended, use actual times
  if (meeting.actualStartTime && meeting.actualEndTime) {
    return {
      status: 'completed',
      canJoin: false,
      timeStatus: 'Meeting ended',
      actualDuration: Math.round((meeting.actualEndTime - meeting.actualStartTime) / (1000 * 60))
    };
  }
  
  if (meeting.actualStartTime && !meeting.actualEndTime) {
    return {
      status: 'active',
      canJoin: true,
      timeStatus: `Meeting started at ${meeting.actualStartTime.toLocaleTimeString()}`,
      isLive: true
    };
  }
  
  // Time-based status
  if (now < scheduledStart) {
    const timeUntil = Math.round((scheduledStart - now) / (1000 * 60));
    return {
      status: 'waiting',
      canJoin: false,
      timeStatus: `Starts in ${timeUntil} minutes`,
      scheduledStart: scheduledStart
    };
  }
  
  if (now >= scheduledStart && now <= scheduledEnd) {
    return {
      status: 'active',
      canJoin: true,
      timeStatus: `Meeting in progress (started at ${scheduledStart.toLocaleTimeString()})`,
      isLive: true
    };
  }
  
  if (now > scheduledEnd) {
    return {
      status: 'completed',
      canJoin: false,
      timeStatus: 'Meeting ended',
      endedAt: scheduledEnd
    };
  }
  
  return {
    status: 'scheduled',
    canJoin: false,
    timeStatus: 'Scheduled'
  };
};

// Auto-update meeting status based on time
studyGroupSchema.methods.updateMeetingStatuses = function() {
  const now = new Date();
  let updated = false;
  
  this.meetings.forEach(meeting => {
    const scheduledStart = new Date(meeting.scheduledAt);
    const scheduledEnd = new Date(scheduledStart.getTime() + (meeting.duration * 60 * 1000));
    
    // Auto-start meetings that should be active
    if (meeting.status === 'scheduled' && now >= scheduledStart && now <= scheduledEnd) {
      meeting.status = 'active';
      meeting.isLive = true;
      if (!meeting.actualStartTime) {
        meeting.actualStartTime = scheduledStart;
      }
      updated = true;
    }
    
    // Auto-end meetings that have passed their duration
    if (meeting.status === 'active' && now > scheduledEnd && !meeting.actualEndTime) {
      meeting.status = 'completed';
      meeting.isLive = false;
      meeting.actualEndTime = scheduledEnd;
      updated = true;
    }
  });
  
  if (updated) {
    return this.save();
  }
  return Promise.resolve(this);
};

studyGroupSchema.methods.addMessage = function(senderId, content, type = 'text', attachments = []) {
  const message = {
    sender: senderId,
    content,
    type,
    attachments,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  
  // Keep only last 1000 messages
  if (this.messages.length > 1000) {
    this.messages = this.messages.slice(-1000);
  }
  
  return this.save();
};

export default mongoose.model('StudyGroup', studyGroupSchema);