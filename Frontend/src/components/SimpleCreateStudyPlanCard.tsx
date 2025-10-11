import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus, Sparkles } from 'lucide-react';
import SimpleCreateStudyPlanModal from './SimpleCreateStudyPlanModal';

const SimpleCreateStudyPlanCard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    // Refresh the page to show the new study plan
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Create Study Plan</h3>
              <p className="text-sm text-gray-500 font-normal">
                Generate your personalized learning path
              </p>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Get an AI-powered study plan tailored to your learning style and goals.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Sparkles className="h-3 w-3" />
              <span>Personalized content</span>
              <span>•</span>
              <span>Adaptive difficulty</span>
              <span>•</span>
              <span>Progress tracking</span>
            </div>

            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Study Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <SimpleCreateStudyPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default SimpleCreateStudyPlanCard;