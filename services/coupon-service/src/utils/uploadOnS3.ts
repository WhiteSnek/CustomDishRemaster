import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv'
import fs from 'fs';

dotenv.config({
  path: `./.env.${process.env.NODE_ENV}`
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



const uploadToS3 = async (
  localPath: string,
  key: string,
  contentType: string = "application/octet-stream"
): Promise<string> => {
  try {
    // Check if the file exists
    if (!fs.existsSync(localPath)) {
      throw new Error("File not found at the specified path.");
    }

    // Read the file from the local path
    const fileContent = fs.readFileSync(localPath);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: fileContent, 
      ContentType: contentType,
    };

    // Upload file to S3
    const command = new PutObjectCommand(params);
    const data = await s3Client.send(command);
    console.log("Upload successful:", data);
    fs.unlinkSync(localPath);
    // Generate the URL for the uploaded file
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
