import { Body, Controller, Delete, Get, Headers, Ip, Patch, Post, Res, UploadedFile, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { LoginDTO, RegisterDTO, UpdateDTO, UpdatePasswordDTO } from './dto';
import { GetUser, UploadFile } from './decorator';
import { Response } from 'express';
import { JwtGuard } from './guard';
import { User } from './types/user';

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
  @UseGuards(JwtGuard)
  @Post('logout')
  async logout(@Res() res: Response){
    const response = await this.appService.logout(res);
    return res.status(response.statusCode).json(response);
  }

  @Get('current')
  async getCurrentRestaurant(@GetUser() user: User) {
    return this.appService.getCurrentRestaurant(user);
  }

  @Patch('update-details')
  async updateAccountDetails(dto: UpdateDTO, @GetUser('email') email: string) {
    return this.appService.updateAccountDetails(dto, email);
  }

  @Patch('update-password')
  async updatePassword(dto: UpdatePasswordDTO) {
    return this.appService.updatePassword(dto);
  }

  @Patch('deactivate-account')
  async deactivateAccount() {}

  @Delete('delete-account')
  async deleteAccount() {}

  @Get('all')
  async getAllRestaurants() {}

  @Patch('add-media')
  async addMedia() {}
}
