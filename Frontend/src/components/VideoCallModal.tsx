import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MessageCircle,
  Monitor,
  Clock,
  PhoneOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '@/lib/utils';
import api from '../lib/api';
import { toast } from 'sonner';

interface VideoCallModalProps {
  groupId: string;
  sessionId: string;
  onClose: () => void;
}

const VideoCallModal: React.FC<VideoCallModalProps> = ({ 
  groupId, 
  sessionId, 
  onClose 
}) => {
  const { user } = useAuth();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [isConnecting, setIsConnecting] = useState(true);
  const [meetingStatus, setMeetingStatus] = useState<any>(null);
  const [meetingLink, setMeetingLink] = useState<string>('');
  const [showGoogleMeet, setShowGoogleMeet] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{id: string, user: string, message: string, time: string}[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize session and get real-time status
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Get real-time meeting status
        const statusResponse = await api.get(`/study-groups/${groupId}/meetings/${sessionId}/status`);
        
        if (statusResponse.data.success) {
          const { meeting, status } = statusResponse.data;
          setMeetingStatus(status);
          setMeetingLink(meeting.meetingLink || '');
          
          // Set session status based on real-time data
          if (status.status === 'active' && status.canJoin) {
            setSessionStatus('active');
          } else if (status.status === 'waiting') {
            setSessionStatus('waiting');
          } else if (status.status === 'completed') {
            setSessionStatus('ended');
          }
        }
        
        setIsConnecting(false);
      } catch (error) {
        console.error('Error getting meeting status:', error);
        // Fallback mode
        setSessionStatus('active');
        setIsConnecting(false);
      }
    };
    
    initializeSession();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(initializeSession, 30000);
    return () => clearInterval(interval);
  }, [groupId, sessionId]);

  const startMeeting = async () => {
    try {
      const response = await api.post(`/study-groups/${groupId}/meetings/${sessionId}/start`);
      if (response.data.success) {
        setSessionStatus('active');
        setMeetingStatus({
          ...meetingStatus,
          status: 'active',
          canJoin: true,
          timeStatus: `Meeting started at ${new Date().toLocaleTimeString()}`,
          isLive: true
        });
        toast.success('Meeting started successfully!');
      }
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast.error('Failed to start meeting');
    }
  };

  const joinGoogleMeet = () => {
    if (meetingLink && meetingLink.startsWith('http')) {
      // Open Google Meet in new tab
      window.open(meetingLink, '_blank');
    } else {
      // Show in-app Google Meet
      setShowGoogleMeet(true);
    }
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
  };

  const toggleAudio = () => {
    setIsAudioOn(!isAudioOn);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
  };

  const sendChatMessage = () => {
    if (!newChatMessage.trim()) return;
    const message = {
      id: `${Date.now()}`,
      user: `${user?.firstName} ${user?.lastName}` || 'You',
      message: newChatMessage,
      time: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, message]);
    setNewChatMessage('');
  };

  const endCall = () => {
    onClose();
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Dialog open={true} onOpenChange={() => endCall()}>
      <DialogContent className="sm:max-w-6xl h-[80vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Study Session
            </DialogTitle>
            {meetingStatus && (
              <div className="flex items-center gap-2">
                {meetingStatus.isLive && (
                  <Badge className="bg-red-100 text-red-700 border-red-200">
                    🔴 LIVE
                  </Badge>
                )}
                <span className="text-sm text-gray-600">
                  {meetingStatus.timeStatus}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {isConnecting ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Connecting to session...</p>
          </div>
        ) : sessionStatus === 'waiting' ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="bg-blue-100 rounded-full p-4 mb-4">
              <Clock className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Meeting Not Started Yet</h3>
            <p className="text-gray-600 mb-4">
              {meetingStatus?.timeStatus || 'Waiting for the meeting to start...'}
            </p>
            {user && (
              <Button onClick={startMeeting} className="bg-green-600 hover:bg-green-700">
                Start Meeting Now
              </Button>
            )}
          </div>
        ) : sessionStatus === 'ended' ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <PhoneOff className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Session Ended</h3>
            <p className="text-gray-600 mb-6">This study session has been ended.</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : showGoogleMeet ? (
          <div className="flex-1 p-4">
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold mb-4">Google Meet Integration</h3>
              <p className="text-gray-600 mb-4">
                Join the meeting using Google Meet for the best experience
              </p>
              {meetingLink && meetingLink.startsWith('http') ? (
                <div className="space-y-4">
                  <Button 
                    onClick={() => window.open(meetingLink, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Open in Google Meet
                  </Button>
                  <div className="text-sm text-gray-500">
                    Meeting Link: {meetingLink}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8">
                    <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Google Meet integration is available but no meeting link was generated.
                      You can still use the in-app meeting features below.
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowGoogleMeet(false)}
                    variant="outline"
                  >
                    Use In-App Meeting
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Main Video Area */}
            <div className="flex-1 bg-gray-900 relative">
              {/* Video or Avatar */}
              <div className="h-full flex items-center justify-center">
                {isVideoOn ? (
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white">
                    <Avatar className="h-24 w-24 mb-4">
                      <AvatarFallback className="bg-gray-700 text-white text-2xl">
                        {getInitials(`${user?.firstName} ${user?.lastName}` || 'You')}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-lg font-medium">Camera is off</p>
                  </div>
                )}
              </div>

              {/* Meeting Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-white rounded-full shadow-lg p-2 flex items-center gap-2">
                  <Button
                    onClick={toggleVideo}
                    size="icon"
                    className={cn(
                      "rounded-full",
                      isVideoOn ? "bg-gray-100 hover:bg-gray-200" : "bg-red-100 hover:bg-red-200"
                    )}
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4 text-red-600" />}
                  </Button>
                  
                  <Button
                    onClick={toggleAudio}
                    size="icon"
                    className={cn(
                      "rounded-full",
                      isAudioOn ? "bg-gray-100 hover:bg-gray-200" : "bg-red-100 hover:bg-red-200"
                    )}
                  >
                    {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4 text-red-600" />}
                  </Button>

                  <Button
                    onClick={toggleScreenShare}
                    size="icon"
                    className={cn(
                      "rounded-full",
                      isScreenSharing ? "bg-blue-100 hover:bg-blue-200" : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <Monitor className={cn("h-4 w-4", isScreenSharing && "text-blue-600")} />
                  </Button>

                  <Button
                    onClick={joinGoogleMeet}
                    size="icon"
                    className="rounded-full bg-green-100 hover:bg-green-200"
                    title="Join with Google Meet"
                  >
                    <Video className="h-4 w-4 text-green-600" />
                  </Button>

                  <Button
                    onClick={() => setShowChat(!showChat)}
                    size="icon"
                    className={cn(
                      "rounded-full",
                      showChat ? "bg-blue-100 hover:bg-blue-200" : "bg-gray-100 hover:bg-gray-200"
                    )}
                  >
                    <MessageCircle className={cn("h-4 w-4", showChat && "text-blue-600")} />
                  </Button>

                  <Button
                    onClick={endCall}
                    size="icon"
                    className="rounded-full bg-red-500 hover:bg-red-600"
                  >
                    <PhoneOff className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Chat Sidebar */}
            {showChat && (
              <div className="w-80 bg-white border-l flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Session Chat
                  </h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">{msg.user}</span>
                        <span className="text-xs text-gray-500">{msg.time}</span>
                      </div>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{msg.message}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendChatMessage} size="icon">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;