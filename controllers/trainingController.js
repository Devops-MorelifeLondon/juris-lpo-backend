const TrainingDocument = require('../models/TrainingDocument');
const s3 = require('../config/s3');

const {
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Notification = require('../models/Notification');


// 1️⃣ Generate Signed URL (Upload)
exports.generateUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    const key = `training/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({
      success: true,
      uploadUrl,
      key
    });

  } catch (err) {
    console.error("Presigned Upload URL Error:", err);
    res.status(500).json({ success: false, message: "Could not generate upload URL" });
  }
};



// 2️⃣ Save Metadata After Upload
exports.saveMetadata = async (req, res) => {
  try {
    const {
      documentName,
      documentType,
      assignedTo,
      priority,
      description,
      filePath,
      originalFileName,
      fileType,
      fileSize,
      paralegalAssignedTo,
    } = req.body;

    console.log("Metadata Received:", req.body);
    const role = req.user.role;
    const uploadedByName =
      role === "attorney"
        ? req.user.fullName
        : `${req.user.firstName} ${req.user.lastName}`;

    const newDoc = new TrainingDocument({
      documentName,
      documentType,
      assignedTo,
      priority,
      description,
      filePath,
      s3Url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`,
      originalFileName,
      fileType,
      fileSize,
      paralegalAssignedTo: paralegalAssignedTo,
      uploadedBy: uploadedByName,
      uploadedById: req.user._id,
      uploadedByModel: role === "attorney" ? "Attorney" : "Paralegal",
    });

    await newDoc.save();

    // ---------------- SEND NOTIFICATIONS ----------------
 if (Array.isArray(paralegalAssignedTo) && paralegalAssignedTo.length > 0) {
  await Promise.all(
    paralegalAssignedTo.map(async (paralegalId) => {
      return Notification.create({
        recipient: paralegalId,
        recipientModel: "Paralegal",
        type: "document_assigned",
        title: "New Training Document Assigned",
        message: `A new training document "${documentName}" has been assigned to you.`,
        details: {
          action: "training_document",
          userName: uploadedByName,
        }
      });
    })
  );
}


    res.json({ success: true, data: newDoc });

  } catch (err) {
    console.error("Metadata Save Error:", err);
    res.status(500).json({ success: false, message: "Could not save metadata" });
  }
};




// 3️⃣ Fetch History
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
    console.error("History Fetch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



// 4️⃣ Generate Download URL
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
    console.error("Presigned Download URL Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
