import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class S3Service {
  constructor(
    @Inject('S3Client') private readonly s3Client: S3Client,
    @Inject('BucketName') private readonly bucketName: string,
  ) {}

  async uploadToS3(file: Express.Multer.File, key: string): Promise<string> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const fileExtension = path.extname(file.originalname);
    const fileKey = `${key}${fileExtension}`;
    console.log(fileKey);
    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
    };

    try {
      const command = new PutObjectCommand(params);
      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;
    } catch (error) {
      throw new Error(`Error uploading file to S3: ${error.message}`);
    }
  }

  async deleteFromS3(key: string): Promise<void> {
    if (!key) {
      throw new BadRequestException('No key provided');
    }

    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      const command = new DeleteObjectCommand(params);
      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(`Error deleting file from S3: ${error.message}`);
    }
  }
}
