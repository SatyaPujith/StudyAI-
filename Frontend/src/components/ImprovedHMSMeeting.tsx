import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff,
  Mic,
  MicOff,
  Users, 
  Clock,
  ExternalLink,
  Copy,
  Play,
  Loader2,
  Settings,
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface ImprovedHMSMeetingProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  roomUrl: string;
  groupName: string;
  groupId: string;
}

const ImprovedHMSMeeting: React.FC<ImprovedHMSMeetingProps> = ({
  isOpen,
  onClose,
  meetingId,
  roomUrl,
  groupName,
  groupId
}) => {
  const { user } = useAuth();
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [authToken, setAuthToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
    checked: false
  });
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);

      generateAuthToken();
      checkMediaPermissions();

      return () => {
        clearInterval(timer);
        if (previewStream) {
          previewStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [isOpen, meetingId]);

  const checkMediaPermissions = async () => {
    try {
      // Check if permissions are already granted
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      setMediaPermissions({
        camera: cameraPermission.state === 'granted',
        microphone: microphonePermission.state === 'granted',
        checked: true
      });

      // If permissions are granted, get preview stream
      if (cameraPermission.state === 'granted' && microphonePermission.state === 'granted') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
          });
          setPreviewStream(stream);
        } catch (error) {
          console.log('Could not get media stream:', error);
        }
      }
    } catch (error) {
      console.log('Permission check not supported:', error);
      setMediaPermissions({
        camera: false,
        microphone: false,
        checked: true
      });
    }
  };

  const requestMediaPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setMediaPermissions({
        camera: true,
        microphone: true,
        checked: true
      });
      
      setPreviewStream(stream);
      toast.success('Camera and microphone access granted!');
    } catch (error) {
      console.error('Media permission denied:', error);
      toast.error('Camera and microphone access denied. Please enable them in your browser settings.');
      
      setMediaPermissions({
        camera: false,
        microphone: false,
        checked: true
      });
    }
  };

  const generateAuthToken = async () => {
    setIsLoadingToken(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/hms/get-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId: user?.id || 'user123',
          roomId: meetingId,
          role: 'guest',
          userName: user?.firstName + ' ' + user?.lastName || 'User'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.token);
        console.log('100ms auth token generated successfully');
      } else {
        console.error('Failed to generate auth token');
        toast.error('Failed to generate meeting token');
      }
    } catch (error) {
      console.error('Error generating auth token:', error);
      toast.error('Failed to connect to meeting service');
    } finally {
      setIsLoadingToken(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast.success('Meeting ID copied to clipboard!');
  };

  const copyRoomUrl = () => {
    if (authToken) {
      const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
      const hmsUrl = `https://app.100ms.live/preview/${authToken}?name=${userName}`;
      navigator.clipboard.writeText(hmsUrl);
      toast.success('Meeting URL copied to clipboard!');
    } else {
      toast.error('Meeting URL not available yet');
    }
  };

  const joinMeeting = () => {
    // If we have an auth token, use the preview URL
    if (authToken) {
      if (!mediaPermissions.camera || !mediaPermissions.microphone) {
        toast.error('Please grant camera and microphone permissions first');
        return;
      }

      const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
      const hmsUrl = `https://app.100ms.live/preview/${authToken}?name=${userName}`;
      
      const meetingWindow = window.open(
        hmsUrl, 
        '_blank', 
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );
      
      if (meetingWindow) {
        toast.success('100ms meeting opened in new tab');
        meetingWindow.focus();
        
        // Stop preview stream since we're joining the meeting
        if (previewStream) {
          previewStream.getTracks().forEach(track => track.stop());
          setPreviewStream(null);
        }
      } else {
        toast.error('Please allow popups for this site to join the meeting');
      }
    } else {
      // Fallback: use the room URL directly
      const meetingWindow = window.open(
        roomUrl, 
        '_blank', 
        'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
      );
      
      if (meetingWindow) {
        toast.success('Meeting opened in new tab');
        meetingWindow.focus();
      } else {
        toast.error('Please allow popups for this site to join the meeting');
      }
    }
  };

  const joinMeetingInSameTab = () => {
    if (authToken) {
      if (!mediaPermissions.camera || !mediaPermissions.microphone) {
        toast.error('Please grant camera and microphone permissions first');
        return;
      }

      const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
      const hmsUrl = `https://app.100ms.live/preview/${authToken}?name=${userName}`;
      window.location.href = hmsUrl;
    } else {
      // Fallback: use the room URL directly
      window.location.href = roomUrl;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {groupName} - Study Session
                </DialogTitle>
                <Badge variant="outline" className="mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(meetingDuration)}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyMeetingId}
                className="text-xs"
                title="Copy Meeting ID"
              >
                <Copy className="h-3 w-3 mr-1" />
                ID
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomUrl}
                className="text-xs"
                title="Copy Meeting URL"
                disabled={!authToken}
              >
                <Copy className="h-3 w-3 mr-1" />
                URL
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Media Permissions Check */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Camera & Microphone Setup
            </h4>
            
            {!mediaPermissions.checked ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Checking permissions...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mediaPermissions.camera ? (
                      <Video className="h-4 w-4 text-green-600" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Camera</span>
                  </div>
                  <Badge variant={mediaPermissions.camera ? "default" : "destructive"}>
                    {mediaPermissions.camera ? "Granted" : "Denied"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mediaPermissions.microphone ? (
                      <Mic className="h-4 w-4 text-green-600" />
                    ) : (
                      <MicOff className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Microphone</span>
                  </div>
                  <Badge variant={mediaPermissions.microphone ? "default" : "destructive"}>
                    {mediaPermissions.microphone ? "Granted" : "Denied"}
                  </Badge>
                </div>
                
                {(!mediaPermissions.camera || !mediaPermissions.microphone) && (
                  <Button
                    onClick={requestMediaPermissions}
                    className="w-full mt-3"
                    variant="outline"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Grant Camera & Microphone Access
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Meeting Status */}
          <div className="text-center py-6">
            <div className="bg-blue-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Video className="h-10 w-10 text-blue-600" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2">100ms Video Meeting Ready</h3>
            <p className="text-gray-600 mb-4">
              Professional video conferencing with HD quality
            </p>

            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 mb-6">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>Up to 20 participants</span>
              </div>
              <div className="flex items-center gap-1">
                <Monitor className="h-4 w-4" />
                <span>Screen sharing</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(meetingDuration)} elapsed</span>
              </div>
            </div>

            <Badge className="bg-blue-100 text-blue-700 mb-6">
              Powered by 100ms
            </Badge>
          </div>

          {/* Meeting Actions */}
          <div className="space-y-4">
            {isLoadingToken ? (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Preparing meeting room...</p>
              </div>
            ) : authToken ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={joinMeeting}
                    className="bg-blue-600 hover:bg-blue-700 h-12"
                    size="lg"
                    disabled={!mediaPermissions.camera || !mediaPermissions.microphone}
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Join in New Tab
                  </Button>
                  
                  <Button
                    onClick={joinMeetingInSameTab}
                    variant="outline"
                    className="h-12"
                    size="lg"
                    disabled={!mediaPermissions.camera || !mediaPermissions.microphone}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Join Here
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    {(!mediaPermissions.camera || !mediaPermissions.microphone) 
                      ? "Please grant camera and microphone permissions to join"
                      : "Recommended: Use 'Join in New Tab' for the best experience"
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-red-600">Failed to prepare meeting room</p>
                <Button
                  onClick={generateAuthToken}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}
          </div>

          {/* Features List */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-medium mb-3 text-green-800">Available Features</h4>
            <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
              <div>✅ HD Video & Audio</div>
              <div>✅ Screen Sharing</div>
              <div>✅ Real-time Chat</div>
              <div>✅ Recording (if enabled)</div>
              <div>✅ Mobile Support</div>
              <div>✅ Up to 20 Participants</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            
            {authToken && (mediaPermissions.camera && mediaPermissions.microphone) && (
              <Button
                onClick={joinMeeting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Join Meeting
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImprovedHMSMeeting;