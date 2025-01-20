import { Injectable, Res } from '@nestjs/common';
import { LoginDTO, RegisterDTO } from './dto';
import { PrismaService } from './prisma/prisma.service';
import { ApiResponse } from './utils/ApiResponse';
import * as argon from 'argon2';
import { S3Service } from './s3/s3.service';
import { generateTokens } from './queue/tokens';
import { sendNewDeviceLoginMail } from './queue/messaging';
import { Response } from 'express';
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
          displayImage: displayImageUrl
        }
      })
      return new ApiResponse(201, {}, 'Restaurant created successfully')
    } catch (error) {
      return new ApiResponse(500, error.message, 'Internal Server Error')
    }
  }

  async login(dto: LoginDTO, @Res() res: Response, deviceInfo: string, ipAddress: string) {
    try {
      const restaurant = await this.prisma.restaurants.findUnique({
        where: {
          email: dto.email,
        },
      });
      if (!restaurant) return new ApiResponse(404, {}, 'Restaurant not found')
      const pwMatches = await argon.verify(restaurant.password, dto.password);
      if (!pwMatches) return new ApiResponse(403, {}, 'Incorrect email or password')
      const { accessToken, refreshToken, newDeviceLogin } = await generateTokens(restaurant.id, deviceInfo, ipAddress);
      if(newDeviceLogin) {
        await sendNewDeviceLoginMail(restaurant.email, restaurant.name, deviceInfo)
      }

      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      delete restaurant.password;
      return new ApiResponse(200, restaurant, 'Restaurant logged in successfully');
    } catch (error) {
      console.log(error);
      return new ApiResponse(500, {}, 'Something went wrong while logging in the user')
    }
  }
}
