const TrainingDocument = require('../models/TrainingDocument');
const Notification = require('../models/Notification');
const s3 = require('../config/s3');
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// =========================================================
// 1️⃣ Generate File Upload URL  (documents only)
// =========================================================
exports.generateFileUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const key = `training/docs/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ success: true, uploadUrl, key });
  } catch (err) {
    console.error("File Upload URL Error:", err);
    res.status(500).json({ success: false, message: "Could not generate upload URL" });
  }
};

// =========================================================
// 2️⃣ Generate Video Upload URL
// =========================================================
exports.generateVideoUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    // Optional: adjust max size limit
    if (fileSize && fileSize > 1100 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "Max video size allowed is 1100MB"
      });
    }

    const key = `training/videos/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType || "video/mp4",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ success: true, uploadUrl, key });
  } catch (err) {
    console.error("Video Upload URL Error:", err);
    res.status(500).json({ success: false, message: "Could not generate upload URL" });
  }
};

// =========================================================
// 3️⃣ Save Training Entry (files + videos)
// =========================================================
exports.saveMetadata = async (req, res) => {
  try {
    const {
      documentName,
      documentType,
      assignedTo,
      priority,
      description,
      files,
      videos,
      paralegalAssignedTo,
    } = req.body;

    const role = req.user.role;
    const uploadedByName =
      role === "attorney"
        ? req.user.fullName
        : `${req.user.firstName} ${req.user.lastName}`;

    // Normalize videos: expected items are either { isUrl: true, url } or object with filePath etc.
    const normalizedVideos = Array.isArray(videos) ? videos.map(v => {
      if (v && v.isUrl) {
        return {
          isUrl: true,
          url: v.url
        };
      }
      // assume already contains fields from upload step
      return {
        isUrl: false,
        filePath: v.filePath,
        s3Url: v.s3Url,
        originalFileName: v.originalFileName,
        fileType: v.fileType,
        fileSize: v.fileSize
      };
    }) : [];

    const newDoc = new TrainingDocument({
      documentName,
      documentType,
      assignedTo,
      priority,
      description,
      files: Array.isArray(files) ? files : [],
      videos: normalizedVideos,
      paralegalAssignedTo: Array.isArray(paralegalAssignedTo) ? paralegalAssignedTo : [],
      uploadedBy: uploadedByName,
      uploadedById: req.user._id,
      uploadedByModel: role === "attorney" ? "Attorney" : "Paralegal",
    });

    await newDoc.save();

    // Notifications
    if (Array.isArray(paralegalAssignedTo) && paralegalAssignedTo.length > 0) {
      await Promise.all(
        paralegalAssignedTo.map((paralegalId) =>
          Notification.create({
            recipient: paralegalId,
            recipientModel: "Paralegal",
            type: "document_assigned",
            title: "New Training Document Assigned",
            message: `A new training document "${documentName}" has been assigned to you.`,
            details: { action: "training_document", userName: uploadedByName }
          })
        )
      );
    }

    res.json({ success: true, data: newDoc });
  } catch (err) {
    console.error("Metadata Save Error:", err);
    res.status(500).json({ success: false, message: "Could not save metadata" });
  }
};

// =========================================================
// 4️⃣ Fetch History
// =========================================================
exports.getUploadHistory = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'attorney' || req.user.role === 'paralegal') {
      query.uploadedById = req.user._id;
    }

    const documents = await TrainingDocument.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: documents });
  } catch (err) {
    console.error("Get History Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// =========================================================
// 5️⃣ Generate Download (presigned) URL
// =========================================================
exports.getPresignedDownloadUrl = async (req, res) => {
  try {
    const { key } = req.query;

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ success: true, url: downloadUrl });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
