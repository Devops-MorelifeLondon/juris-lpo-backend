const TrainingDocument = require("../models/TrainingDocument");

// ======================================================
// Add Comment to a Document File
// ======================================================
exports.addDocumentComment = async (req, res) => {
  try {
    const { documentId, fileId } = req.params;
    const { message } = req.body;

    const newComment = {
      message,
      createdById: req.user._id,
      createdAt: new Date(),
      replies: []
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      { _id: documentId, "files._id": fileId },
      {
        $push: { "files.$.comments": newComment }
      },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not add comment" });
  }
};

// ======================================================
// Add Comment to a Video
// ======================================================
exports.addVideoComment = async (req, res) => {
  try {
    const { documentId, videoId } = req.params;
    const { message } = req.body;

    const newComment = {
      message,
      createdById: req.user._id,
      createdAt: new Date(),
      replies: []
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      { _id: documentId, "videos._id": videoId },
      {
        $push: { "videos.$.comments": newComment }
      },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not add comment" });
  }
};

// ======================================================
// Attorney Reply to Document Comment
// ======================================================
exports.replyToDocumentComment = async (req, res) => {
  try {
    const { documentId, fileId, commentId } = req.params;
    const { message } = req.body;

    const reply = {
      repliedById: req.user._id,
      repliedByRole: req.user.role,
      message,
      createdAt: new Date()
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      {
        _id: documentId,
        "files._id": fileId,
        "files.comments._id": commentId
      },
      {
        $push: { "files.$[file].comments.$[comment].replies": reply }
      },
      {
        arrayFilters: [
          { "file._id": fileId },
          { "comment._id": commentId }
        ],
        new: true
      }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not reply to comment" });
  }
};

// ======================================================
// Attorney Reply to Video Comment
// ======================================================
exports.replyToVideoComment = async (req, res) => {
  try {
    const { documentId, videoId, commentId } = req.params;
    const { message } = req.body;

    const reply = {
      repliedById: req.user._id,
      repliedByRole: req.user.role,
      message,
      createdAt: new Date()
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      {
        _id: documentId,
        "videos._id": videoId,
        "videos.comments._id": commentId
      },
      {
        $push: { "videos.$[video].comments.$[comment].replies": reply }
      },
      {
        arrayFilters: [
          { "video._id": videoId },
          { "comment._id": commentId }
        ],
        new: true
      }
    );

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not reply to comment" });
  }
};
