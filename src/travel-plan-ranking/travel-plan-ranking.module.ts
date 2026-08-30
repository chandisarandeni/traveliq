import { Module } from '@nestjs/common';
import { TravelPlanRankingService } from './travel-plan-ranking.service';
import { TravelPlanRankingController } from './travel-plan-ranking.controller';

@Module({
  controllers: [TravelPlanRankingController],
  providers: [TravelPlanRankingService],
})
export class TravelPlanRankingModule {}
