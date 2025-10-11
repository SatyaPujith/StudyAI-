import React, { useState } from 'react';
import { X, Users, BookOpen, Calendar, Globe, Lock } from 'lucide-react';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: any) => Promise<any>;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, onCreateGroup }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    privacy: 'public',
    maxMembers: 50,
    tags: '',
    scheduleSession: false,
    sessionTitle: '',
    sessionDate: '',
    sessionDuration: 60
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const groupData = {
        name: formData.name,
        description: formData.description,
        subject: formData.subject,
        isPublic: formData.privacy === 'public',
        maxMembers: formData.maxMembers,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };
      
      const createdGroup = await onCreateGroup(groupData);
      
      console.log('Created group:', createdGroup); // Debug log
      
      // If scheduling is enabled, schedule the session
      if (formData.scheduleSession && formData.sessionDate && createdGroup && (createdGroup._id || createdGroup.id)) {
        try {
          const groupId = createdGroup._id || createdGroup.id;
          console.log('Scheduling session for group:', groupId); // Debug log
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/study-groups/${groupId}/schedule`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              title: formData.sessionTitle || `${formData.name} - First Study Session`,
              description: `First study session for ${formData.name}`,
              scheduledAt: new Date(formData.sessionDate).toISOString(),
              duration: formData.sessionDuration
            })
          });

          if (response.ok) {
            const meetingData = await response.json();
            // Show success message with in-app meeting
            const { toast } = await import('sonner');
            toast.success(`Group created and session scheduled! Click "Join Session" to start the meeting.`);
          }
        } catch (scheduleError) {
          console.error('Error scheduling session:', scheduleError);
          const { toast } = await import('sonner');
          toast.error('Group created but failed to schedule session');
        }
      }
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        subject: '',
        privacy: 'public',
        maxMembers: 50,
        tags: '',
        scheduleSession: false,
        sessionTitle: '',
        sessionDate: '',
        sessionDuration: 60
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxMembers' ? parseInt(value) || 50 : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Create Study Group</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Group Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., JavaScript Study Circle"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              placeholder="Describe what your group will study and its goals..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 inline mr-1" />
              Subject *
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a subject</option>
              <option value="JavaScript">JavaScript</option>
              <option value="React">React</option>
              <option value="Python">Python</option>
              <option value="Data Science">Data Science</option>
              <option value="Machine Learning">Machine Learning</option>
              <option value="Web Development">Web Development</option>
              <option value="Mobile Development">Mobile Development</option>
              <option value="DevOps">DevOps</option>
              <option value="Cybersecurity">Cybersecurity</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Schedule Session Option */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="scheduleSession"
                name="scheduleSession"
                checked={formData.scheduleSession}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduleSession: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="scheduleSession" className="flex items-center text-sm font-medium text-gray-700">
                <Calendar className="w-4 h-4 mr-1" />
                Schedule first study session
              </label>
            </div>
            <p className="text-xs text-gray-600 mt-1 ml-7">
              Create a Google Meet session immediately after creating the group
            </p>
          </div>

          {/* Session Details (shown when scheduling is enabled) */}
          {formData.scheduleSession && (
            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label htmlFor="sessionTitle" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Title
                </label>
                <input
                  type="text"
                  id="sessionTitle"
                  name="sessionTitle"
                  value={formData.sessionTitle}
                  onChange={handleChange}
                  placeholder={`${formData.name} - First Study Session`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sessionDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="sessionDate"
                    name="sessionDate"
                    value={formData.sessionDate}
                    onChange={handleChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (min)
                  </label>
                  <select
                    id="sessionDuration"
                    name="sessionDuration"
                    value={formData.sessionDuration}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Privacy Setting
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="public"
                  checked={formData.privacy === 'public'}
                  onChange={handleChange}
                  className="mr-3 text-blue-600"
                />
                <Globe className="w-4 h-4 mr-2 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Public</div>
                  <div className="text-sm text-gray-500">Anyone can find and join this group</div>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="privacy"
                  value="private"
                  checked={formData.privacy === 'private'}
                  onChange={handleChange}
                  className="mr-3 text-blue-600"
                />
                <Lock className="w-4 h-4 mr-2 text-orange-600" />
                <div>
                  <div className="font-medium text-gray-900">Private</div>
                  <div className="text-sm text-gray-500">Only invited members can join</div>
                </div>
              </label>
            </div>
          </div>

          {/* Max Members */}
          <div>
            <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Maximum Members
            </label>
            <select
              id="maxMembers"
              name="maxMembers"
              value={formData.maxMembers}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={10}>10 members</option>
              <option value={25}>25 members</option>
              <option value={50}>50 members</option>
              <option value={100}>100 members</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g., beginner, frontend, coding-bootcamp (separate with commas)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.subject}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;