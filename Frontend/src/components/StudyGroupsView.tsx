import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, MessageCircle, Video, Clock, Search } from 'lucide-react';
import SimpleCreateGroupModal from './SimpleCreateGroupModal';
import GroupChatModal from './GroupChatModal';
import ScheduleSessionModal from './ScheduleSessionModal';
import FinalMeetingModal from './FinalMeetingModal';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface StudyGroup {
  id: string;
  name: string;
  members: number;
  activeMembers: string[];
  topic: string;
  nextSession: string;
  isActive: boolean;
  creatorId?: string;
  nextSessionId?: string | null;
  hasScheduledSession?: boolean;
}

const studyGroups: StudyGroup[] = [
  {
    id: 'mock-1',
    name: 'Data Structures & Algorithms',
    members: 8,
    activeMembers: ['AM', 'JS', 'MK', 'RW'],
    topic: 'Binary Trees',
    nextSession: '2:00 PM Today',
    isActive: true
  },
  {
    id: 'mock-2',
    name: 'Computer Networks',
    members: 6,
    activeMembers: ['TL', 'NK', 'SM'],
    topic: 'TCP/IP Protocol',
    nextSession: 'Tomorrow 10 AM',
    isActive: false
  }
];

const StudyGroupsView: React.FC = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StudyGroup[]>(studyGroups);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGroupForChat, setSelectedGroupForChat] = useState<string | null>(null);
  const [selectedGroupForSchedule, setSelectedGroupForSchedule] = useState<string | null>(null);
  const [hmsMeeting, setHmsMeeting] = useState<{
    isOpen: boolean;
    meetingId: string;
    roomUrl: string;
    groupName: string;
    groupId: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningByCode, setIsJoiningByCode] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const [meetingStatuses, setMeetingStatuses] = useState<{[key: string]: any}>({});

  // Load groups from API
  useEffect(() => {
    loadGroups();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      updateMeetingStatuses();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const updateMeetingStatuses = async () => {
    try {
      const response = await api.get('/study-groups');
      if (response.data.success) {
        const groups = response.data.groups || response.data.studyGroups || [];
        const statusUpdates: {[key: string]: any} = {};
        
        for (const group of groups) {
          const meetings = group.meetings || group.sessions || [];
          for (const meeting of meetings) {
            if (meeting._id) {
              try {
                const statusResponse = await api.get(`/study-groups/${group._id}/meetings/${meeting._id}/status`);
                if (statusResponse.data.success) {
                  statusUpdates[`${group._id}-${meeting._id}`] = statusResponse.data.status;
                }
              } catch (error) {
                // Ignore individual meeting status errors
              }
            }
          }
        }
        
        setMeetingStatuses(statusUpdates);
      }
    } catch (error) {
      // Ignore errors in background updates
    }
  };

  const loadGroups = async () => {
    // Rate limiting: don't allow calls more than once every 2 seconds
    const now = Date.now();
    if (now - lastLoadTime < 2000) {
      return;
    }
    setLastLoadTime(now);

    setIsLoading(true);
    try {
      const response = await api.get('/study-groups');
      if (response.data.success) {
        const now = new Date();
        const mappedGroups = (response.data.groups || []).map((g: any) => {
          const membersArr = Array.isArray(g?.members) ? g.members : [];
          const initials = membersArr.slice(0, 4).map((m: any) => (
            m?.user?.name ? m.user.name.split(' ').map((n: string) => n[0]).join('') : 'U'
          ));
          
          // Format next session date
          let nextSessionText = 'No upcoming sessions';
          let isActive = false;
          let nextSessionId = null;
          let scheduledSessions: any[] = [];
          
          // Check if there's an active session (check both sessions and meetings)
          const sessions = g.sessions || g.meetings || [];
          
          // Get real-time status for the first meeting/session
          let realTimeStatus = null;
          if (sessions.length > 0 && sessions[0]._id) {
            const statusKey = `${g._id}-${sessions[0]._id}`;
            realTimeStatus = meetingStatuses[statusKey];
          }
          
          // Use real-time status if available, otherwise fall back to time-based logic
          if (realTimeStatus) {
            isActive = realTimeStatus.status === 'active' && realTimeStatus.canJoin;
            nextSessionText = realTimeStatus.timeStatus;
            nextSessionId = sessions[0]._id;
            // Still populate scheduledSessions for hasScheduledSession check
            scheduledSessions = sessions.filter((s: any) => 
              s.status === 'scheduled' && new Date(s.scheduledAt) > now
            );
          } else {
            // Fallback to original logic
            const activeSessions = sessions.filter((s: any) => s.status === 'active');
            scheduledSessions = sessions.filter((s: any) => 
              s.status === 'scheduled' && new Date(s.scheduledAt) > now
            ).sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
            
            isActive = activeSessions.length > 0;
            
            // Determine next session ID and text
            nextSessionId = activeSessions.length > 0 
              ? activeSessions[0]._id 
              : (scheduledSessions.length > 0 ? scheduledSessions[0]._id : null);
              
            if (activeSessions.length > 0) {
              nextSessionText = 'Session in progress';
            } else if (scheduledSessions.length > 0) {
              const sessionDate = new Date(scheduledSessions[0].scheduledAt);
              const today = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(today.getDate() + 1);
              
              if (sessionDate.toDateString() === today.toDateString()) {
                nextSessionText = `Today at ${sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              } else if (sessionDate.toDateString() === tomorrow.toDateString()) {
                nextSessionText = `Tomorrow at ${sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              } else {
                nextSessionText = `${sessionDate.toLocaleDateString()} at ${sessionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
              }
            }
          }
          
          return {
            id: g?._id || g?.id || '',
            name: g?.name || 'Untitled Group',
            members: membersArr.length,
            activeMembers: initials,
            topic: g?.subject || 'General',
            nextSession: nextSessionText,
            isActive: isActive,
            creatorId: g?.creator?._id || g?.creator || undefined,
            nextSessionId: nextSessionId,
            hasScheduledSession: scheduledSessions.length > 0
          } as StudyGroup;
        });
        setGroups(mappedGroups);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups(studyGroups);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (groupData: any) => {
    try {
      const response = await api.post('/study-groups', groupData);
      if (response.data.success) {
        const g = response.data.studyGroup;
        
        // Show access code for private groups
        if (!groupData.isPublic && g.accessCode) {
          toast.success(
            `Private group created! Access code: ${g.accessCode}`,
            {
              duration: 10000,
              description: 'Share this code with others to let them join your private group.'
            }
          );
        } else if (groupData.isPublic) {
          toast.success('Public study group created successfully!');
        }
        
        // Return the original backend response for CreateGroupModal
        // We'll reload the groups after the modal handles scheduling
        setTimeout(() => {
          loadGroups(); // Reload groups to get the latest data including scheduled sessions
        }, 2000); // Increased delay to avoid rate limiting
        
        return g;
      } else {
        throw new Error('Failed to create group.');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create study group. Please try again.');
      throw error;
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black tracking-tight">
            Study Groups
          </h2>
          <p className="text-gray-600 mt-1">
            Collaborate with peers and learn together
          </p>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search Bar */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search groups by name or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter group access code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <Button
            disabled={!joinCode.trim() || isJoiningByCode}
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={async () => {
              try {
                setIsJoiningByCode(true);
                const res = await api.post('/study-groups/join-by-code', { accessCode: joinCode.trim() });
                
                if (res.data?.success) {
                  const groupName = res.data?.studyGroup?.name || 'Study Group';
                  
                  // Show success message
                  toast.success(`Successfully joined "${groupName}"!`, {
                    description: 'You can now participate in group discussions and meetings.'
                  });
                  
                  // Clear the join code
                  setJoinCode('');
                  
                  // Reload groups to show the newly joined group
                  await loadGroups();
                } else {
                  toast.error(res.data?.message || 'Failed to join group');
                }
              } catch (error: any) {
                console.error('Error joining by code:', error);
                const errorMessage = error.response?.data?.message || 'Failed to join group';
                
                if (errorMessage.includes('not found')) {
                  toast.error('Invalid access code. Please check and try again.');
                } else if (errorMessage.includes('already a member')) {
                  toast.error('You are already a member of this group.');
                } else {
                  toast.error(errorMessage);
                }
              } finally {
                setIsJoiningByCode(false);
              }
            }}
          >
            {isJoiningByCode ? 'Joining...' : 'Join by Code'}
          </Button>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid gap-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No groups found' : 'No study groups yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
                : 'Create your first study group to start collaborating with peers'
              }
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Group
              </Button>
            )}
          </div>
        ) : (
          (filteredGroups || []).map((group, index) => (
            <Card key={index} className="border-gray-100 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-black">
                    <Users className="h-5 w-5" />
                    {group.name}
                  </CardTitle>
                  {group.isActive && (
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      Active Session
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {(group.activeMembers || []).map((member, idx) => (
                        <Avatar key={idx} className="h-8 w-8 border-2 border-white">
                          <AvatarFallback className="bg-gray-100 text-gray-700 text-xs">
                            {member}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.members > (group.activeMembers ? group.activeMembers.length : 0) && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            +{group.members - (group.activeMembers ? group.activeMembers.length : 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-gray-600">{group.members} members</span>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-gray-200 hover:bg-gray-50"
                      onClick={() => setSelectedGroupForChat(group.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    {group.isActive ? (
                      user?.id === group.creatorId ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            // Creator joins to manage/end the meeting
                            // Start an instant meeting
                            const startInstantMeeting = async () => {
                              try {
                                const response = await api.post(`/study-groups/${group.id}/instant`, {
                                  title: `${group.name} - Instant Meeting`,
                                  description: 'Instant study session',
                                  duration: 60
                                });
                                
                                if (response.data.success) {
                                  const { meetingLink, roomUrl, meeting } = response.data;
                                  setHmsMeeting({
                                    isOpen: true,
                                    meetingId: meeting.meetingId,
                                    roomUrl: meetingLink || roomUrl,
                                    groupName: group.name,
                                    groupId: group.id
                                  });
                                }
                              } catch (error) {
                                console.error('Error starting instant meeting:', error);
                                toast.error('Failed to start meeting');
                              }
                            };
                            
                            startInstantMeeting();
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Manage Session
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={async () => {
            try {
              const response = await api.post(`/study-groups/${group.id}/instant`, {
                title: `${group.name} - Instant Meeting`,
                description: 'Instant study session',
                duration: 60
              });
              
              if (response.data.success) {
                const { meetingLink, roomUrl, meeting } = response.data;
                setHmsMeeting({
                  isOpen: true,
                  meetingId: meeting.meetingId,
                  roomUrl: meetingLink || roomUrl,
                  groupName: group.name,
                  groupId: group.id
                });
              }
            } catch (error) {
              console.error('Error starting instant meeting:', error);
              toast.error('Failed to start meeting');
            }
          }}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Join Session
                        </Button>
                      )
                    ) : group.hasScheduledSession && group.nextSessionId ? (
                      <Button
                        size="sm"
                        onClick={async () => {
          try {
            const response = await api.post(`/study-groups/${group.id}/instant`, {
              title: `${group.name} - Study Session`,
              description: 'Study group meeting',
              duration: 60
            });
            
            if (response.data.success) {
              const { meetingLink, roomUrl, meeting } = response.data;
              setHmsMeeting({
                isOpen: true,
                meetingId: meeting.meetingId,
                roomUrl: meetingLink || roomUrl,
                groupName: group.name,
                groupId: group.id
              });
            }
          } catch (error) {
            console.error('Error starting meeting:', error);
            toast.error('Failed to start meeting');
          }
        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Video className="h-4 w-4 mr-1" />
                        Join Session
                      </Button>
                    ) : (
                      user?.id === group.creatorId ? (
                        <Button
                          size="sm"
                          onClick={() => setSelectedGroupForSchedule(group.id)}
                          className="bg-gray-900 hover:bg-gray-800 text-white"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          Schedule
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-300 text-gray-600"
                        >
                          <Video className="h-4 w-4 mr-1" />
                          No Active Session
                        </Button>
                      )
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-gray-600">Current topic: </span>
                    <span className="font-medium text-gray-900">{group.topic}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    {group.nextSession}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Group Modal */}
      <SimpleCreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
      
      {/* Chat Modal */}
      {selectedGroupForChat && (
        <GroupChatModal
          groupId={selectedGroupForChat}
          onClose={() => setSelectedGroupForChat(null)}
        />
      )}
      
      {/* Schedule Session Modal */}
      {selectedGroupForSchedule && (
        <ScheduleSessionModal
          groupId={selectedGroupForSchedule}
          onClose={() => setSelectedGroupForSchedule(null)}
          onScheduled={() => {
            setSelectedGroupForSchedule(null);
            loadGroups();
          }}
        />
      )}
      
      {/* Final Meeting Modal */}
      {hmsMeeting && (
        <FinalMeetingModal
          isOpen={hmsMeeting.isOpen}
          onClose={() => setHmsMeeting(null)}
          meetingId={hmsMeeting.meetingId}
          groupName={hmsMeeting.groupName}
          groupId={hmsMeeting.groupId}
        />
      )}
    </div>
  );
};

export default StudyGroupsView;