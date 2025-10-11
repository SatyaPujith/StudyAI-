import express from 'express';
import studyGroupController from '../controllers/studyGroupController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(auth);

// Study Group Management
router.post('/', studyGroupController.createStudyGroup);
router.get('/', studyGroupController.getStudyGroups);
router.get('/my-groups', studyGroupController.getUserStudyGroups);
router.post('/join-by-code', studyGroupController.joinStudyGroupByCode);
router.post('/:id/join', studyGroupController.joinStudyGroup);
router.post('/:id/leave', studyGroupController.leaveStudyGroup);

// Meeting Management
router.post('/:id/meetings', studyGroupController.scheduleMeeting);
router.post('/:id/schedule', studyGroupController.scheduleMeeting); // Alternative endpoint for compatibility
router.post('/:id/instant-meeting', studyGroupController.startInstantMeeting);
router.post('/:id/instant', studyGroupController.startInstantMeeting); // Alternative endpoint
router.get('/:id/meetings/:meetingId/status', studyGroupController.getMeetingStatus);
router.post('/:id/meetings/:meetingId/start', studyGroupController.startMeetingManually);
router.post('/:id/meetings/:meetingId/join', studyGroupController.joinMeeting);
router.post('/:id/meetings/:meetingId/end', studyGroupController.endMeeting);

// Chat
router.post('/:id/chat', studyGroupController.sendChatMessage);
router.get('/:id/chat', studyGroupController.getChatMessages);

export default router;