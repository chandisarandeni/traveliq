import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttractionSelectionModule } from './attraction-selection/attraction-selection.module';

@Module({
  imports: [AttractionSelectionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
