import React, { useState, useEffect, useRef } from 'react';
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
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface EmbeddedMeetingInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  roomUrl: string;
  groupName: string;
  groupId: string;
}

const EmbeddedMeetingInterface: React.FC<EmbeddedMeetingInterfaceProps> = ({
  isOpen,
  onClose,
  meetingId,
  roomUrl,
  groupName
}) => {
  const { user } = useAuth();
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaPermissions, setMediaPermissions] = useState({
    camera: false,
    microphone: false,
    checked: false
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);

      checkMediaPermissions();

      return () => clearInterval(timer);
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
      await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setMediaPermissions({
        camera: true,
        microphone: true,
        checked: true
      });
      
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
    const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
    const jitsiUrl = `https://meet.jit.si/${meetingId}#userInfo.displayName="${userName}"`;
    navigator.clipboard.writeText(jitsiUrl);
    toast.success('Meeting URL copied to clipboard!');
  };

  const startEmbeddedMeeting = async () => {
    setIsLoading(true);
    
    // Request permissions first
    try {
      await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setMediaPermissions({
        camera: true,
        microphone: true,
        checked: true
      });
    } catch (error) {
      console.error('Media permission denied:', error);
      toast.error('Please grant camera and microphone permissions to join the meeting');
      setIsLoading(false);
      return;
    }
    
    // Start the embedded meeting
    setTimeout(() => {
      setMeetingStarted(true);
      setIsLoading(false);
      toast.success('Meeting started! Video will load below.');
    }, 2000);
  };

  const openInNewTab = () => {
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
    } else {
      toast.error('Please allow popups for this site');
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const refreshMeeting = () => {
    if (iframeRef.current) {
      const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
      const jitsiUrl = `https://meet.jit.si/${meetingId}#userInfo.displayName="${userName}"`;
      iframeRef.current.src = jitsiUrl;
      toast.success('Meeting refreshed');
    }
  };

  const getMeetingUrl = () => {
    const userName = encodeURIComponent(user?.firstName + ' ' + user?.lastName || 'User');
    return `https://meet.jit.si/${meetingId}#userInfo.displayName="${userName}"`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isFullscreen ? 'max-w-[98vw] h-[98vh]' : 'max-w-6xl h-[90vh]'} w-full mx-4 overflow-hidden flex flex-col`}>
        {/* Header */}
        <DialogHeader className="border-b pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">
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
                onClick={toggleFullscreen}
                className="h-8 w-8 p-0"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              
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

        {/* Main Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {!meetingStarted ? (
            /* Pre-Meeting Setup */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 overflow-y-auto">
              
              {/* Left Column - Meeting Actions */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={startEmbeddedMeeting}
                    disabled={isLoading}
                    className="h-14 bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Video className="h-5 w-5 mr-2" />
                        Start Embedded Meeting
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={openInNewTab}
                    variant="outline"
                    className="h-14 border-gray-300 hover:bg-gray-50"
                    size="lg"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Open in New Tab
                  </Button>
                </div>

                {/* Media Status */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Device Status
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
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
                    
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
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

                  {(!mediaPermissions.camera || !mediaPermissions.microphone) && (
                    <div className="mt-3">
                      <Button
                        onClick={requestMediaPermissions}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Test Permissions Now
                      </Button>
                    </div>
                  )}
                </div>

                {/* Meeting Features */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-medium text-gray-900 mb-3">Available Features</h3>
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
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Meeting Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Group:</span>
                      <span className="font-medium text-gray-900">{groupName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Meeting ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border">
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Share Meeting</h3>
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
              </div>
            </div>
          ) : (
            /* Embedded Meeting Interface */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Meeting Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">Meeting Active</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshMeeting}
                    className="h-8 px-3"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openInNewTab}
                    className="h-8 px-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    New Tab
                  </Button>
                </div>
              </div>

              {/* Embedded Meeting Frame */}
              <div className="flex-1 bg-gray-900 relative overflow-hidden">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                      <p className="text-lg font-medium">Starting your meeting...</p>
                      <p className="text-sm text-gray-300 mt-2">This may take a few seconds</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={getMeetingUrl()}
                    className="w-full h-full border-0"
                    allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-read; clipboard-write"
                    title="Jitsi Meet Video Conference"
                    style={{ 
                      width: '100%', 
                      height: '100%',
                      border: 'none',
                      minHeight: '400px'
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!meetingStarted && (
          <div className="border-t pt-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Meeting ready to start
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Close
              </Button>
              <Button
                onClick={startEmbeddedMeeting}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Start Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmbeddedMeetingInterface;