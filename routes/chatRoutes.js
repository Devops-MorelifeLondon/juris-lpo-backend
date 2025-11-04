const express = require('express');
const { getChatToken, createChatChannel, getUserChannels } = require('../controllers/chatController');
const { protect } = require('../middleware/chatAuthMiddleware');
const router = express.Router();

router.use(protect); // All routes below require auth

router.post('/get-token', getChatToken);  // Uses req.user and req.role
router.post('/create-channel', createChatChannel); // Uses req.user and body.targetId
router.get('/channels', getUserChannels); // Uses req.user.id

module.exports = router;
