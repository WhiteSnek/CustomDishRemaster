import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv'

dotenv.config({
  path: `./.env`
});

// Ensure all required environment variables are present
if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY || !process.env.AWS_BUCKET_NAME || !process.env.AWS_REGION) {
  throw new Error("Missing required AWS environment variables");
}

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});


// Upload file to S3
const uploadToS3 = async (
  file: Express.Multer.File,
  key: string,
  contentType: string = "application/octet-stream"
): Promise<string> => {
  if (!file || !file.buffer) {
    throw new Error("Invalid file. Ensure the file is uploaded correctly.");
  }

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: file.buffer, 
    ContentType: contentType || file.mimetype, 
  };

  try {
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    console.log("Upload successful:", data);

    const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${key}`;
    return fileUrl;
  } catch (err) {
    console.error("Error uploading to S3:", err);
    throw new Error("Failed to upload file to S3");
  }
};
// Delete file from S3
const deleteFromS3 = async (key: string) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  try {
    const command = new DeleteObjectCommand(params);
    const data = await s3Client.send(command);
    console.log("Deletion successful:", data);
    return data;
  } catch (err) {
    console.error("Error deleting from S3:", err);
    throw new Error("Failed to delete file from S3");
  }
};

export { uploadToS3, deleteFromS3 };
