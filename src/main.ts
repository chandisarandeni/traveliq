import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT') ?? '3005';

  await app.listen(port);

  // ============= Application Startup =============
  new Logger('Bootstrap').log(`Application started on port ${port}`);
}
bootstrap();
