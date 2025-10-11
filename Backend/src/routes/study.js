import express from 'express';
import studyController from '../controllers/studyController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Study Plans
router.post('/plans', studyController.createStudyPlan);
router.get('/plans', studyController.getStudyPlans);
router.get('/plans/:planId/progress', studyController.getUserProgress);
router.get('/plans/:planId/days/:day/content', studyController.getDailyContent);
router.put('/plans/:planId/days/:day/progress', studyController.updateDayProgress);

// Exercise Questions
router.post('/exercises/questions', studyController.generateExerciseQuestions);

// Quizzes
router.post('/quizzes', studyController.createQuiz);
router.post('/quizzes/manual', studyController.createManualQuiz);
router.get('/quizzes', studyController.getQuizzes);
router.post('/quizzes/join', studyController.joinQuizByCode);

// Quiz Management
router.put('/quizzes/:quizId/schedule', studyController.scheduleQuiz);
router.put('/quizzes/:quizId/start', studyController.startQuiz);
router.post('/quizzes/:quizId/submit', studyController.submitQuizAnswers);
router.get('/quizzes/:quizId/leaderboard', studyController.getQuizLeaderboard);

// Quiz Attempts
router.post('/quiz-attempts', studyController.submitQuizAttempt);
router.get('/quiz-attempts', studyController.getQuizAttempts);

// User Quiz History
router.get('/quizzes/history', studyController.getUserQuizHistory);

// Get quiz for taking (without answers)
router.get('/quizzes/:quizId/take', studyController.getQuizForTaking);

// Get quiz by ID (for joined private quizzes)
router.get('/quizzes/:quizId', studyController.getQuizById);

// Get quiz completion status
router.get('/quizzes/:quizId/status', studyController.getQuizStatus);

// Study Progress endpoints
router.post('/progress/start', studyController.startStudySession);
router.post('/progress/end', studyController.endStudySession);
router.post('/progress/section', studyController.updateSectionProgress);

// Daily content endpoints
router.get('/plans/:planId/topics/:topicId/content', studyController.getTopicContent);
router.put('/plans/:planId/topics/:topicId', studyController.updateTopicStatus);
router.get('/plans/:planId/status', studyController.getStudyPlanStatus);

// AI Content Generation on-demand
router.post('/plans/:planId/days/:day/generate-content', studyController.generateDayContentOnDemand);

export default router;