import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const databaseConnection = app.get<Connection>(getConnectionToken());
  const port = configService.get('PORT') ?? '3005';

  await app.listen(port);

  // ============= Application Startup =============
  const bootstrapLogger = new Logger('Bootstrap');
  bootstrapLogger.log(`Database connected successfully: ${databaseConnection.name}`);
  bootstrapLogger.log(`Application is running on port ${port}`);
}
bootstrap();
