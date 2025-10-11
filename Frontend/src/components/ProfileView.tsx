import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  Target, 
  Edit2,
  Save,
  X
} from 'lucide-react';
import DynamicUserProgress from './DynamicUserProgress';
import { toast } from 'sonner';

const ProfileView: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      });
    }
  }, [user]);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim()
      });
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || ''
    });
    setIsEditing(false);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLearningStyleColor = (style: string) => {
    const colors = {
      visual: 'bg-blue-100 text-blue-800',
      auditory: 'bg-green-100 text-green-800',
      kinesthetic: 'bg-purple-100 text-purple-800',
      reading: 'bg-orange-100 text-orange-800'
    };
    return colors[style as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDifficultyColor = (level: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.avatar || ''} />
                <AvatarFallback className="bg-gray-100 text-gray-700 text-lg">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{user.firstName} {user.lastName}</h3>
                <p className="text-gray-600 flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              {isEditing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">First Name</Label>
                    <p className="text-sm font-medium">{user.firstName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Last Name</Label>
                    <p className="text-sm font-medium">{user.lastName}</p>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-500">Email Address</Label>
                <p className="text-sm font-medium">{user.email}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(user.createdAt)}
                </p>
              </div>

              {user.lastLogin && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Last Login</Label>
                  <p className="text-sm font-medium">{formatDate(user.lastLogin)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Preferences
            </CardTitle>
            <CardDescription>
              Your personalized learning settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Learning Style</Label>
              <div className="mt-1">
                <Badge className={getLearningStyleColor(user.preferences?.learningStyle || 'visual')}>
                  {user.preferences?.learningStyle || 'Visual'}
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-500">Difficulty Level</Label>
              <div className="mt-1">
                <Badge className={getDifficultyColor(user.preferences?.difficultyLevel || 'beginner')}>
                  {user.preferences?.difficultyLevel || 'Beginner'}
                </Badge>
              </div>
            </div>

            {user.preferences?.studyGoals && user.preferences.studyGoals.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Study Goals</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {user.preferences.studyGoals.map((goal, index) => (
                    <Badge key={index} variant="outline">
                      {goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dynamic Statistics */}
      <DynamicUserProgress userId={user.id} />
    </div>
  );
};

export default ProfileView;