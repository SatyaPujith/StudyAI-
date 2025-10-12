import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle2, ArrowRight, RotateCcw, Trophy, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface QuizModalProps {
  open: boolean;
  onClose: () => void;
  quizId?: string;
}

interface Question {
  _id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  points?: number;
  timeLimit?: number;
}

interface Quiz {
  _id: string;
  title: string;
  topic: string;
  difficulty: string;
  questions: Question[];
}

const QuizModal: React.FC<QuizModalProps> = ({ open, onClose, quizId }) => {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Fetch quiz data when modal opens
  React.useEffect(() => {
    if (open && quizId) {
      checkQuizCompletionStatus();
    }
  }, [open, quizId]);

  const checkQuizCompletionStatus = async () => {
    if (!quizId) return;
    
    try {
      // Check if user has already completed this quiz
      const response = await fetch(`${API_BASE_URL}/study/quizzes/${quizId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.completed && data.attempt) {
          // Quiz was already completed, show leaderboard directly
          setQuizCompleted(true);
          setScore(data.attempt.score || 0);
          await loadLeaderboard();
          // Still fetch quiz data for display
          await fetchQuizData();
        } else {
          // Quiz not completed, proceed normally
          await fetchQuizData();
        }
      } else {
        // If status check fails, proceed normally
        await fetchQuizData();
      }
    } catch (error) {
      console.error('Error checking quiz completion status:', error);
      // If status check fails, proceed normally
      await fetchQuizData();
    }
  };

  const ensureQuizParticipation = async (quizId: string) => {
    try {
      // Try to join the quiz as a participant
      await fetch(`${API_BASE_URL}/study/quizzes/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ quizId })
      });
      
      // Try to start the quiz
      await fetch(`${API_BASE_URL}/study/quizzes/${quizId}/start`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      // Quiz participation/start may already be set
    }
  };

  const fetchQuizData = async () => {
    if (!quizId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/study/quizzes/${quizId}/take`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQuiz(data.quiz);
          setAnswers(new Array(data.quiz.questions.length).fill(null));
          
          // Ensure user is a participant and quiz is started
          await ensureQuizParticipation(quizId);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    setSelectedAnswer(answerIndex);
  };

  const handleNext = () => {
    if (selectedAnswer === null || !quiz) return;

    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);

    // Score will be calculated by the backend

    setShowResult(true);
    
    setTimeout(() => {
      if (currentQuestion < quiz.questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
        setShowResult(false);
      } else {
        // Quiz completed - submit results
        submitQuizResults();
      }
    }, 2000);
  };

  const loadLeaderboard = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/study/quizzes/${quizId}/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const submitQuizResults = async () => {
    if (!quiz || !quizId) return;
    
    try {
      // Format answers correctly for the backend
      const formattedAnswers = answers.map((answer) => ({
        selectedAnswer: answer,
        timeSpent: 30 // Default time per question
      }));

      const response = await fetch(`${API_BASE_URL}/study/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          totalTimeSpent: answers.length * 30 // Total time estimate
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update score with actual backend response (convert percentage to raw score)
        const rawScore = Math.round((data.percentage || 0) * quiz.questions.length / 100);
        setScore(rawScore);
        
        // Show success message
        const { toast } = await import('sonner');
        toast.success(`Quiz completed! Score: ${rawScore}/${quiz.questions.length} (${data.percentage}%)`);
        
        // Mark quiz as completed and load leaderboard
        setQuizCompleted(true);
        await loadLeaderboard();
      
      } else {
        const errorData = await response.json();
        console.error('Quiz submission failed:', errorData);
      }
    } catch (error) {
      console.error('Error submitting quiz results:', error);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuiz(null);
    setAnswers([]);
    setQuizCompleted(false);
    setLeaderboard([]);
  };

  // Reset state when quiz changes or modal closes
  React.useEffect(() => {
    if (!open) {
      // Clear all state when modal closes
      setQuiz(null);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setAnswers([]);
      setQuizCompleted(false);
      setLeaderboard([]);
      setLoading(false);
    }
  }, [open]);

  // Reset state when quiz ID changes
  React.useEffect(() => {
    if (open && quizId) {
      // Reset all state when opening a different quiz
      setQuiz(null);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setScore(0);
      setAnswers([]);
      setQuizCompleted(false);
      setLeaderboard([]);
      setLoading(false);
    }
  }, [quizId]);

  if (!quiz) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading Quiz</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            {loading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading quiz...</p>
              </div>
            ) : (
              <p>No quiz data available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show quiz completion screen with leaderboard
  if (quizCompleted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Trophy className="h-6 w-6" />
              Quiz Completed!
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Final Score */}
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-700 mb-2">
                {score}/{quiz.questions.length}
              </div>
              <div className="text-lg text-green-600">
                {Math.round((score / quiz.questions.length) * 100)}% Correct
              </div>
            </div>

            {/* Leaderboard */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">🏆 Leaderboard</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLeaderboard}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, entryIndex) => (
                    <div
                      key={entryIndex}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        entryIndex === 0 ? "bg-yellow-50 border-yellow-200" :
                        entryIndex === 1 ? "bg-gray-50 border-gray-200" :
                        entryIndex === 2 ? "bg-orange-50 border-orange-200" :
                        "bg-white border-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                          entryIndex === 0 ? "bg-yellow-500 text-white" :
                          entryIndex === 1 ? "bg-gray-500 text-white" :
                          entryIndex === 2 ? "bg-orange-500 text-white" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {entryIndex + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {entry.user?.firstName || 'Anonymous'} {entry.user?.lastName || ''}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.score}/{quiz.questions.length} correct
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {entry.percentage}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {Math.round(entry.totalTimeSpent || 0)}s
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Loading leaderboard...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleRestart}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Take Again
              </Button>
              <Button
                onClick={onClose}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const progress = ((currentQuestion + 1) / quiz.questions.length) * 100;
  const question = quiz.questions[currentQuestion];
  // Don't show correct/incorrect during quiz - only final score matters

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex items-center gap-2 text-black">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gray-100 text-gray-700">AI</AvatarFallback>
            </Avatar>
            Quiz Practice Session
          </DialogTitle>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
              <span>Score: {score}/{quiz.questions.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* AI Tutor Message */}
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gray-100 text-gray-700">AI</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm p-4">
                <p className="text-gray-900 font-medium mb-3">{question.question}</p>
                
                <div className="space-y-2">
                  {question.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResult}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all duration-200",
                        selectedAnswer === index
                          ? "bg-blue-50 border-blue-200 text-blue-800"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-medium">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option}</span>
                        {selectedAnswer === index && (
                          <CheckCircle2 className="h-5 w-5 text-blue-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Answer confirmation */}
          {showResult && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-blue-100 text-blue-700">AI</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-blue-50 rounded-2xl rounded-tl-sm p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      Answer Recorded!
                    </span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    {currentQuestion < quiz.questions.length - 1 
                      ? 'Moving to the next question...' 
                      : 'Calculating your final score...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleRestart}
              className="border-gray-200 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart
            </Button>
            
            <Button 
              onClick={selectedAnswer !== null ? handleNext : undefined}
              disabled={selectedAnswer === null}
              className="bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-50"
            >
              {currentQuestion === quiz.questions.length - 1 ? "Finish" : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuizModal;