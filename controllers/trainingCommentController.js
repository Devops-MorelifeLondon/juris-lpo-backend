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

    const doc = await TrainingDocument.findById(documentId)
      .populate("assignedParalegals");

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

    if (user.role === "Paralegal") {
      // Notify the uploader only if uploader is an attorney
      if (doc.uploadedByModel === "Attorney") {
        await createNotification({
          recipient: doc.uploadedById,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Comment Added",
          message: `${user.fullName} commented on ${doc.documentName}.`
        });
      }
    } else if (user.role === "Attorney") {
      // Notify all assigned paralegals
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Comment Added",
          message: `${user.fullName} commented on ${doc.documentName}.`
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

    const doc = await TrainingDocument.findById(documentId)
      .populate("assignedParalegals");

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

    // 🔔 NOTIFICATION LOGIC
    if (user.role === "Paralegal") {
      if (doc.uploadedByModel === "Attorney") {
        await createNotification({
          recipient: doc.uploadedById,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Video Comment",
          message: `${user.fullName} commented on a video in ${doc.documentName}.`
        });
      }
    } else {
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Video Comment",
          message: `${user.fullName} commented on a video in ${doc.documentName}.`
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

    const doc = await TrainingDocument.findById(documentId)
      .populate("assignedParalegals");

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

    // 🔔 Notification
    if (repliedBy.role === "Paralegal") {
      if (doc.uploadedByModel === "Attorney") {
        await createNotification({
          recipient: doc.uploadedById,
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

    const doc = await TrainingDocument.findById(documentId)
      .populate("assignedParalegals");

    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
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

    // =======================================
    // 🔔 NEW NOTIFICATION LOGIC (Corrected)
    // =======================================

    if (repliedBy.role === "Paralegal") {
      // Notify uploader ONLY if uploader is an Attorney
      if (doc.uploadedByModel === "Attorney") {
        await createNotification({
          recipient: doc.uploadedById,
          recipientModel: "Attorney",
          type: "message_received",
          title: "New Reply on Video",
          message: `${repliedBy.fullName} replied to a video comment in ${doc.documentName}.`
        });
      }
    } else {
      // Attorney → notify all assigned paralegals
      for (let para of doc.assignedParalegals) {
        await createNotification({
          recipient: para._id,
          recipientModel: "Paralegal",
          type: "message_received",
          title: "New Reply on Video",
          message: `${repliedBy.fullName} replied to a video comment in ${doc.documentName}.`
        });
      }
    }

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("Reply to Video Comment Error:", err);
    res.status(500).json({ success: false, message: "Could not reply to comment" });
  }
};


