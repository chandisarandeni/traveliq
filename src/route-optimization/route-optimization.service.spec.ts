import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationService } from './route-optimization.service';

describe('RouteOptimizationService', () => {
  let service: RouteOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouteOptimizationService],
    }).compile();

    service = module.get<RouteOptimizationService>(RouteOptimizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
