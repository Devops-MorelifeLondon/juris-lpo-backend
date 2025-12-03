const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");


exports.uploadDocxToS3 = async (buffer, fileName) => {
  const key = `training/ai-drafts/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  await s3.send(command);

  return key;
};
