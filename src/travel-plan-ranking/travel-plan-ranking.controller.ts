import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { TravelPlanRankingService } from './travel-plan-ranking.service';

import { CreateTravelPlanRankingDto } from './dto/create-travel-plan-ranking.dto';

@Controller('travel-plan-ranking')
export class TravelPlanRankingController {
  constructor(
    private readonly travelPlanRankingService: TravelPlanRankingService,
  ) {}

  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  @Post('rank')
  rankPlans(
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

    return {
      bestPlan,
      rankedPlans,
    };
  }
}