import { Injectable } from '@nestjs/common';
import { RegisterDTO } from './dto';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  register(dto: RegisterDTO) {
    console.log(dto);
  }
}
