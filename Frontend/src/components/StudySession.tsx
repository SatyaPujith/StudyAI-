import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Play,
  FileText,
  Video,
  Link,
  Brain,
  Target,
  Menu,
  X
} from 'lucide-react';

import { toast } from 'sonner';

interface StudySessionProps {
  studyPlanId: string;
  topicId: string;
  onClose: () => void;
  onComplete: () => void;
}

interface StudyContent {
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: number;
  content: {
    overview: string;
    keyPoints: string[];
    examples: string[];
    exercises: (string | { title: string; description: string })[];
  };
  resources: {
    type: 'video' | 'article' | 'book' | 'practice' | 'quiz';
    title: string;
    url?: string;
    description: string;
  }[];
}

const StudySession: React.FC<StudySessionProps> = ({
  studyPlanId,
  topicId,
  onClose,
  onComplete
}) => {
  const [content, setContent] = useState<StudyContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<number>>(new Set());
  const [studyTime, setStudyTime] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [exerciseModal, setExerciseModal] = useState<{
    isOpen: boolean;
    exercise: any;
    questions: any[];
    currentQuestion: number;
    answers: number[];
    score: number;
  }>({
    isOpen: false,
    exercise: null,
    questions: [],
    currentQuestion: 0,
    answers: [],
    score: 0
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    loadStudyContent();
    startStudySession();

    // Start study timer
    const timer = setInterval(() => {
      setStudyTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (sessionId) {
        endStudySession(false);
      }
      clearInterval(timer);
    };
  }, [studyPlanId, topicId]);

  const startStudySession = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/progress/start`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          studyPlanId,
          topicId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Error starting study session:', error);
    }
  };

  const endStudySession = async (completed: boolean) => {
    if (!sessionId) return;

    try {
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/progress/end`;
      await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId,
          completed,
          studyTime,
          sectionsCompleted: Array.from(completedSections)
        })
      });
    } catch (error) {
      console.error('Error ending study session:', error);
    }
  };

  const loadStudyContent = async () => {
    try {
      setLoading(true);

      // First, try to get existing content
      const existingContentUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/plans/${studyPlanId}/days/${topicId}/content`;

      try {
        const existingResponse = await fetch(existingContentUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          if (existingData.success && existingData.content && existingData.content.overview) {
            setContentFromAPI(existingData);
            setLoading(false);
            return;
          }
        }
      } catch (existingError) {
        // No existing content found, will generate new content
      }

      // No existing content found, generate new AI content
      toast.info('🤖 Generating personalized study content with AI...', { duration: 3000 });

      const generateUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/plans/${studyPlanId}/days/${topicId}/generate-content`;

      const generateResponse = await fetch(generateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (generateResponse.ok) {
        const data = await generateResponse.json();

        if (data.success && data.content) {
          setContentFromAPI(data);
          toast.success('🎉 AI-powered study content generated successfully!');
        } else {
          throw new Error('Invalid AI response format');
        }
      } else {
        const errorData = await generateResponse.json();
        throw new Error(errorData.message || 'Failed to generate AI content');
      }

    } catch (error) {
      console.error('Error loading/generating study content:', error);
      toast.error('Failed to generate AI content, using fallback');
      setFallbackContent();
    } finally {
      setLoading(false);
    }
  };

  const setContentFromAPI = (data: any) => {
    const aiContent = data.content;

    setContent({
      title: data.title || `Day ${topicId} Study Session`,
      description: 'Comprehensive learning material generated specifically for you',
      difficulty: 'adaptive',
      estimatedTime: 90,
      content: {
        overview: aiContent.overview || 'AI-generated comprehensive overview',
        keyPoints: Array.isArray(aiContent.keyPoints) ? aiContent.keyPoints : [],
        examples: Array.isArray(aiContent.examples) ? aiContent.examples : [],
        exercises: Array.isArray(aiContent.exercises) ? aiContent.exercises : []
      },
      resources: Array.isArray(aiContent.resources) ? aiContent.resources : []
    });
  };

  const setFallbackContent = () => {
    const mockContent: StudyContent = {
      title: `Day ${topicId}: Study Session`,
      description: 'Comprehensive learning session with detailed content',
      difficulty: 'easy',
      estimatedTime: 90,
      content: {
        overview: `Welcome to Day ${topicId} of your study plan! This comprehensive session will introduce you to essential concepts and provide you with a solid foundation for your learning journey.

In this session, you'll explore core principles, understand key terminology, and see practical examples that will help you grasp essential concepts. This content is designed to build your expertise systematically and prepare you for advanced topics.`,
        keyPoints: [
          `Day ${topicId}: Understand fundamental terminology and core concepts`,
          `Day ${topicId}: Learn essential principles and their practical applications`,
          `Day ${topicId}: Explore real-world examples and professional use cases`,
          `Day ${topicId}: Practice with hands-on exercises and problem-solving`,
          `Day ${topicId}: Prepare foundation for upcoming advanced topics`
        ],
        examples: [
          `Example ${topicId}.1: Basic concept demonstration with step-by-step explanation and expected outcomes`,
          `Example ${topicId}.2: Practical application showing real-world usage in professional environments`,
          `Example ${topicId}.3: Common scenario analysis and systematic approach to problem-solving`,
          `Example ${topicId}.4: Advanced technique demonstration with detailed solution walkthrough`
        ],
        exercises: [
          `Exercise ${topicId}.1: Complete foundational concept assessment with immediate feedback`,
          `Exercise ${topicId}.2: Apply learned principles to solve structured problems with guided steps`,
          `Exercise ${topicId}.3: Analyze real-world case study and identify key implementation elements`,
          `Exercise ${topicId}.4: Create original solution using today's concepts and validate your approach`
        ]
      },
      resources: [
        {
          type: 'video',
          title: `Day ${topicId} Video Tutorial`,
          description: 'Comprehensive video explaining core concepts with visual demonstrations and practical examples'
        },
        {
          type: 'article',
          title: `Day ${topicId} Essential Reading`,
          description: 'In-depth article covering theoretical foundations and practical applications'
        },
        {
          type: 'practice',
          title: `Day ${topicId} Practice Session`,
          description: 'Interactive exercises and hands-on practice problems to reinforce learning'
        },
        {
          type: 'quiz',
          title: `Day ${topicId} Knowledge Assessment`,
          description: 'Comprehensive quiz to test understanding and identify areas for review'
        }
      ]
    };

    setContent(mockContent);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sections = [
    { id: 0, title: 'Overview', icon: BookOpen },
    { id: 1, title: 'Key Points', icon: Target },
    { id: 2, title: 'Examples', icon: FileText },
    { id: 3, title: 'Exercises', icon: Brain },
    { id: 4, title: 'Resources', icon: Link }
  ];

  const startExercise = async (exercise: any, index: number) => {
    try {
      const exerciseTitle = typeof exercise === 'object' ? exercise.title : `Exercise ${index + 1}`;
      const subject = content?.title || 'General';

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/exercises/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          exerciseTitle,
          subject,
          difficulty: content?.difficulty || 'beginner'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExerciseModal({
          isOpen: true,
          exercise,
          questions: data.questions || [],
          currentQuestion: 0,
          answers: [],
          score: 0
        });
      } else {
        toast.error('Failed to load exercise questions');
      }
    } catch (error) {
      console.error('Error starting exercise:', error);
      toast.error('Failed to start exercise');
    }
  };

  const markSectionComplete = async (sectionId: number) => {
    const sectionName = sections[sectionId]?.title || `Section ${sectionId}`;

    setCompletedSections(prev => new Set([...prev, sectionId]));

    // Track section completion
    if (sessionId) {
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/progress/section`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            sessionId,
            sectionName,
            timeSpent: studyTime
          })
        });
      } catch (error) {
        console.error('Error tracking section completion:', error);
      }
    }
  };

  const handleCompleteStudy = async () => {
    try {
      // End the current study session
      await endStudySession(true);
      
      // Update the study plan progress
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study/plans/${studyPlanId}/days/${topicId}/progress`;
      const progressResponse = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'completed',
          timeSpent: studyTime,
          sectionsCompleted: Array.from(completedSections)
        })
      });

      if (progressResponse.ok) {
        toast.success('Study session completed! Great job!');
        onComplete(); // This will refresh the study plans view
        onClose();
      } else {
        throw new Error('Failed to update progress');
      }
    } catch (error) {
      console.error('Error completing study session:', error);
      toast.error('Failed to mark as complete');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">🤖 AI Generating Your Study Content</h3>
                <p className="text-sm text-gray-600">Creating personalized learning materials...</p>
              </div>
            </div>

            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-700">Analyzing your study plan</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <span className="text-sm text-gray-700">Generating comprehensive overview</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                <span className="text-sm text-gray-700">Creating key points & examples</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                <span className="text-sm text-gray-700">Designing practical exercises</span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                ✨ This may take 10-20 seconds to ensure high-quality, personalized content
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  const progress = (completedSections.size / sections.length) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <Card className="w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b p-3 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base md:text-lg truncate">{content.title}</CardTitle>
                <p className="text-sm text-gray-600 hidden md:block">{content.description}</p>
                {/* Mobile section indicator */}
                <div className="md:hidden mt-1">
                  <Badge variant="outline" className="text-xs">
                    {sections[currentSection]?.title}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-sm text-gray-600">
                <Clock className="h-4 w-4 inline mr-1" />
                <span className="hidden sm:inline">{formatTime(studyTime)}</span>
                <span className="sm:hidden">{Math.floor(studyTime / 60)}m</span>
              </div>
              <Badge variant="outline" className="hidden md:inline-flex text-xs">
                {content.difficulty}
              </Badge>
            </div>
          </div>

          <div className="mt-3 md:mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-y-auto max-h-[calc(95vh-180px)] md:max-h-[calc(90vh-200px)]">
          <div className="flex relative">
            {/* Mobile Menu Button */}
            <div className="md:hidden absolute top-3 left-3 z-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="bg-white shadow-md"
              >
                {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-2 z-30">
              <div className="flex justify-center space-x-1 overflow-x-auto">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isCompleted = completedSections.has(section.id);
                  const isCurrent = currentSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`flex flex-col items-center p-2 rounded-lg min-w-[60px] transition-colors ${
                        isCurrent
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1" />
                      <span className="text-xs truncate">{section.title}</span>
                      {isCompleted && (
                        <CheckCircle className="h-3 w-3 text-green-600 absolute -top-1 -right-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop Sidebar Navigation */}
            <div className="hidden md:block w-64 border-r bg-gray-50 p-4">
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isCompleted = completedSections.has(section.id);
                  const isCurrent = currentSection === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setCurrentSection(section.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isCurrent
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{section.title}</span>
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-3 md:p-6 pt-12 md:pt-6 pb-20 md:pb-6">
              {currentSection === 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Overview</h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {content.content.overview}
                    </p>
                  </div>
                  <Button
                    onClick={() => markSectionComplete(0)}
                    disabled={completedSections.has(0)}
                    className="mt-4"
                  >
                    {completedSections.has(0) ? 'Completed' : 'Mark as Read'}
                  </Button>
                </div>
              )}

              {currentSection === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Key Points</h3>
                  <ul className="space-y-3">
                    {content.content.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-gray-700">{point}</p>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => markSectionComplete(1)}
                    disabled={completedSections.has(1)}
                    className="mt-4"
                  >
                    {completedSections.has(1) ? 'Completed' : 'Mark as Understood'}
                  </Button>
                </div>
              )}

              {currentSection === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Examples</h3>
                  <div className="space-y-4">
                    {content.content.examples.map((example, index) => (
                      <Card key={index} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <p className="text-gray-700">{example}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    onClick={() => markSectionComplete(2)}
                    disabled={completedSections.has(2)}
                    className="mt-4"
                  >
                    {completedSections.has(2) ? 'Completed' : 'Mark as Reviewed'}
                  </Button>
                </div>
              )}

              {currentSection === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Practice Exercises</h3>
                  <div className="space-y-4">
                    {content.content.exercises.map((exercise, index) => (
                      <Card key={index} className="border-l-4 border-l-orange-500">
                        <CardContent className="p-4">
                          <div className="mb-3">
                            <h4 className="font-semibold text-lg mb-2">
                              {typeof exercise === 'object' ? exercise.title : `Exercise ${index + 1}`}
                            </h4>
                            <p className="text-gray-700">
                              {typeof exercise === 'object' ? exercise.description : exercise}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startExercise(exercise, index)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start Exercise
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    onClick={() => markSectionComplete(3)}
                    disabled={completedSections.has(3)}
                    className="mt-4"
                  >
                    {completedSections.has(3) ? 'Completed' : 'Mark as Practiced'}
                  </Button>
                </div>
              )}

              {currentSection === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Additional Resources</h3>
                  <div className="grid gap-4">
                    {content.resources.map((resource, index) => {
                      const getIcon = () => {
                        switch (resource.type) {
                          case 'video': return <Video className="h-5 w-5" />;
                          case 'article': return <FileText className="h-5 w-5" />;
                          case 'book': return <BookOpen className="h-5 w-5" />;
                          case 'practice': return <Brain className="h-5 w-5" />;
                          case 'quiz': return <Target className="h-5 w-5" />;
                          default: return <Link className="h-5 w-5" />;
                        }
                      };

                      return (
                        <Card key={index} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                {getIcon()}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium">{resource.title}</h4>
                                <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => window.open(resource.url, '_blank')}
                                >
                                  Access Resource
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <Button
                    onClick={() => markSectionComplete(4)}
                    disabled={completedSections.has(4)}
                    className="mt-4"
                  >
                    {completedSections.has(4) ? 'Completed' : 'Mark as Explored'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>

        <div className="border-t p-3 md:p-4 pb-20 md:pb-4">
          {/* Desktop Footer */}
          <div className="hidden md:flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                disabled={currentSection === sections.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <Button
              onClick={handleCompleteStudy}
              disabled={completedSections.size < sections.length}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Study Session
            </Button>
          </div>

          {/* Mobile Footer */}
          <div className="md:hidden space-y-3">
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                disabled={currentSection === sections.length - 1}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              onClick={handleCompleteStudy}
              disabled={completedSections.size < sections.length}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Study Session
            </Button>
          </div>
        </div>
      </Card>

      {/* Exercise Modal */}
      {exerciseModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">
                  {typeof exerciseModal.exercise === 'object'
                    ? exerciseModal.exercise.title
                    : 'Practice Exercise'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExerciseModal(prev => ({ ...prev, isOpen: false }))}
                >
                  Close
                </Button>
              </div>
              {exerciseModal.questions.length > 0 && (
                <div className="mt-4">
                  <Progress
                    value={(exerciseModal.currentQuestion / exerciseModal.questions.length) * 100}
                    className="h-2"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Question {exerciseModal.currentQuestion + 1} of {exerciseModal.questions.length}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6">
              {exerciseModal.questions.length > 0 ? (
                exerciseModal.currentQuestion < exerciseModal.questions.length ? (
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium">
                      {exerciseModal.questions[exerciseModal.currentQuestion].question}
                    </h4>
                    <div className="space-y-2">
                      {exerciseModal.questions[exerciseModal.currentQuestion].options.map((option: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            const newAnswers = [...exerciseModal.answers];
                            newAnswers[exerciseModal.currentQuestion] = index;
                            setExerciseModal(prev => ({ ...prev, answers: newAnswers }));
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${exerciseModal.answers[exerciseModal.currentQuestion] === index
                              ? 'bg-blue-50 border-blue-200 text-blue-800'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setExerciseModal(prev => ({
                          ...prev,
                          currentQuestion: Math.max(0, prev.currentQuestion - 1)
                        }))}
                        disabled={exerciseModal.currentQuestion === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => {
                          if (exerciseModal.currentQuestion === exerciseModal.questions.length - 1) {
                            // Calculate score
                            const correctAnswers = exerciseModal.answers.reduce((score, answer, index) => {
                              return score + (answer === exerciseModal.questions[index].correctAnswer ? 1 : 0);
                            }, 0);
                            setExerciseModal(prev => ({
                              ...prev,
                              score: correctAnswers,
                              currentQuestion: prev.currentQuestion + 1
                            }));
                          } else {
                            setExerciseModal(prev => ({
                              ...prev,
                              currentQuestion: prev.currentQuestion + 1
                            }));
                          }
                        }}
                        disabled={exerciseModal.answers[exerciseModal.currentQuestion] === undefined}
                      >
                        {exerciseModal.currentQuestion === exerciseModal.questions.length - 1 ? 'Finish' : 'Next'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="text-6xl">🎉</div>
                    <h4 className="text-xl font-semibold">Exercise Complete!</h4>
                    <p className="text-lg">
                      You scored {exerciseModal.score} out of {exerciseModal.questions.length}
                    </p>
                    <p className="text-gray-600">
                      {Math.round((exerciseModal.score / exerciseModal.questions.length) * 100)}% correct
                    </p>
                    <Button
                      onClick={() => {
                        setExerciseModal({
                          isOpen: false,
                          exercise: null,
                          questions: [],
                          currentQuestion: 0,
                          answers: [],
                          score: 0
                        });
                        toast.success('Exercise completed successfully!');
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Continue Learning
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>Loading exercise questions...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudySession;