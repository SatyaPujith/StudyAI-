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
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface EmbeddedMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  roomUrl: string;
  groupName: string;
  groupId: string;
}

const EmbeddedMeetingModal: React.FC<EmbeddedMeetingModalProps> = ({
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, meetingId]);

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

  const startEmbeddedMeeting = () => {
    setIsLoading(true);
    setMeetingStarted(true);
    
    // Simulate loading time
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Meeting started! Video will load in the frame below.');
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
      <DialogContent className={`${isFullscreen ? 'max-w-[95vw] h-[95vh]' : 'max-w-6xl h-[80vh]'} w-full mx-4 overflow-hidden`}>
        {/* Header */}
        <DialogHeader className="border-b pb-4 flex-shrink-0">
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
        <div className="flex-1 flex flex-col min-h-0">
          {!meetingStarted ? (
            /* Pre-Meeting Setup */
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">
              
              {/* Left Column - Meeting Actions */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={startEmbeddedMeeting}
                    disabled={isLoading}
                    className="h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
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
                    className="h-16 border-2 hover:bg-gray-50"
                    size="lg"
                  >
                    <ExternalLink className="h-5 w-5 mr-2" />
                    Open in New Tab
                  </Button>
                </div>

                {/* Meeting Features */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Available Features</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-green-700">
                      <Video className="h-4 w-4" />
                      HD Video & Audio
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Share2 className="h-4 w-4" />
                      Screen Sharing
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <MessageCircle className="h-4 w-4" />
                      Real-time Chat
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Phone className="h-4 w-4" />
                      Phone Dial-in
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Users className="h-4 w-4" />
                      Up to 75 Participants
                    </div>
                    <div className="flex items-center gap-2 text-green-700">
                      <Monitor className="h-4 w-4" />
                      Recording Available
                    </div>
                  </div>
                </div>

                {/* Embedded vs New Tab Comparison */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3">Meeting Options</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">📱 Embedded Meeting</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• Stay in StudyAI app</li>
                        <li>• Easy to switch between features</li>
                        <li>• Integrated experience</li>
                        <li>• Quick access to study tools</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">🚀 New Tab Meeting</h4>
                      <ul className="text-gray-600 space-y-1">
                        <li>• Full Jitsi Meet interface</li>
                        <li>• Better performance</li>
                        <li>• All advanced features</li>
                        <li>• Dedicated meeting space</li>
                      </ul>
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
                  <h3 className="font-semibold text-amber-900 mb-2">💡 Tips</h3>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Use headphones to prevent echo</li>
                    <li>• Ensure stable internet connection</li>
                    <li>• Grant camera & microphone access</li>
                    <li>• Try "New Tab" if embedded has issues</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            /* Meeting Interface */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Meeting Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
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
              <div className="flex-1 bg-gray-900 relative">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-lg font-medium">Starting your meeting...</p>
                      <p className="text-sm text-gray-300 mt-2">This may take a few seconds</p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    ref={iframeRef}
                    src={getMeetingUrl()}
                    className="w-full h-full border-0"
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    title="Jitsi Meet Video Conference"
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
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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

export default EmbeddedMeetingModal;