import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

const databaseLogger = new Logger('Database');

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        // ============= Database Connection =============
        const mongoUri = configService.get<string>('MONGODB_URI');

        if (!mongoUri) {
          throw new Error('MONGODB_URI is missing in the environment file');
        }

        return {
          uri: mongoUri,
          connectionFactory: (connection) => {
            databaseLogger.log('Successfully connected to the database');
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
