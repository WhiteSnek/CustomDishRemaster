import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from './s3.service';

@Module({
  providers: [
    {
      provide: 'S3Client',
      useFactory: (configService: ConfigService) => {
        return new S3Client({
          region: configService.get<string>('AWS_REGION'),
          credentials: {
            accessKeyId: configService.get<string>('AWS_ACCESS_KEY'),
            secretAccessKey: configService.get<string>('AWS_SECRET_KEY'),
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'BucketName',
      useFactory: (configService: ConfigService) => configService.get<string>('BUCKET_NAME'),
      inject: [ConfigService],
    },
    S3Service,
  ],
  exports: [S3Service],
})
export class S3Module {}
