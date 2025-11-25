const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const commentController = require("../controllers/trainingCommentController");

// Add comment to document file
router.post(
  "/:documentId/file/:fileId/comment",
  protect,
  commentController.addDocumentComment
);

// Add comment to video
router.post(
  "/:documentId/video/:videoId/comment",
  protect,
  commentController.addVideoComment
);

// Attorney reply to document comment
router.post(
  "/:documentId/file/:fileId/comment/:commentId/reply",
  protect,
  commentController.replyToDocumentComment
);

// Attorney reply to video comment
router.post(
  "/:documentId/video/:videoId/comment/:commentId/reply",
  protect,
  commentController.replyToVideoComment
);

module.exports = router;
