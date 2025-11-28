const TrainingDocument = require("../models/TrainingDocument");
const Notification = require("../models/Notification");

// Helper: Create Notification
async function createNotification({ recipient, recipientModel, type, message, title }) {
  try {
    await Notification.create({
      recipient,
      recipientModel,
      type,
      title,
      message
    });
  } catch (err) {
    console.error("Notification Create Error:", err);
  }
}

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

    const doc = await TrainingDocument.findById(documentId).populate("assignedParalegals").populate("attorney");

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    // Build user data
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

    // =======================
    // 🔔 NOTIFICATION LOGIC
    // =======================

    if (req.user.role === "paralegal") {
      // Notify attorney
      if (doc.attorney) {
        await createNotification({
          recipient: doc.attorney._id,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Comment on Document",
          message: `${user.fullName} commented on ${doc.title || "a document"}.`
        });
      }
    } else if (req.user.role === "attorney") {
      // Notify all assigned paralegals
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Comment on Document",
          message: `${user.fullName} commented on ${doc.title || "a document"}.`
        });
      }
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

    const doc = await TrainingDocument.findById(documentId).populate("assignedParalegals").populate("attorney");

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
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

    // 🔔 Notification
    if (req.user.role === "paralegal") {
      if (doc.attorney) {
        await createNotification({
          recipient: doc.attorney._id,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Video Comment",
          message: `${user.fullName} commented on a video in ${doc.title}.`
        });
      }
    } else {
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Video Comment",
          message: `${user.fullName} commented on a video in ${doc.title}.`
        });
      }
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

    const doc = await TrainingDocument.findById(documentId).populate("assignedParalegals").populate("attorney");

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
      { $push: { "files.$[file].comments.$[comment].replies": reply } },
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

    // 🔔 Notification logic
    if (req.user.role === "paralegal") {
      if (doc.attorney) {
        await createNotification({
          recipient: doc.attorney._id,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Reply on Document",
          message: `${repliedBy.fullName} replied to a comment.`
        });
      }
    } else {
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Reply on Document",
          message: `${repliedBy.fullName} replied to a comment.`
        });
      }
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

    const doc = await TrainingDocument.findById(documentId).populate("assignedParalegals").populate("attorney");

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
      { $push: { "videos.$[video].comments.$[comment].replies": reply } },
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

    // 🔔 Notification
    if (req.user.role === "paralegal") {
      if (doc.attorney) {
        await createNotification({
          recipient: doc.attorney._id,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Reply on Video",
          message: `${repliedBy.fullName} replied on a video comment.`
        });
      }
    } else {
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Reply on Video",
          message: `${repliedBy.fullName} replied on a video comment.`
        });
      }
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Reply to Video Comment Error:", err);
    res.status(500).json({ success: false, message: "Could not reply to comment" });
  }
};


