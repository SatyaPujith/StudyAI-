import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Quiz visibility and access
  isPublic: {
    type: Boolean,
    default: true
  },
  accessCode: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Only enforce uniqueness for non-null values
  },
  
  // Quiz questions
  questions: [{
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length >= 2 && v.length <= 6;
        },
        message: 'Question must have between 2 and 6 options'
      }
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0
    },
    explanation: {
      type: String,
      trim: true
    },
    points: {
      type: Number,
      default: 1,
      min: [1, 'Points must be at least 1']
    },
    timeLimit: {
      type: Number,
      default: 30 // 30 seconds per question
    }
  }],
  
  // Quiz scheduling
  scheduledAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number, // Total quiz duration in minutes
    default: null
  },
  
  // Quiz status
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Participants and results
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    answers: [{
      questionIndex: Number,
      selectedAnswer: Number,
      isCorrect: Boolean,
      timeSpent: Number // in seconds
    }],
    score: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    completedAt: {
      type: Date,
      default: null
    },
    totalTimeSpent: {
      type: Number,
      default: 0 // in seconds
    },
    rank: {
      type: Number,
      default: null
    }
  }],
  
  // Leaderboard (cached for performance)
  leaderboard: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    percentage: Number,
    completedAt: Date,
    totalTimeSpent: Number,
    rank: Number
  }],
  
  // Quiz settings
  settings: {
    allowRetake: {
      type: Boolean,
      default: false
    },
    showAnswersAfterCompletion: {
      type: Boolean,
      default: true
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    randomizeOptions: {
      type: Boolean,
      default: false
    }
  },
  
  // Analytics
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    }
  },
  
  aiGenerated: {
    type: Boolean,
    default: false
  },
  
  tags: [String]
}, {
  timestamps: true
});

// Indexes
quizSchema.index({ creator: 1, createdAt: -1 });
quizSchema.index({ isPublic: 1, status: 1 });
quizSchema.index({ accessCode: 1 });
quizSchema.index({ scheduledAt: 1, status: 1 });

// Virtual for total points
quizSchema.virtual('totalPoints').get(function() {
  return this.questions.reduce((total, question) => total + (question.points || 1), 0);
});

// Methods
quizSchema.methods.addParticipant = function(userId) {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({
      user: userId,
      joinedAt: new Date()
    });
  }
  return this.save();
};

quizSchema.methods.submitAnswers = function(userId, answers, totalTimeSpent) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!participant) {
    throw new Error('User is not a participant of this quiz');
  }
  
  // Calculate score
  let score = 0;
  let correctAnswers = 0;
  const processedAnswers = answers.map((answer, index) => {
    const question = this.questions[index];
    const isCorrect = question && answer.selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      score += question.points || 1;
      correctAnswers++;
    }
    
    return {
      questionIndex: index,
      selectedAnswer: answer.selectedAnswer,
      isCorrect,
      timeSpent: answer.timeSpent || 0
    };
  });
  
  const percentage = this.questions.length > 0 ? Math.round((correctAnswers / this.questions.length) * 100) : 0;
  
  // Update participant data
  participant.answers = processedAnswers;
  participant.score = score;
  participant.percentage = percentage;
  participant.completedAt = new Date();
  participant.totalTimeSpent = totalTimeSpent;
  
  // Update analytics
  this.analytics.totalAttempts += 1;
  
  return this.save().then(() => this.updateLeaderboard());
};

quizSchema.methods.updateLeaderboard = function() {
  // Get completed participants and sort by score (desc) and time (asc)
  const completedParticipants = this.participants
    .filter(p => p.completedAt)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTimeSpent - b.totalTimeSpent;
    });
  
  // Update leaderboard and ranks
  this.leaderboard = completedParticipants.map((participant, index) => {
    participant.rank = index + 1;
    return {
      user: participant.user,
      score: participant.score,
      percentage: participant.percentage,
      completedAt: participant.completedAt,
      totalTimeSpent: participant.totalTimeSpent,
      rank: index + 1
    };
  });
  
  // Update analytics
  if (completedParticipants.length > 0) {
    const totalScore = completedParticipants.reduce((sum, p) => sum + p.score, 0);
    
    this.analytics.averageScore = Math.round(totalScore / completedParticipants.length);
    this.analytics.completionRate = Math.round((completedParticipants.length / this.participants.length) * 100);
  }
  
  return this.save();
};

export default mongoose.model('Quiz', quizSchema);