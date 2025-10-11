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
  Settings,
  Monitor,
  Phone,
  Share2,
  MessageCircle,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface ModernMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  roomUrl: string;
  groupName: string;
  groupId: string;
}

const ModernMeetingModal: React.FC<ModernMeetingModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  roomUrl,
  groupName
}) => {
  const { user } = useAuth();
  const [meetingDuration, setMeetingDuration] = useState(0);
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
      const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const microphonePermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      setMediaPermissions({
        camera: cameraPermission.state === 'granted',
        microphone: microphonePermission.state === 'granted',
        checked: true
      });

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
    // Create a working meeting URL using Jitsi Meet (free alternative)
    const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
    const jitsiUrl = `https://meet.jit.si/${meetingId}#userInfo.displayName="${userName}"`;
    navigator.clipboard.writeText(jitsiUrl);
    toast.success('Meeting URL copied to clipboard!');
  };

  const joinMeeting = () => {
    // Use Jitsi Meet as a working alternative to 100ms
    const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
    const jitsiUrl = `https://meet.jit.si/${meetingId}#userInfo.displayName="${userName}"`;
    
    const meetingWindow = window.open(
      jitsiUrl, 
      '_blank', 
      'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );
    
    if (meetingWindow) {
      toast.success('Meeting opened in new tab');
      meetingWindow.focus();
      
      // Stop preview stream since we're joining the meeting
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
    } else {
      toast.error('Please allow popups for this site to join the meeting');
    }
  };

  const joinMeetingInSameTab = () => {
    const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
    const jitsiUrl = `https://meet.jit.si/${meetingId}#userInfo.displayName="${userName}"`;
    window.location.href = jitsiUrl;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Video className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900">
                  {groupName}
                </DialogTitle>
                <p className="text-sm text-gray-500">Study Session</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Clock className="h-3 w-3 mr-1" />
                {formatDuration(meetingDuration)}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content - Horizontal Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
          
          {/* Left Column - Meeting Actions */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={joinMeeting}
                className="h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium"
                size="lg"
              >
                <ExternalLink className="h-5 w-5 mr-2" />
                Join Meeting
              </Button>
              
              <Button
                onClick={requestMediaPermissions}
                variant="outline"
                className="h-14 border-2 hover:bg-gray-50"
                size="lg"
              >
                <Settings className="h-5 w-5 mr-2" />
                Test Camera & Mic
              </Button>
            </div>

            {/* Media Status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Device Status
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    {mediaPermissions.camera ? (
                      <Video className="h-4 w-4 text-green-600" />
                    ) : (
                      <VideoOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">Camera</span>
                  </div>
                  <Badge variant={mediaPermissions.camera ? "default" : "secondary"} className="text-xs">
                    {mediaPermissions.camera ? "Ready" : "Not Ready"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex items-center gap-2">
                    {mediaPermissions.microphone ? (
                      <Mic className="h-4 w-4 text-green-600" />
                    ) : (
                      <MicOff className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">Microphone</span>
                  </div>
                  <Badge variant={mediaPermissions.microphone ? "default" : "secondary"} className="text-xs">
                    {mediaPermissions.microphone ? "Ready" : "Not Ready"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Meeting Features */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Available Features</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-green-700">
                  <Video className="h-3 w-3" />
                  HD Video & Audio
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <Share2 className="h-3 w-3" />
                  Screen Sharing
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <MessageCircle className="h-3 w-3" />
                  Real-time Chat
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <Phone className="h-3 w-3" />
                  Phone Dial-in
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <Users className="h-3 w-3" />
                  Up to 75 Participants
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <Monitor className="h-3 w-3" />
                  Recording Available
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Meeting Info */}
          <div className="space-y-4">
            
            {/* Meeting Details */}
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Meeting Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Group:</span>
                  <span className="font-medium text-gray-900">{groupName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Meeting ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      {meetingId.slice(-8)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyMeetingId}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium text-gray-900">{formatDuration(meetingDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Platform:</span>
                  <span className="font-medium text-gray-900">Jitsi Meet</span>
                </div>
              </div>
            </div>

            {/* Share Meeting */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Share Meeting</h3>
              <p className="text-sm text-blue-700 mb-3">
                Invite others to join this study session
              </p>
              <Button
                onClick={copyRoomUrl}
                variant="outline"
                size="sm"
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Meeting Link
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-semibold text-amber-900 mb-2">Tips for Best Experience</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Use headphones to prevent echo</li>
                <li>• Ensure stable internet connection</li>
                <li>• Close other video apps</li>
                <li>• Allow camera & microphone access</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t pt-4 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Meeting ready to join
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              onClick={joinMeeting}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Join Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModernMeetingModal;