const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const progressController = require("../controllers/trainingProgressController");

// Document progress
router.put(
  "/:documentId/file/:fileId/progress",
  protect,
  progressController.updateDocumentProgress
);

// Video progress
router.put(
  "/:documentId/video/:videoId/progress",
  protect,
  progressController.updateVideoProgress
);

module.exports = router;
