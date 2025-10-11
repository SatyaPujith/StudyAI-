import React, { useState } from 'react';
import { X, BookOpen, Clock, Target, Upload, FileText, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import dataService from '../services/dataService';

interface SimpleCreateStudyPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SimpleCreateStudyPlanModal: React.FC<SimpleCreateStudyPlanModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    subject: '',
    level: '',
    duration: '',
    learningStyle: '',
    description: ''
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.level || !formData.duration || !formData.learningStyle) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    try {
      let studyPlan;

      if (uploadedFiles.length > 0) {
        // Upload files and generate study plan
        const formDataObj = new FormData();
        uploadedFiles.forEach(file => {
          formDataObj.append('files', file);
        });
        formDataObj.append('subject', formData.subject);
        formDataObj.append('level', formData.level);
        formDataObj.append('duration', formData.duration);
        formDataObj.append('learningStyle', formData.learningStyle);
        
        // Add description if provided
        if (formData.description.trim()) {
          formDataObj.append('description', formData.description);
        }

        const { uploadAPI } = await import('../lib/api');
        const response = await uploadAPI.uploadSyllabus(formDataObj);
        studyPlan = response.data.studyPlan;
      } else {
        // Create study plan from manual input
        const studyPlanData = {
          subject: formData.subject,
          level: formData.level,
          duration: formData.duration,
          learningStyle: formData.learningStyle,
          goals: ['exam_prep', 'skill_building']
        };

        // If description is provided, treat it as syllabus content
        if (formData.description.trim()) {
          studyPlanData.syllabus = formData.description;
          studyPlanData.description = `Study plan for ${formData.subject} based on provided syllabus`;
        } else {
          studyPlanData.description = `Comprehensive study plan for ${formData.subject}`;
        }

        studyPlan = await dataService.createStudyPlan(studyPlanData);
      }

      if (studyPlan) {
        toast.success('Study plan generated successfully!');
        
        // Reset form
        setFormData({
          subject: '',
          level: '',
          duration: '',
          learningStyle: '',
          description: ''
        });
        setUploadedFiles([]);
        
        onClose();
        if (onSuccess) onSuccess();
      } else {
        toast.error('Failed to generate study plan');
      }
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast.error('Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Study Plan</h2>
              <p className="text-sm text-gray-500">Generate your personalized learning path</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column */}
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject/Course *
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="e.g., JavaScript, Data Science, Machine Learning"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Level */}
              <div>
                <label htmlFor="level" className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-1" />
                  Difficulty Level *
                </label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Duration *
                </label>
                <select
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select duration</option>
                  <option value="1 day">1 day (Exam Prep)</option>
                  <option value="3 days">3 days</option>
                  <option value="7 days">1 week</option>
                  <option value="14 days">2 weeks</option>
                  <option value="30 days">1 month</option>
                  <option value="60 days">2 months</option>
                  <option value="90 days">3 months</option>
                </select>
              </div>

              {/* Learning Style */}
              <div>
                <label htmlFor="learningStyle" className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Style *
                </label>
                <select
                  id="learningStyle"
                  name="learningStyle"
                  value={formData.learningStyle}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select style</option>
                  <option value="visual">Visual</option>
                  <option value="auditory">Auditory</option>
                  <option value="reading">Reading/Writing</option>
                  <option value="kinesthetic">Kinesthetic (Hands-on)</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Description/Syllabus */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Syllabus/Description (optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Paste your syllabus content here, or describe your learning goals and specific topics you want to focus on..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If you provide syllabus content, the AI will generate a more targeted study plan based on it.
                </p>
              </div>

              {/* File Upload */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Materials (optional)
                </h3>
                
                {uploadedFiles.length === 0 ? (
                  <div>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-colors"
                    >
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Upload syllabus or course materials</p>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT files</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-white rounded-lg border">
                        <FileText className="w-4 h-4 text-gray-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <X className="w-3 h-3 text-gray-500" />
                        </button>
                      </div>
                    ))}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="add-more-files"
                    />
                    <label
                      htmlFor="add-more-files"
                      className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Add more files
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !formData.subject || !formData.level || !formData.duration || !formData.learningStyle}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[140px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleCreateStudyPlanModal;