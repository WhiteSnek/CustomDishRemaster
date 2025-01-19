import { Injectable } from '@nestjs/common';
import { RegisterDTO } from './dto';
import { PrismaService } from './prisma/prisma.service';
import { ApiResponse } from './utils/ApiResponse';
import * as argon from 'argon2';
import { S3Service } from './s3/s3.service';
@Injectable()
export class AppService {
  constructor(private prisma: PrismaService, private s3: S3Service) {}
  getHello(): string {
    return 'Hello World!';
  }
  // TODO: display image logic
  async register(displayImage: Express.Multer.File ,dto: RegisterDTO) {
    try {
      const checkExistingUser = await this.prisma.restaurants.findFirst({
        where: {
          OR: [
            {
              email: dto.email
            },
            {
              mobileNumber: {
                hasSome: dto.mobileNumber
              }
            }
          ]
        }
      })
      if (checkExistingUser) {
        return new ApiResponse(409, {}, 'Restaurant with this email or mobile number exists')
      }
      let displayImageUrl: string | null = null;
      if(displayImage) {
        const key = `profiles/restaurant/${dto.email.split('@')[0]}`
        displayImageUrl = await this.s3.uploadToS3(displayImage, key);
      }
      const hash = await argon.hash(dto.password);
      await this.prisma.restaurants.create({
        data: {
          name: dto.name,
          email: dto.email,
          password: hash,
          address: {
            houseNo: dto.address.houseNo,
            streetNo: dto.address.streetNo,
            district: dto.address.district,
            city: dto.address.city,
            state: dto.address.state,
            postalCode: dto.address.postalCode,
          },
          category: dto.category,
          mobileNumber: dto.mobileNumber,
          openingHours: dto.openingHours,
          deliveryRange: dto.deliveryRange,
          displayImage: ""
        }
      })
      return new ApiResponse(201, {}, 'Restaurant created successfully')
    } catch (error) {
      return new ApiResponse(500, error.message, 'Internal Server Error')
    }
  }


}
