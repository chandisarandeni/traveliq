import { Test, TestingModule } from '@nestjs/testing';
import { TravelPlanRankingService } from './travel-plan-ranking.service';

describe('TravelPlanRankingService', () => {
  let service: TravelPlanRankingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TravelPlanRankingService],
    }).compile();

    service = module.get<TravelPlanRankingService>(TravelPlanRankingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
