const TrainingDocument = require("../models/TrainingDocument");

// ======================================================
// Add Comment to a Document File
// ======================================================
exports.addDocumentComment = async (req, res) => {
  try {
    const { documentId, fileId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Build embedded user object
    const user = {
      firstName: req.user.firstName || "",
      lastName: req.user.lastName || "",
      fullName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      role: req.user.role === "attorney" ? "Attorney" : "Paralegal",
      _id: req.user._id
    };

    const newComment = {
      message,
      createdBy: user,
      createdAt: new Date(),
      replies: []
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      { _id: documentId, "files._id": fileId },
      { $push: { "files.$.comments": newComment } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Document or file not found" });
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Add Document Comment Error:", err);
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

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const user = {
      firstName: req.user.firstName || "",
      lastName: req.user.lastName || "",
      fullName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      role: req.user.role === "attorney" ? "Attorney" : "Paralegal",
      _id: req.user._id
    };

    const newComment = {
      message,
      createdBy: user,
      createdAt: new Date(),
      replies: []
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      { _id: documentId, "videos._id": videoId },
      { $push: { "videos.$.comments": newComment } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Document or video not found" });
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Add Video Comment Error:", err);
    res.status(500).json({ success: false, message: "Could not add comment" });
  }
};


// ======================================================
// Reply to Document Comment (Attorney / Paralegal)
// ======================================================
exports.replyToDocumentComment = async (req, res) => {
  try {
    const { documentId, fileId, commentId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    const repliedBy = {
      firstName: req.user.firstName || "",
      lastName: req.user.lastName || "",
      fullName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      role: req.user.role === "attorney" ? "Attorney" : "Paralegal",
      _id: req.user._id
    };

    const reply = {
      repliedBy,
      message,
      createdAt: new Date()
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      { _id: documentId },
      {
        $push: {
          "files.$[file].comments.$[comment].replies": reply
        }
      },
      {
        arrayFilters: [
          { "file._id": fileId },
          { "comment._id": commentId }
        ],
        new: true
      }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Document, file, or comment not found" });
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Reply to Document Comment Error:", err);
    res.status(500).json({ success: false, message: "Could not reply to comment" });
  }
};


// ======================================================
// Reply to Video Comment (Attorney / Paralegal)
// ======================================================
exports.replyToVideoComment = async (req, res) => {
  try {
    const { documentId, videoId, commentId } = req.params;
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    const repliedBy = {
      firstName: req.user.firstName || "",
      lastName: req.user.lastName || "",
      fullName: req.user.fullName || `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      role: req.user.role === "attorney" ? "Attorney" : "Paralegal",
      _id: req.user._id
    };

    const reply = {
      repliedBy,
      message,
      createdAt: new Date()
    };

    const updated = await TrainingDocument.findOneAndUpdate(
      { _id: documentId },
      {
        $push: {
          "videos.$[video].comments.$[comment].replies": reply
        }
      },
      {
        arrayFilters: [
          { "video._id": videoId },
          { "comment._id": commentId }
        ],
        new: true
      }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Document, video, or comment not found" });
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Reply to Video Comment Error:", err);
    res.status(500).json({ success: false, message: "Could not reply to comment" });
  }
};

