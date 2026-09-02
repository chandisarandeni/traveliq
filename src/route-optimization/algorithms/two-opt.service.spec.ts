import { TwoOptService } from './two-opt.service';
import { RouteEvaluationService } from '../services/route-evaluation.service';
import { NormalizationService } from '../services/normalization.service';

describe('TwoOptService', () => {
  let twoOptService: TwoOptService;
  let routeEvaluationService: RouteEvaluationService;
  let normalizationService: NormalizationService;

  beforeEach(() => {
    normalizationService = new NormalizationService();
    routeEvaluationService = new RouteEvaluationService(normalizationService);
    twoOptService = new TwoOptService(routeEvaluationService);
  });

  it('should optimize route while preserving fixed start and fixed end', () => {
    const locations = ['Start', 'A', 'B', 'C', 'End'];
    // Sub-optimal initial route: Start -> B -> A -> C -> End
    const initialRoute = [0, 2, 1, 3, 4];

    // Distance matrix where Start -> A -> B -> C -> End is optimal
    const distMatrix = [
      [0, 10, 50, 100, 200],
      [10, 0, 10, 50, 150],
      [50, 10, 0, 10, 100],
      [100, 50, 10, 0, 10],
      [200, 150, 100, 10, 0],
    ];
    const timeMatrix = distMatrix.map((row) => row.map((val) => val / 10));
    const costMatrix = distMatrix.map((row) => row.map((val) => val * 100));

    const bounds = normalizationService.calculateMatrixBounds(
      distMatrix,
      timeMatrix,
      costMatrix,
    );
    const weights = normalizationService.normalizeWeights();

    const initialEval = routeEvaluationService.evaluateRoute(
      initialRoute,
      locations,
      distMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );

    const optimizedEval = twoOptService.optimizeRoute(
      initialRoute,
      locations,
      distMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );

    expect(optimizedEval.routeIndices[0]).toBe(0); // Start remains first
    expect(
      optimizedEval.routeIndices[optimizedEval.routeIndices.length - 1],
    ).toBe(4); // End remains last
    expect(optimizedEval.routeScore).toBeLessThanOrEqual(
      initialEval.routeScore,
    );
    expect(optimizedEval.destinations).toEqual(['Start', 'A', 'B', 'C', 'End']);
  });
});
