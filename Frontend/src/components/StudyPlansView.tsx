import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Play,
  CheckCircle,
  Circle
} from 'lucide-react';
import StudySession from './StudySession';
import CreateStudyPlanButton from './CreateStudyPlanButton';
import dataService, { StudyPlan } from '../services/dataService';
import { toast } from 'sonner';

interface StudyPlansViewProps {
  // Removed unused preview prop
}

const StudyPlansView: React.FC<StudyPlansViewProps> = () => {
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [studySessionOpen, setStudySessionOpen] = useState<{
    studyPlanId: string;
    topicId: string;
  } | null>(null);

  useEffect(() => {
    loadStudyPlans();
  }, []);

  const loadStudyPlans = async () => {
    try {
      setLoading(true);
      const plans = await dataService.getStudyPlans();

      setStudyPlans(plans || []);

      // Auto-expand the first plan if there are any
      if (plans && plans.length > 0) {
        setExpandedPlans(new Set([plans[0]._id]));
      }
    } catch (error) {
      console.error('Error loading study plans:', error);
      toast.error('Failed to load study plans');
    } finally {
      setLoading(false);
    }
  };

  const togglePlanExpansion = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  const startStudySession = (studyPlanId: string, topicId: string) => {
    setStudySessionOpen({ studyPlanId, topicId });
  };

  const getDaysFromPlan = (plan: StudyPlan) => {
    if (plan.dailyContent && plan.dailyContent.length > 0) {

      return plan.dailyContent.map((day, index) => {
        // Use the actual status from the backend, with fallback logic
        let dayStatus = day.status || 'not_started';
        
        // If no status is set, determine based on position and completion
        if (!day.status) {
          if (index === 0) {
            dayStatus = 'in_progress';
          } else {
            // Check if previous days are completed to determine if this day should be available
            const previousDaysCompleted = plan.dailyContent!.slice(0, index).every(prevDay => 
              prevDay.status === 'completed'
            );
            dayStatus = previousDaysCompleted ? 'in_progress' : 'upcoming';
          }
        }
        
        return {
          id: day.day?.toString() || `day-${index + 1}`,
          title: `Day ${day.day || index + 1}`,
          description: day.title || `Study session for day ${day.day || index + 1}`,
          status: dayStatus,
          estimatedTime: Math.ceil((day.totalTime || 90) / 60)
        };
      });
    } else if (plan.topics && plan.topics.length > 0) {
      return plan.topics.map((topic, index) => ({
        id: topic._id || `topic-${index}`,
        title: topic.title || `Topic ${index + 1}`,
        description: topic.description || `Study topic ${index + 1}`,
        status: topic.status || (index === 0 ? 'in_progress' : 'upcoming'),
        estimatedTime: Math.ceil((topic.estimatedTime || 90) / 60)
      }));
    } else {
      // Generate default days based on estimated duration
      const durationDays = plan.estimatedDuration || 7;
      return Array.from({ length: Math.min(durationDays, 30) }, (_, index) => ({
        id: `day-${index + 1}`,
        title: `Day ${index + 1}`,
        description: `${plan.subject} - Day ${index + 1} study session`,
        status: index === 0 ? 'in_progress' : 'upcoming',
        estimatedTime: 2
      }));
    }
  };



  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Study Plans</h2>
          <div className="w-32 h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-gray-100 rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (studyPlans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Study Plans</h2>
          <CreateStudyPlanButton />
        </div>

        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Study Plans Yet</h3>
          <p className="text-gray-600 mb-6">Create your first AI-powered study plan to get started</p>
          <CreateStudyPlanButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Study Plans</h2>
        <CreateStudyPlanButton />
      </div>

      <div className="space-y-4">
        {studyPlans.map((plan, planIndex) => {
          const isExpanded = expandedPlans.has(plan._id);
          const days = getDaysFromPlan(plan);
          const completedDays = days.filter(day => day.status === 'completed').length;
          const progressPercentage = (completedDays / days.length) * 100;

          return (
            <Card key={plan._id} className="border-gray-200 shadow-sm">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => togglePlanExpansion(plan._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900">
                        {plan.title || `Study Plan ${planIndex + 1}`}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-600">{plan.subject}</span>
                        <Badge variant="outline" className="text-xs">
                          {plan.difficulty}
                        </Badge>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {`${plan.estimatedDuration} days`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {completedDays}/{days.length} Days
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(progressPercentage)}% Complete
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>

                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="border-t border-gray-200 pt-4">
                    <div className="grid gap-3">
                      {days.map((day) => (
                        <div
                          key={day.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${getStatusColor(day.status)}`}
                        >
                          <div className="flex items-center gap-3">
                            {getStatusIcon(day.status)}
                            <div>
                              <h4 className="font-medium">{day.title}</h4>
                              <p className="text-sm opacity-75">{day.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-sm opacity-75 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {day.estimatedTime}h
                            </div>

                            {day.status !== 'completed' && (
                              <Button
                                size="sm"
                                onClick={() => startStudySession(plan._id, day.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Play className="h-3 w-3 mr-1" />
                                {day.status === 'in_progress' ? 'Continue' : 'Start'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Study Session Modal */}
      {studySessionOpen && (
        <StudySession
          studyPlanId={studySessionOpen.studyPlanId}
          topicId={studySessionOpen.topicId}
          onClose={() => setStudySessionOpen(null)}
          onComplete={() => {
            setStudySessionOpen(null);
            // Add a small delay to ensure backend has processed the update
            setTimeout(() => {
              loadStudyPlans(); // Refresh to show updated progress
            }, 500);
          }}
        />
      )}
    </div>
  );
};

export default StudyPlansView;