import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttractionSelectionModule } from './attraction-selection/attraction-selection.module';
import { TourismNetworkModule } from './tourism-network/tourism-network.module';
import { RouteOptimizationModule } from './route-optimization/route-optimization.module';

@Module({
  imports: [AttractionSelectionModule, TourismNetworkModule, RouteOptimizationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
