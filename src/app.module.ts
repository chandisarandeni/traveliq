import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttractionSelectionModule } from './attraction-selection/attraction-selection.module';
import { TourismNetworkModule } from './tourism-network/tourism-network.module';

@Module({
  imports: [AttractionSelectionModule, TourismNetworkModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
