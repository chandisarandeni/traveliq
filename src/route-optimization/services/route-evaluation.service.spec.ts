import { RouteEvaluationService } from './route-evaluation.service';
import { NormalizationService } from './normalization.service';

describe('RouteEvaluationService', () => {
  let service: RouteEvaluationService;
  let normalizationService: NormalizationService;

  beforeEach(() => {
    normalizationService = new NormalizationService();
    service = new RouteEvaluationService(normalizationService);
  });

  const locations = ['Colombo', 'Kandy', 'Galle'];
  const distMatrix = [
    [0, 115, 125],
    [115, 0, 230],
    [125, 230, 0],
  ];
  const timeMatrix = [
    [0, 3.2, 2.5],
    [3.2, 0, 4.5],
    [2.5, 4.5, 0],
  ];
  const costMatrix = [
    [0, 4000, 4500],
    [4000, 0, 7000],
    [4500, 7000, 0],
  ];

  it('should evaluate totals, segments, and route score accurately', () => {
    const bounds = normalizationService.calculateMatrixBounds(
      distMatrix,
      timeMatrix,
      costMatrix,
    );
    const weights = normalizationService.normalizeWeights();

    // Route: Colombo (0) -> Kandy (1) -> Galle (2)
    const result = service.evaluateRoute(
      [0, 1, 2],
      locations,
      distMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );

    expect(result.totalTravelDistance).toBe(115 + 230); // 345
    expect(result.totalTravelTime).toBe(3.2 + 4.5); // 7.7
    expect(result.totalTravelCost).toBe(4000 + 7000); // 11000
    expect(result.destinations).toEqual(['Colombo', 'Kandy', 'Galle']);
    expect(result.routeSegments.length).toBe(2);

    expect(result.routeSegments[0]).toEqual({
      from: 'Colombo',
      to: 'Kandy',
      travelDistance: 115,
      travelTime: 3.2,
      travelCost: 4000,
    });

    expect(result.routeSegments[1]).toEqual({
      from: 'Kandy',
      to: 'Galle',
      travelDistance: 230,
      travelTime: 4.5,
      travelCost: 7000,
    });
  });
});
