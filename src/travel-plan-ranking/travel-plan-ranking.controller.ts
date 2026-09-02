import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { TravelPlanRankingService } from './travel-plan-ranking.service';
import { GreedyRankingService } from './algorithms/greedy-ranking.service';
import { TravelPlanRankingPersistenceService } from './travel-plan-ranking.persistence.service';
import { CreateTravelPlanRankingDto } from './dto/create-travel-plan-ranking.dto';

@Controller('travel-plan-ranking')
export class TravelPlanRankingController {
  constructor(
    private readonly travelPlanRankingService: TravelPlanRankingService,
    private readonly greedyRankingService: GreedyRankingService,
    private readonly persistenceService: TravelPlanRankingPersistenceService,
  ) {}

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  @Post('rank')
  async rankPlans(
    @Body()
    createTravelPlanRankingDto: CreateTravelPlanRankingDto,
  ) {
    console.log(
      'REQUEST BODY:',
      createTravelPlanRankingDto,
    );

    const {
      candidatePlans,
      preferences,
    } = createTravelPlanRankingDto;

    console.log('CANDIDATE PLANS:', candidatePlans);
    console.log('PREFERENCES:', preferences);

    const start = performance.now();

    const rankedPlans =
      this.travelPlanRankingService.rankPlans(
        candidatePlans,
        preferences,
      );

    const bestPlan =
      this.travelPlanRankingService.findBestPlan(
        candidatePlans,
        preferences,
      );

    const executionTimeMs =
      performance.now() - start;

    if (bestPlan) {
      await this.persistenceService.saveResult({
        algorithmUsed: 'WEIGHTED_SUM',
        candidateCount: candidatePlans.length,
        weights: preferences.weights,
        bestPlan:
          bestPlan as unknown as Record<string, unknown>,
        rankedPlans:
          rankedPlans as unknown as Record<string, unknown>[],
        executionTimeMs,
      });
    }

    return {
      algorithm: 'WEIGHTED_SUM',
      executionTimeMs,
      bestPlan,
      rankedPlans,
    };
  }

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  @Post('greedy')
  async greedyRank(
    @Body()
    createTravelPlanRankingDto: CreateTravelPlanRankingDto,
  ) {
    const {
      candidatePlans,
      preferences,
    } = createTravelPlanRankingDto;

    const start = performance.now();

    const rankedPlans =
      this.greedyRankingService.greedyRank(
        candidatePlans,
        preferences,
      );

    const executionTimeMs =
      performance.now() - start;

    const bestPlan =
      rankedPlans.length > 0
        ? rankedPlans[0]
        : null;

    if (bestPlan) {
      await this.persistenceService.saveResult({
        algorithmUsed: 'GREEDY_HEURISTIC',
        candidateCount: candidatePlans.length,
        weights: preferences.weights,
        bestPlan:
          bestPlan as unknown as Record<string, unknown>,
        rankedPlans:
          rankedPlans as unknown as Record<string, unknown>[],
        executionTimeMs,
      });
    }

    return {
      algorithm: 'GREEDY_HEURISTIC',
      executionTimeMs,
      bestPlan,
      rankedPlans,
    };
  }
}