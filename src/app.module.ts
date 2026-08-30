import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AttractionSelectionModule } from './attraction-selection/attraction-selection.module';
import { TourismNetworkModule } from './tourism-network/tourism-network.module';
import { RouteOptimizationModule } from './route-optimization/route-optimization.module';
import { TripFeasibilityModule } from './trip-feasibility/trip-feasibility.module';
import { TravelPlanRankingModule } from './travel-plan-ranking/travel-plan-ranking.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AttractionSelectionModule,
    TourismNetworkModule,
    RouteOptimizationModule,
    TripFeasibilityModule,
    TravelPlanRankingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
