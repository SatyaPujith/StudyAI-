import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles } from 'lucide-react';
import SimpleCreateStudyPlanModal from './SimpleCreateStudyPlanModal';

const CreateStudyPlanButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    // Refresh the page to show the new study plan
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Create New Study Plan
      </Button>

      <SimpleCreateStudyPlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default CreateStudyPlanButton;