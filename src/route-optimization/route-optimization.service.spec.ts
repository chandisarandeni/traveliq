import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationService } from './route-optimization.service';
import { MatrixValidationService } from './services/matrix-validation.service';
import { NormalizationService } from './services/normalization.service';
import { RouteEvaluationService } from './services/route-evaluation.service';
import { NearestNeighborService } from './algorithms/nearest-neighbor.service';
import { TwoOptService } from './algorithms/two-opt.service';
import { MockDataService } from './services/mock-data.service';

describe('RouteOptimizationService', () => {
  let service: RouteOptimizationService;
  let mockDataService: MockDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<RouteOptimizationService>(RouteOptimizationService);
    mockDataService = module.get<MockDataService>(MockDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should optimize a single plan and return ONLY requested fields', () => {
    const mockInput = mockDataService.getSampleNetworkAnalysisData().plans[0];
    const result = service.optimizeSinglePlan(mockInput);

    expect(result.planId).toBe('P01');
    expect(result.destinations.length).toBe(7);
    expect(result.routeSegments.length).toBe(6);
    expect(result.totalTravelDistance).toBeGreaterThan(0);
    expect(result.totalTravelTime).toBeGreaterThan(0);
    expect(result.totalTravelCost).toBeGreaterThan(0);

    // Verify removed fields do NOT exist on the result object
    expect((result as any).startLocation).toBeUndefined();
    expect((result as any).endLocation).toBeUndefined();
    expect((result as any).routeScore).toBeUndefined();
    expect((result as any).optimizationMetrics).toBeUndefined();
  });

  it('should optimize 5 travel plans in batch', () => {
    const mockInput = mockDataService.getSampleNetworkAnalysisData();
    const results = service.optimizePlans(mockInput.plans);

    expect(results.length).toBe(5);
    expect(results[0].planId).toBe('P01');
    expect(results[1].planId).toBe('P02');
    expect(results[2].planId).toBe('P03');
    expect(results[3].planId).toBe('P04');
    expect(results[4].planId).toBe('P05');

    results.forEach((res) => {
      expect(res.planId).toBeDefined();
      expect(res.destinations).toBeDefined();
      expect(res.routeSegments).toBeDefined();
      expect(res.totalTravelDistance).toBeGreaterThan(0);
      expect(res.totalTravelTime).toBeGreaterThan(0);
      expect(res.totalTravelCost).toBeGreaterThan(0);

      expect((res as any).startLocation).toBeUndefined();
      expect((res as any).endLocation).toBeUndefined();
      expect((res as any).routeScore).toBeUndefined();
    });
  });

  it('should compare 5 travel plans and return the single best overall plan', () => {
    const mockInput = mockDataService.getSampleNetworkAnalysisData();
    const bestResult = service.optimizeBestPlan(mockInput.plans);

    expect(bestResult).toBeDefined();
    expect(bestResult.planId).toBeDefined();
    expect(bestResult.destinations.length).toBeGreaterThan(0);
    expect(bestResult.totalTravelDistance).toBeGreaterThan(0);
    expect(bestResult.totalTravelTime).toBeGreaterThan(0);
    expect(bestResult.totalTravelCost).toBeGreaterThan(0);

    expect((bestResult as any).startLocation).toBeUndefined();
    expect((bestResult as any).routeScore).toBeUndefined();
  });
});
