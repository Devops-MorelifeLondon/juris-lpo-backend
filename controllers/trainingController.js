// controllers/trainingController.js
const TrainingDocument = require('../models/TrainingDocument');
const Notification = require('../models/Notification');
const {s3} = require('../config/s3');
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// ingest worker (we call ingest directly in Option A)
const { ingestDocumentAI } = require('./ingestDocumentAI');

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

exports.generateVideoUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
 
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

exports.saveMetadata = async (req, res) => {
  try {
    const {
      documentName,
      documentType,
      templateType,
      assignedTo,
      priority,
      description,
      files,
      videos,
      assignedParalegals,
    } = req.body;

    const role = req.user.role;
    const uploadedByName = role === "attorney" ? req.user.fullName : `${req.user.firstName} ${req.user.lastName}`;

    const normalizedVideos = Array.isArray(videos)
      ? videos.map((v) => {
          if (v?.isUrl) return { isUrl: true, url: v.url };
          return {
            isUrl: false,
            filePath: v.filePath,
            s3Url: v.s3Url,
            originalFileName: v.originalFileName,
            fileType: v.fileType,
            fileSize: v.fileSize,
          };
        })
      : [];

    const processedParalegals = Array.isArray(assignedParalegals) ? assignedParalegals : [];

    const newDoc = new TrainingDocument({
      documentName,
      documentType,
      templateType: documentType === "Paralegal Template" ? templateType : undefined,
      assignedTo,
      priority,
      description,
      files: Array.isArray(files) ? files : [],
      videos: normalizedVideos,
      assignedParalegals: processedParalegals,
      uploadedBy: uploadedByName,
      uploadedById: req.user._id,
      uploadedByModel: role === "attorney" ? "Attorney" : "Paralegal",
      status: "Pending Review",
    });

    await newDoc.save();

    // Immediately ingest (Option A)
    if (assignedTo === "AI" || assignedTo === "Both") {
      try {
        // run ingest and don't block forever — but await it here as requested
        await ingestDocumentAI(String(newDoc._id));
      } catch (ingestErr) {
        console.error("[saveMetadata] ingestDocumentAI failed:", ingestErr);
        // keep going — document saved; update doc status handled inside ingestDocumentAI
      }
    }

    // Send notifications
    if (processedParalegals.length > 0) {
      await Promise.all(
        processedParalegals.map((paralegalId) =>
          Notification.create({
            recipient: paralegalId,
            recipientModel: "Paralegal",
            type: "document_assigned",
            title: "New Training Document Assigned",
            message: `A new training document "${documentName}" has been assigned to you.`,
            details: { action: "training_document", userName: uploadedByName },
          })
        )
      );
    }

    res.json({ success: true, data: newDoc });
  } catch (err) {
    console.error("Metadata Save Error:", err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: "Could not save metadata" });
  }
};

exports.getUploadHistory = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "attorney" || req.user.role === "paralegal") {
      query.uploadedById = req.user._id;
    }
    const documents = await TrainingDocument.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .populate("assignedParalegals", "firstName lastName");
    res.json({ success: true, data: documents });
  } catch (err) {
    console.error("Get History Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPresignedDownloadUrl = async (req, res) => {
  try {
    const rawKey = req.query.key || req.query.filePath;
    const key = decodeURIComponent(rawKey);
    if (!key) return res.status(400).json({ success: false, message: "File key is required" });
    const command = new GetObjectCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key });
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    res.json({ success: true, url: downloadUrl });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAssignedDocuments = async (req, res) => {
  try {
    const paralegalId = req.user._id;
    const documents = await TrainingDocument.find({ assignedParalegals: paralegalId })
      .populate("assignedParalegals", "firstName lastName email")
      .populate("files.progress.paralegalId", "firstName lastName email")
      .populate("videos.progress.paralegalId", "firstName lastName email")
      .sort({ createdAt: -1 });
    res.status(200).json({ documents });
  } catch (err) {
    console.error("Get Assigned Docs Error:", err);
    res.status(500).json({ message: "Error loading assigned documents" });
  }
};

exports.getAttorneyDocuments = async (req, res) => {
  try {
    const attorneyId = req.user._id;
    const documents = await TrainingDocument.find({ uploadedById: attorneyId })
      .sort({ createdAt: -1 })
      .populate("assignedParalegals", "firstName lastName email")
      .populate("files.progress.paralegalId", "firstName lastName email")
      .populate("videos.progress.paralegalId", "firstName lastName email")
      .populate({ path: "uploadedById", select: "firstName lastName fullName email" });
    res.status(200).json({ documents });
  } catch (err) {
    console.error("Get Attorney Docs Error:", err);
    res.status(500).json({ message: "Error loading attorney documents" });
  }
};