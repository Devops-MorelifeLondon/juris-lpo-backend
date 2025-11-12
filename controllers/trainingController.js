// controllers/trainingController.js
const TrainingDocument = require('../models/TrainingDocument');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { originalname, mimetype, size, path: filePath } = req.file;
    const { documentName, documentType, assignedTo, priority, description } = req.body;

    const role = req.user.role;
    const uploadedByName =
      role === 'attorney'
        ? req.user.fullName
        : `${req.user.firstName} ${req.user.lastName}`;

    const newDoc = new TrainingDocument({
      documentName,
      documentType,
      assignedTo,
      priority,
      description,
      filePath,
      originalFileName: originalname,
      fileType: mimetype,
      fileSize: size,
      uploadedBy: uploadedByName,
      uploadedById: req.user._id,
      uploadedByModel: role === 'attorney' ? 'Attorney' : 'Paralegal',
      status: 'Pending Review',
    });

    await newDoc.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: newDoc,
    });
  } catch (error) {
    console.error('Upload Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};

// 🧠 History: attorney sees only their uploads, admin can see all
exports.getUploadHistory = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'attorney' || req.user.role === 'paralegal') {
      query.uploadedById = req.user._id;
    }

    const documents = await TrainingDocument.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    console.error('History Fetch Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
};
