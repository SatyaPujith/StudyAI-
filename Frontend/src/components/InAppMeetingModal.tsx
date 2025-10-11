import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  MessageCircle, 
  Phone, 
  Share2,
  Settings,
  Monitor,
  Copy,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface InAppMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  groupName: string;
}

const InAppMeetingModal: React.FC<InAppMeetingModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  groupName
}) => {
  const { user } = useAuth();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'System', message: 'Welcome to the study session!', time: new Date() },
    { id: 2, user: 'John Doe', message: 'Hey everyone! Ready to study?', time: new Date() }
  ]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [participants] = useState([
    { id: 1, name: user?.firstName + ' ' + user?.lastName || 'You', isHost: true, isVideoOn: true, isAudioOn: true },
    { id: 2, name: 'John Doe', isHost: false, isVideoOn: true, isAudioOn: true },
    { id: 3, name: 'Jane Smith', isHost: false, isVideoOn: false, isAudioOn: true }
  ]);

  useEffect(() => {
    if (isOpen) {
      const timer = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast.success('Meeting ID copied to clipboard!');
  };

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        user: user?.firstName + ' ' + user?.lastName || 'You',
        message: chatMessage.trim(),
        time: new Date()
      }]);
      setChatMessage('');
    }
  };

  const openGoogleMeet = () => {
    // Generate a Google Meet link (this would be replaced with actual Google Meet integration)
    const meetLink = `https://meet.google.com/${meetingId.replace('meeting-', '')}`;
    window.open(meetLink, '_blank');
    toast.info('Opening Google Meet in new tab...');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl h-[85vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-600" />
                {groupName} - Study Session
                <Badge variant="outline" className="ml-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(meetingDuration)}
                </Badge>
              </DialogTitle>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMeetingId}
                  className="text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  ID: {meetingId.slice(-6)}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGoogleMeet}
                  className="text-xs"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Open in Google Meet
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Video Area */}
              <div className="flex-1 bg-gray-900 relative">
                {/* Main Video Display */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Video className="h-20 w-20 mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-medium mb-2">Study Session in Progress</p>
                    <p className="text-sm opacity-75">
                      {participants.length} participants • {formatDuration(meetingDuration)} elapsed
                    </p>
                  </div>
                </div>

                {/* Participants Grid */}
                <div className="absolute top-4 right-4 space-y-2 max-w-xs">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="bg-gray-800 rounded-lg p-3 border border-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {participant.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {participant.name}
                            {participant.isHost && (
                              <Badge variant="secondary" className="ml-1 text-xs">Host</Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {participant.isVideoOn ? (
                              <Video className="h-3 w-3 text-green-400" />
                            ) : (
                              <VideoOff className="h-3 w-3 text-red-400" />
                            )}
                            {participant.isAudioOn ? (
                              <Mic className="h-3 w-3 text-green-400" />
                            ) : (
                              <MicOff className="h-3 w-3 text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Meeting Info Overlay */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
                  <p className="text-sm font-medium">{groupName}</p>
                  <p className="text-xs opacity-75">Meeting ID: {meetingId}</p>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="bg-gray-100 p-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">{participants.length} participants</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">{formatDuration(meetingDuration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant={isAudioOn ? "default" : "destructive"}
                      size="sm"
                      onClick={() => setIsAudioOn(!isAudioOn)}
                    >
                      {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant={isVideoOn ? "default" : "destructive"}
                      size="sm"
                      onClick={() => setIsVideoOn(!isVideoOn)}
                    >
                      {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>

                    <Button
                      variant={isScreenSharing ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsScreenSharing(!isScreenSharing)}
                    >
                      <Monitor className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChat(!showChat)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>

                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>

                    <Button variant="destructive" size="sm" onClick={onClose}>
                      <Phone className="h-4 w-4" />
                      Leave
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Sidebar */}
            {showChat && (
              <div className="w-80 border-l bg-white flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="font-medium flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{msg.user}</span>
                        <span className="text-xs text-gray-500">
                          {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{msg.message}</p>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={sendChatMessage}>
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InAppMeetingModal;