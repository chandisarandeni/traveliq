import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TravelPlanRankingService } from './travel-plan-ranking.service';
import { TravelPlanRankingController } from './travel-plan-ranking.controller';

import { GreedyRankingService } from './algorithms/greedy-ranking.service';

import {
  TravelPlanRankingPersistenceService,
} from './travel-plan-ranking.persistence.service';

import {
  TravelPlanRanking,
  TravelPlanRankingSchema,
} from './schemas/travel-plan-ranking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: TravelPlanRanking.name,
        schema: TravelPlanRankingSchema,
      },
    ]),
  ],

  controllers: [
    TravelPlanRankingController,
  ],

  providers: [
    TravelPlanRankingService,
    GreedyRankingService,
    TravelPlanRankingPersistenceService,
  ],

  exports: [
    TravelPlanRankingService,
    GreedyRankingService,
    TravelPlanRankingPersistenceService,
  ],
})
export class TravelPlanRankingModule {}