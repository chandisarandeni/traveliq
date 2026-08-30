import { Test, TestingModule } from '@nestjs/testing';
import { TravelPlanRankingController } from './travel-plan-ranking.controller';
import { TravelPlanRankingService } from './travel-plan-ranking.service';

describe('TravelPlanRankingController', () => {
  let controller: TravelPlanRankingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TravelPlanRankingController],
      providers: [TravelPlanRankingService],
    }).compile();

    controller = module.get<TravelPlanRankingController>(TravelPlanRankingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
