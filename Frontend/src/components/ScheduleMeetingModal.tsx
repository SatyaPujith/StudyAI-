import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Users, Video } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onMeetingScheduled: (meeting: any) => void;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onMeetingScheduled
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduledAt: '',
    duration: 60
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.scheduledAt) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate that the scheduled time is in the future
    const scheduledTime = new Date(formData.scheduledAt);
    if (scheduledTime <= new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study-groups/${groupId}/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          scheduledAt: scheduledTime.toISOString(),
          duration: formData.duration
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to schedule meeting');
      }

      const data = await response.json();
      
      toast.success('Meeting scheduled successfully with 100ms!');
      onMeetingScheduled(data.meeting);
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        scheduledAt: '',
        duration: 60
      });

    } catch (error: any) {
      console.error('Error scheduling meeting:', error);
      toast.error(error.message || 'Failed to schedule meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Generate default meeting title
  const generateDefaultTitle = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    return `${groupName} Study Session - ${dateStr}`;
  };

  // Set default values when modal opens
  React.useEffect(() => {
    if (isOpen && !formData.title) {
      setFormData(prev => ({
        ...prev,
        title: generateDefaultTitle()
      }));
    }
  }, [isOpen, groupName]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Schedule Study Session
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Meeting Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter meeting title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional meeting description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date & Time *
              </Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration (min)
              </Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                min={15}
                max={480}
                step={15}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <Video className="h-4 w-4" />
              <span className="font-medium">100ms Integration</span>
            </div>
            <p className="text-blue-600 text-xs mt-1">
              A 100ms meeting room will be automatically created for this session
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Scheduling...' : 'Schedule Meeting'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingModal;