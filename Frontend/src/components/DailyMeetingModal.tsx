import React, { useState, useEffect, useRef } from 'react';
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
  Monitor,
  Settings,
  Copy,
  Clock,
  ExternalLink,
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

interface DailyMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  roomUrl: string;
  groupName: string;
  groupId: string;
}

const DailyMeetingModal: React.FC<DailyMeetingModalProps> = ({
  isOpen,
  onClose,
  meetingId,
  roomUrl,
  groupName,
  groupId
}) => {
  const { user } = useAuth();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, user: 'System', message: `Welcome to ${groupName} study session!`, time: new Date() }
  ]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participants] = useState([
    { 
      id: 1, 
      name: user?.firstName + ' ' + user?.lastName || 'You', 
      isHost: true, 
      isVideoOn: true, 
      isAudioOn: true,
      isLocal: true
    }
  ]);
  
  const dailyFrameRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const copyRoomUrl = () => {
    const fullUrl = roomUrl.startsWith('http') ? roomUrl : `https://${roomUrl}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Room URL copied to clipboard!');
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

  const openInNewTab = () => {
    const fullUrl = getDailyEmbedUrl();
    
    if (fullUrl) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      toast.info('Opening Daily.co room in new tab...');
    } else {
      toast.error('No valid room URL available');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const getDailyEmbedUrl = () => {
    console.log('DailyMeetingModal - roomUrl:', roomUrl);
    console.log('DailyMeetingModal - meetingId:', meetingId);
    
    // First priority: use the roomUrl if it's a proper HTTP URL
    if (roomUrl && roomUrl.startsWith('http')) {
      console.log('Using roomUrl:', roomUrl);
      return roomUrl;
    }
    
    // Second priority: handle fallback URLs
    if (roomUrl && roomUrl.startsWith('#daily-room-')) {
      const roomName = roomUrl.replace('#daily-room-', '');
      const fallbackUrl = `https://${roomName}.daily.co/${roomName}`;
      console.log('Using fallback URL:', fallbackUrl);
      return fallbackUrl;
    }
    
    // Third priority: create URL from meeting ID if available and it looks like a room name
    if (meetingId && 
        meetingId !== 'new-session' && 
        meetingId !== 'active-session' &&
        meetingId.includes('-')) { // Only if it looks like a room name with dashes
      const idUrl = `https://${meetingId}.daily.co/${meetingId}`;
      console.log('Using meetingId URL:', idUrl);
      return idUrl;
    }
    
    console.log('No valid URL found, returning null');
    console.log('Available data - roomUrl:', roomUrl, 'meetingId:', meetingId);
    return null;
  };

  const embedUrl = getDailyEmbedUrl();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${isFullscreen ? 'w-screen h-screen max-w-none m-0' : 'sm:max-w-6xl h-[85vh] max-h-[90vh]'} p-0 overflow-hidden`}
        ref={containerRef}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between min-h-[40px]">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Video className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <DialogTitle className="text-base font-semibold truncate">
                    {groupName} - Daily.co Meeting
                  </DialogTitle>
                  <Badge variant="outline" className="w-fit mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDuration(meetingDuration)}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyMeetingId}
                  className="text-xs px-2 py-1"
                  title="Copy Meeting ID"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  ID
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInNewTab}
                  className="text-xs px-2 py-1"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="text-xs px-2 py-1"
                  title="Toggle fullscreen"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 flex">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              {/* Daily.co Embed */}
              <div className="flex-1 bg-gray-900 relative">
                {embedUrl ? (
                  <>
                    <iframe
                      ref={dailyFrameRef}
                      src={embedUrl}
                      className="w-full h-full border-0"
                      allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
                      title="Daily.co Meeting Room"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
                    />
                    
                    {/* Overlay controls for iframe */}
                    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
                      <p className="font-medium">{groupName}</p>
                      <p className="text-xs opacity-75">Room: {meetingId.slice(-8)}</p>
                    </div>
                    
                    {/* Loading indicator */}
                    <div className="absolute inset-0 bg-gray-900 flex items-center justify-center" 
                         style={{ display: 'none' }} 
                         id="loading-indicator">
                      <div className="text-center text-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p>Loading Daily.co room...</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white max-w-md">
                      <Video className="h-20 w-20 mx-auto mb-4 opacity-50" />
                      <p className="text-xl font-medium mb-2">Daily.co Meeting Room</p>
                      <p className="text-sm opacity-75 mb-4">
                        {participants.length} participants • {formatDuration(meetingDuration)} elapsed
                      </p>
                      <div className="space-y-3">
                        <Button
                          onClick={openInNewTab}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Join in Daily.co
                        </Button>
                        <div className="text-xs opacity-60 space-y-1">
                          <p>Room: {meetingId}</p>
                          <p>Click "Join in Daily.co" to start the meeting</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Participants Overlay (only for fallback) */}
                {!embedUrl && (
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
                              {participant.isLocal && (
                                <Badge variant="outline" className="ml-1 text-xs">You</Badge>
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
                )}

                {/* Meeting Info Overlay */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
                  <p className="text-sm font-medium">{groupName}</p>
                  <p className="text-xs opacity-75">Daily.co Room: {meetingId}</p>
                  <p className="text-xs opacity-75">Duration: {formatDuration(meetingDuration)}</p>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="bg-gray-100 p-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">{participants.length} participants</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="text-sm text-gray-600">{formatDuration(meetingDuration)}</span>
                    </div>

                    <Badge className="bg-green-100 text-green-700 text-xs">
                      Daily.co
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {embedUrl ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={openInNewTab}
                          title="Open in new tab for full functionality"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Open</span>
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChat(!showChat)}
                          title="Toggle chat"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant={isAudioOn ? "default" : "destructive"}
                          size="sm"
                          onClick={() => setIsAudioOn(!isAudioOn)}
                          title="Toggle microphone"
                        >
                          {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                        </Button>

                        <Button
                          variant={isVideoOn ? "default" : "destructive"}
                          size="sm"
                          onClick={() => setIsVideoOn(!isVideoOn)}
                          title="Toggle camera"
                        >
                          {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                        </Button>

                        <Button
                          variant={isScreenSharing ? "default" : "outline"}
                          size="sm"
                          onClick={() => setIsScreenSharing(!isScreenSharing)}
                          title="Share screen"
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChat(!showChat)}
                          title="Toggle chat"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={onClose}
                      title="Leave meeting"
                    >
                      <Phone className="h-4 w-4 mr-1" />
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
                    Meeting Chat
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
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{msg.message}</p>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
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

export default DailyMeetingModal;