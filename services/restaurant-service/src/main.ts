import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { updateRating } from './queue/updateRating';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3002);
  updateRating()
}
bootstrap();
