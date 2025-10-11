import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import ChangePasswordModal from './ChangePasswordModal';
import { 
  Bell, 
  User, 
  Shield, 
  Palette,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface UserPreferences {
  learningStyle: string;
  difficultyLevel: string;
  studyGoals: string[];
  notifications: {
    email: boolean;
    push: boolean;
    studyReminders: boolean;
  };
}

const SettingsView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    learningStyle: 'visual',
    difficultyLevel: 'beginner',
    studyGoals: [],
    notifications: {
      email: true,
      push: true,
      studyReminders: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  useEffect(() => {
    if (user?.preferences) {
      setPreferences({
        learningStyle: user.preferences.learningStyle || 'visual',
        difficultyLevel: user.preferences.difficultyLevel || 'beginner',
        studyGoals: user.preferences.studyGoals || [],
        notifications: {
          email: user.preferences.notifications?.email ?? true,
          push: user.preferences.notifications?.push ?? true,
          studyReminders: user.preferences.notifications?.studyReminders ?? true
        }
      });
    }
  }, [user]);

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleStudyGoalChange = (goal: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      studyGoals: checked 
        ? [...prev.studyGoals, goal]
        : prev.studyGoals.filter(g => g !== goal)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({ preferences });
      setHasChanges(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (user?.preferences) {
      setPreferences({
        learningStyle: user.preferences.learningStyle || 'visual',
        difficultyLevel: user.preferences.difficultyLevel || 'beginner',
        studyGoals: user.preferences.studyGoals || [],
        notifications: {
          email: user.preferences.notifications?.email ?? true,
          push: user.preferences.notifications?.push ?? true,
          studyReminders: user.preferences.notifications?.studyReminders ?? true
        }
      });
      setHasChanges(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/export-data`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Data exported successfully');
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('This will permanently delete all your data. Type "DELETE" to confirm.')) {
        const confirmation = window.prompt('Type "DELETE" to confirm account deletion:');
        if (confirmation === 'DELETE') {
          deleteAccount();
        } else {
          toast.error('Account deletion cancelled');
        }
      }
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Account deleted successfully');
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        toast.error('Failed to delete account');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Apply theme immediately
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System theme
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    
    toast.success('Theme updated successfully');
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    toast.success('Language updated successfully');
    
    // In a real app, you would reload the page or update the i18n context
    if (newLanguage !== 'en') {
      toast.info('Language change will take effect after page reload');
    }
  };

  const studyGoalOptions = [
    { id: 'exam_prep', label: 'Exam Preparation' },
    { id: 'skill_building', label: 'Skill Building' },
    { id: 'certification', label: 'Certification' },
    { id: 'general_learning', label: 'General Learning' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Customize your learning experience</p>
        </div>
        
        {hasChanges && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Learning Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Learning Preferences
            </CardTitle>
            <CardDescription>
              Customize how you learn and what content you see
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="learningStyle">Learning Style</Label>
              <Select
                value={preferences.learningStyle}
                onValueChange={(value) => handlePreferenceChange('learningStyle', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your learning style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual">Visual - Learn through images and diagrams</SelectItem>
                  <SelectItem value="auditory">Auditory - Learn through listening</SelectItem>
                  <SelectItem value="kinesthetic">Kinesthetic - Learn through hands-on activities</SelectItem>
                  <SelectItem value="reading">Reading/Writing - Learn through text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficultyLevel">Difficulty Level</Label>
              <Select
                value={preferences.difficultyLevel}
                onValueChange={(value) => handlePreferenceChange('difficultyLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner - New to the subject</SelectItem>
                  <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                  <SelectItem value="advanced">Advanced - Experienced learner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Study Goals</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {studyGoalOptions.map((goal) => (
                  <div key={goal.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal.id}
                      checked={preferences.studyGoals.includes(goal.id)}
                      onCheckedChange={(checked) => 
                        handleStudyGoalChange(goal.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={goal.id}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {goal.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">
                  Receive updates and announcements via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.notifications.email}
                onCheckedChange={(checked) => handleNotificationChange('email', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-gray-500">
                  Receive real-time notifications in your browser
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.notifications.push}
                onCheckedChange={(checked) => handleNotificationChange('push', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="study-reminders">Study Reminders</Label>
                <p className="text-sm text-gray-500">
                  Get reminded about your study sessions and goals
                </p>
              </div>
              <Switch
                id="study-reminders"
                checked={preferences.notifications.studyReminders}
                onCheckedChange={(checked) => handleNotificationChange('studyReminders', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account & Security
            </CardTitle>
            <CardDescription>
              Manage your account security and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Change Password</h4>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setChangePasswordModalOpen(true)}
              >
                Change Password
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-500">Add an extra layer of security</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => toast.info('2FA setup will be available in the next update')}
              >
                Enable 2FA
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Download Data</h4>
                <p className="text-sm text-gray-500">Export your study data and progress</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDownloadData}
              >
                Download
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
              <div>
                <h4 className="font-medium text-red-900">Delete Account</h4>
                <p className="text-sm text-red-600">Permanently delete your account and data</p>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteAccount}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              App Preferences
            </CardTitle>
            <CardDescription>
              Customize the app appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Theme</Label>
                <p className="text-sm text-gray-500">Choose your preferred theme</p>
              </div>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Language</Label>
                <p className="text-sm text-gray-500">Select your preferred language</p>
              </div>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChangePasswordModal
        open={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
    </div>
  );
};

export default SettingsView;