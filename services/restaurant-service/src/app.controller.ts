import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { RegisterDTO } from './dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post()
  register(dto: RegisterDTO) {
    return this.appService.register(dto);
  }
}
