// config/s3.js
const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

/**
 * Uploads an array of files to S3
 * @param {Array} files - Array of file objects from Multer
 * @returns {Promise<Array>} - Array of attachment objects for the DB
 */
const uploadFilesToS3 = async (files) => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map(async (file) => {
    // 1. Sanitize the filename to prevent S3 Key encoding errors
    // Split extension from name
    const nameParts = file.originalname.split('.');
    const ext = nameParts.length > 1 ? nameParts.pop() : '';
    const name = nameParts.join('.');

    // Replace any character that is NOT a letter, number, or dash with a dash
    // This fixes issues with spaces, '&', '(', ')', etc.
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-');
    
    // 2. Create the unique Key
    const fileName = `task/documents/${Date.now()}-${cleanName}.${ext}`;

    const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    const result = await upload.done();

    return {
      name: file.originalname, // Keep original name for display
      url: result.Location,    // Full AWS URL
      key: fileName,           // ✅ Store the CLEAN Key for retrieving signed URLs
      size: file.size,
      uploadedAt: new Date()
    };
  });

  return Promise.all(uploadPromises);
};

// Export s3 so controller can use it for signing URLs
module.exports = { s3, uploadFilesToS3 };