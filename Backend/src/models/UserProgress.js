import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studyPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyPlan',
    required: true
  },
  day: {
    type: Number,
    required: true
  },
  
  // Study sessions for this day
  studySessions: [{
    startTime: { type: Date, required: true },
    endTime: Date,
    duration: { type: Number, default: 0 }, // in minutes
    sectionsCompleted: [{
      sectionName: String,
      completedAt: Date,
      timeSpent: Number // in minutes
    }],
    notes: String,
    completed: { type: Boolean, default: false }
  }],
  
  // Overall progress for this day
  totalStudyTime: { type: Number, default: 0 }, // in minutes
  sessionsCount: { type: Number, default: 0 },
  lastStudied: Date,
  
  // Content interaction tracking
  sectionsViewed: [{
    sectionName: String,
    viewCount: { type: Number, default: 1 },
    lastViewed: Date,
    timeSpent: { type: Number, default: 0 }
  }],
  
  // Learning metrics
  conceptsLearned: [String],
  exercisesCompleted: [String],
  resourcesAccessed: [{
    resourceType: String,
    resourceTitle: String,
    accessedAt: Date,
    timeSpent: Number
  }],
  
  // Status
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'needs_review'],
    default: 'not_started'
  },
  
  completedAt: Date,
  
  // Performance metrics
  comprehensionLevel: {
    type: String,
    enum: ['beginner', 'developing', 'proficient', 'advanced'],
    default: 'beginner'
  },
  
  confidenceScore: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  }
}, {
  timestamps: true
});

// Indexes
userProgressSchema.index({ user: 1, studyPlan: 1, day: 1 }, { unique: true });
userProgressSchema.index({ user: 1, lastStudied: -1 });
userProgressSchema.index({ user: 1, status: 1 });

// Methods
userProgressSchema.methods.startStudySession = function() {
  const session = {
    startTime: new Date(),
    sectionsCompleted: []
  };
  
  this.studySessions.push(session);
  this.status = 'in_progress';
  this.lastStudied = new Date();
  
  return this.save();
};

userProgressSchema.methods.endStudySession = function(sessionIndex, completed = false) {
  if (this.studySessions[sessionIndex]) {
    const session = this.studySessions[sessionIndex];
    session.endTime = new Date();
    session.duration = Math.floor((session.endTime - session.startTime) / (1000 * 60));
    session.completed = completed;
    
    // Update totals
    this.totalStudyTime += session.duration;
    this.sessionsCount += 1;
    this.lastStudied = new Date();
    
    if (completed) {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  return this.save();
};

userProgressSchema.methods.markSectionComplete = function(sessionIndex, sectionName, timeSpent = 0) {
  if (this.studySessions[sessionIndex]) {
    this.studySessions[sessionIndex].sectionsCompleted.push({
      sectionName,
      completedAt: new Date(),
      timeSpent
    });
    
    // Update section views
    const existingSection = this.sectionsViewed.find(s => s.sectionName === sectionName);
    if (existingSection) {
      existingSection.viewCount += 1;
      existingSection.lastViewed = new Date();
      existingSection.timeSpent += timeSpent;
    } else {
      this.sectionsViewed.push({
        sectionName,
        viewCount: 1,
        lastViewed: new Date(),
        timeSpent
      });
    }
  }
  
  return this.save();
};

userProgressSchema.methods.updateLearningMetrics = function(concepts, exercises, resources) {
  if (concepts) {
    this.conceptsLearned = [...new Set([...this.conceptsLearned, ...concepts])];
  }
  
  if (exercises) {
    this.exercisesCompleted = [...new Set([...this.exercisesCompleted, ...exercises])];
  }
  
  if (resources) {
    resources.forEach(resource => {
      this.resourcesAccessed.push({
        resourceType: resource.type,
        resourceTitle: resource.title,
        accessedAt: new Date(),
        timeSpent: resource.timeSpent || 0
      });
    });
  }
  
  return this.save();
};

// Static methods
userProgressSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$user',
        totalStudyTime: { $sum: '$totalStudyTime' },
        totalSessions: { $sum: '$sessionsCount' },
        daysStarted: { $sum: { $cond: [{ $ne: ['$status', 'not_started'] }, 1, 0] } },
        daysCompleted: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        conceptsLearned: { $sum: { $size: '$conceptsLearned' } },
        exercisesCompleted: { $sum: { $size: '$exercisesCompleted' } }
      }
    }
  ]);
  
  return stats[0] || {
    totalStudyTime: 0,
    totalSessions: 0,
    daysStarted: 0,
    daysCompleted: 0,
    conceptsLearned: 0,
    exercisesCompleted: 0
  };
};

export default mongoose.model('UserProgress', userProgressSchema);