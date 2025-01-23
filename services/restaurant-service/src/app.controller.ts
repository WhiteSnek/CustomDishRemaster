import { Body, Controller, Delete, Get, Headers, Ip, Patch, Post, Res, UploadedFile, UploadedFiles, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { LoginDTO, RegisterDTO, SearchDTO, UpdateDTO, UpdatePasswordDTO } from './dto';
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
  async login(@Body() dto: LoginDTO, @Res() res: Response, @Headers() headers: any, @Ip() ipAddress: string){
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
  @UseGuards(JwtGuard)
  @Get('current')
  async getCurrentRestaurant(@GetUser() user: User) {
    return this.appService.getCurrentRestaurant(user);
  }
  @UseGuards(JwtGuard)
  @Patch('update-details')
  async updateAccountDetails(@Body() dto: UpdateDTO, @GetUser('email') email: string) {
    return this.appService.updateAccountDetails(dto, email);
  }
  @UseGuards(JwtGuard)
  @Patch('update-password')
  async updatePassword(@Body() dto: UpdatePasswordDTO) {
    return this.appService.updatePassword(dto);
  }
  @UseGuards(JwtGuard)
  @Patch('deactivate-account')
  async deactivateAccount(@GetUser('email') email: string) {
    return this.appService.deactivateAccount(email)
  }
  @UseGuards(JwtGuard)
  @Delete('delete-account')
  async deleteAccount(@GetUser('email') email: string) {
    return this.appService.deleteAccount(email)
  }
  @UseGuards(JwtGuard)
  @Get('all')
  async getAllRestaurants(@Body() dto: SearchDTO) {
    return this.appService.getAllRestaurants(dto)
  }
  @UseGuards(JwtGuard)
  @UploadFile('media')
  @Patch('add-media')
  async addMedia(@UploadedFiles() media: Express.Multer.File[], @GetUser('email') email: string) {
    return this.appService.addMedia(media, email)
  }
}
