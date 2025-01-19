import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDTO } from './dto';
import { UploadFile } from './decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  @UploadFile('displayImage') 
  register(displayImage: Express.Multer.File, dto: RegisterDTO) {
    return this.appService.register(displayImage, dto);
  }
}
