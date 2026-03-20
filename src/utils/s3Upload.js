const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

/**
 * Upload a file buffer to S3
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} originalName - Original file name
 * @param {string} mimetype - File MIME type
 * @param {string} folder - S3 folder name (e.g., 'attendance', 'vendor-visits')
 * @returns {string} - The S3 file URL
 */
const uploadToS3 = async (fileBuffer, originalName, mimetype, folder) => {
  const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
  const ext = path.extname(originalName);
  const key = `mx_team/${folder}/${uniqueSuffix}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

/**
 * Upload multiple files from req.files to S3
 * @param {Object} files - req.files object from multer
 * @param {string} folder - S3 folder name
 * @returns {Object} - Object with field names as keys and S3 URLs as values
 */
const uploadFilesToS3 = async (files, folder) => {
  const uploaded = {};

  for (const fieldName of Object.keys(files)) {
    const fileArray = files[fieldName];
    if (fileArray && fileArray.length > 0) {
      const file = fileArray[0];
      const url = await uploadToS3(file.buffer, file.originalname, file.mimetype, folder);
      uploaded[fieldName] = url;
    }
  }

  return uploaded;
};

module.exports = { uploadToS3, uploadFilesToS3 };
