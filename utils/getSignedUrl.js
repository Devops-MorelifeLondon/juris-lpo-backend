const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");  // <-- THIS WAS MISSING

exports.getSignedDownloadUrl = async (key) => {
  return await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 300 } // 5 minutes
  );
};
