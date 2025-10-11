import mongoose from 'mongoose';

const studyPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Study plan title is required'],
    trim: true,
    maxlength: [500, 'Title cannot exceed 500 characters']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  duration: {
    type: Number, // in days
    required: true,
    min: [1, 'Duration must be at least 1 day']
  },
  syllabus: {
    type: String,
    trim: true
  },
  learningStyle: {
    type: String,
    enum: ['visual', 'auditory', 'kinesthetic', 'reading'],
    default: 'visual'
  },
  goals: [String],
  
  // Daily content structure
  dailyContent: [{
    day: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    objectives: [String],
    syllabusSection: String,
    keywords: [String],
    content: {
      overview: String,
      keyPoints: [String],
      examples: [String],
      exercises: [{
        title: String,
        description: String,
        type: {
          type: String,
          default: 'practice'
        }
      }],
      resources: [{
        type: {
          type: String,
          enum: ['video', 'article', 'book', 'practice', 'quiz'],
          required: true
        },
        title: String,
        description: String,
        url: String
      }]
    },
    isContentGenerated: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started'
    },
    timeSpent: {
      type: Number,
      default: 0 // in minutes
    },
    completedAt: Date
  }],
  
  // Overall progress
  progress: {
    completedDays: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    lastStudied: Date
  },
  
  schedule: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    studyDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    dailyStudyTime: {
      type: Number, // in minutes
      default: 60
    }
  },
  
  status: {
    type: String,
    enum: ['active', 'completed', 'paused', 'archived'],
    default: 'active'
  },
  
  aiGenerated: {
    type: Boolean,
    default: false
  },
  
  status: {
    type: String,
    enum: ['generating', 'ready', 'partial', 'failed'],
    default: 'generating'
  },
  
  contentGeneratedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
studyPlanSchema.index({ user: 1, createdAt: -1 });
studyPlanSchema.index({ user: 1, status: 1 });

// Update progress when daily content is modified
studyPlanSchema.methods.updateProgress = function() {
  const completedDays = this.dailyContent.filter(day => day.status === 'completed').length;
  const totalDays = this.dailyContent.length;
  const totalTimeSpent = this.dailyContent.reduce((sum, day) => sum + (day.timeSpent || 0), 0);
  
  this.progress.completedDays = completedDays;
  this.progress.totalDays = totalDays;
  this.progress.percentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
  this.progress.totalTimeSpent = totalTimeSpent;
  
  if (completedDays > 0) {
    this.progress.lastStudied = new Date();
  }
  
  return this.save();
};

// Get next day to study
studyPlanSchema.methods.getNextDay = function() {
  return this.dailyContent
    .filter(day => day.status === 'not_started')
    .sort((a, b) => a.day - b.day)[0];
};

export default mongoose.model('StudyPlan', studyPlanSchema);