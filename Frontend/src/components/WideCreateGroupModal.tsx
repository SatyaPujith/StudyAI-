import React, { useState } from 'react';
import { X, Users, BookOpen, Calendar, Globe, Lock, Tag, Clock } from 'lucide-react';

interface WideCreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: any) => Promise<any>;
}

const WideCreateGroupModal: React.FC<WideCreateGroupModalProps> = ({ isOpen, onClose, onCreateGroup }) => {
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
      
      // If scheduling is enabled, schedule the session
      if (formData.scheduleSession && formData.sessionDate && createdGroup && (createdGroup._id || createdGroup.id)) {
        try {
          const groupId = createdGroup._id || createdGroup.id;
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
            const { toast } = await import('sonner');
            toast.success(`Group created and session scheduled!`);
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Create Study Group</h2>
              <p className="text-sm text-gray-600">Build your learning community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form - Wide Layout */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                
                {/* Group Name */}
                <div className="mb-4">
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

                {/* Subject */}
                <div className="mb-4">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
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
                    rows={4}
                    placeholder="Describe what your group will study and its goals..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Privacy & Settings */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-green-600" />
                  Privacy & Settings
                </h3>
                
                {/* Privacy */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Privacy Setting
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors">
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
                        <div className="font-medium text-gray-900 text-sm">Public</div>
                        <div className="text-xs text-gray-500">Anyone can join</div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-white transition-colors">
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
                        <div className="font-medium text-gray-900 text-sm">Private</div>
                        <div className="text-xs text-gray-500">Invite only</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Max Members */}
                <div className="mb-4">
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
                    <Tag className="w-4 h-4 inline mr-1" />
                    Tags (optional)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="e.g., beginner, frontend, coding-bootcamp"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
                </div>
              </div>
            </div>

            {/* Right Column - Session Scheduling */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  Schedule First Session
                </h3>
                
                {/* Schedule Session Toggle */}
                <div className="mb-6">
                  <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border">
                    <input
                      type="checkbox"
                      id="scheduleSession"
                      name="scheduleSession"
                      checked={formData.scheduleSession}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduleSession: e.target.checked }))}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="scheduleSession" className="text-sm font-medium text-gray-700">
                        Schedule first study session
                      </label>
                      <p className="text-xs text-gray-600">
                        Create a video meeting immediately after creating the group
                      </p>
                    </div>
                  </div>
                </div>

                {/* Session Details */}
                {formData.scheduleSession && (
                  <div className="space-y-4 bg-white rounded-lg p-4 border">
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
                        <Clock className="w-4 h-4 inline mr-1" />
                        Duration
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
                )}
              </div>

              {/* Tips */}
              <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-lg font-semibold text-amber-900 mb-3">💡 Tips for Success</h3>
                <ul className="text-sm text-amber-800 space-y-2">
                  <li>• Choose a clear, descriptive name for your group</li>
                  <li>• Add relevant tags to help others find your group</li>
                  <li>• Set a reasonable member limit for effective discussions</li>
                  <li>• Schedule regular sessions to keep momentum</li>
                  <li>• Write a compelling description to attract members</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name || !formData.subject}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-medium min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WideCreateGroupModal;