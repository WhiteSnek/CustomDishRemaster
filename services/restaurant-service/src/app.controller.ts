import { Body, Controller, Get, Headers, Ip, Post, Res, UploadedFile } from '@nestjs/common';
import { AppService } from './app.service';
import { LoginDTO, RegisterDTO } from './dto';
import { UploadFile } from './decorator';
import { Response } from 'express';
import { ApiResponse } from './utils/ApiResponse';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('register')
  @UploadFile('displayImage') 
  async register(@UploadedFile() displayImage: Express.Multer.File, @Body() dto: RegisterDTO) {
    return this.appService.register(displayImage, dto);
  }

  @Post('login')
  async login(dto: LoginDTO, @Res() res: Response, @Headers() headers: any, @Ip() ipAddress: string){
    const deviceInfo = headers['user-agent']
    const response = await this.appService.login(dto,res,deviceInfo, ipAddress);
    return res.status(response.statusCode).json(response)
  }
}
