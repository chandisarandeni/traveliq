import { Test, TestingModule } from '@nestjs/testing';
import { TripFeasibilityService } from './trip-feasibility.service';

describe('TripFeasibilityService', () => {
  let service: TripFeasibilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripFeasibilityService],
    }).compile();

    service = module.get<TripFeasibilityService>(TripFeasibilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
