import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationController } from './route-optimization.controller';
import { RouteOptimizationService } from './route-optimization.service';
import { MatrixValidationService } from './services/matrix-validation.service';
import { NormalizationService } from './services/normalization.service';
import { RouteEvaluationService } from './services/route-evaluation.service';
import { NearestNeighborService } from './algorithms/nearest-neighbor.service';
import { TwoOptService } from './algorithms/two-opt.service';
import { MockDataService } from './services/mock-data.service';

describe('RouteOptimizationController', () => {
  let controller: RouteOptimizationController;
  let mockDataService: MockDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteOptimizationController],
      providers: [
        RouteOptimizationService,
        MatrixValidationService,
        NormalizationService,
        RouteEvaluationService,
        NearestNeighborService,
        TwoOptService,
        MockDataService,
      ],
    }).compile();

    controller = module.get<RouteOptimizationController>(
      RouteOptimizationController,
    );
    mockDataService = module.get<MockDataService>(MockDataService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('GET /route-optimization/mock-data should return sample optimized routes for 5 plans', () => {
    const mockData = controller.getMockData();
    expect(mockData.length).toBe(5);
    expect(mockData[0].planId).toBe('P01');
    expect(mockData[0].destinations).toBeDefined();
  });

  it('POST /route-optimization/optimize should return optimized routes for 5 plans', () => {
    const mockInput = mockDataService.getSampleNetworkAnalysisData();
    const results = controller.optimizeRoute(mockInput) as any[];

    expect(results.length).toBe(5);
    expect(results[0].planId).toBe('P01');
    expect(results[0].destinations.length).toBe(7);
    expect(results[0].startLocation).toBeUndefined();
    expect(results[0].routeScore).toBeUndefined();
  });

  it('POST /route-optimization/optimize-best should return single best optimized route', () => {
    const mockInput = mockDataService.getSampleNetworkAnalysisData();
    const result = controller.optimizeBestPlan(mockInput) as any;

    expect(result).toBeDefined();
    expect(result.planId).toBeDefined();
    expect(result.destinations.length).toBeGreaterThan(0);
    expect(result.startLocation).toBeUndefined();
    expect(result.routeScore).toBeUndefined();
  });
});
