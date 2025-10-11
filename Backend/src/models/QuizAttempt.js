import mongoose from 'mongoose';

const quizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  answers: [{
    type: Number,
    required: false,
    default: null
  }],
  results: [{
    questionIndex: Number,
    userAnswer: Number,
    correctAnswer: Number,
    isCorrect: Boolean,
    explanation: String
  }],
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
quizAttemptSchema.index({ user: 1, quiz: 1 });
quizAttemptSchema.index({ user: 1, completedAt: -1 });

export default mongoose.model('QuizAttempt', quizAttemptSchema);