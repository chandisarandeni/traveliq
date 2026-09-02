import { NearestNeighborService } from './nearest-neighbor.service';
import { NormalizationService } from '../services/normalization.service';

describe('NearestNeighborService', () => {
  let nnService: NearestNeighborService;
  let normalizationService: NormalizationService;

  beforeEach(() => {
    normalizationService = new NormalizationService();
    nnService = new NearestNeighborService(normalizationService);
  });

  it('should create initial route keeping start first and end last without duplicating destinations', () => {
    // 0: Start (Colombo)
    // 1: Sigiriya
    // 2: Dambulla
    // 3: Kandy
    // 4: End (Airport)
    const distMatrix = [
      [0, 170, 150, 115, 35],
      [170, 0, 20, 90, 170],
      [150, 20, 0, 75, 150],
      [115, 90, 75, 0, 115],
      [35, 170, 150, 115, 0],
    ];
    const timeMatrix = distMatrix.map((row) => row.map((val) => val / 50));
    const costMatrix = distMatrix.map((row) => row.map((val) => val * 100));

    const bounds = normalizationService.calculateMatrixBounds(
      distMatrix,
      timeMatrix,
      costMatrix,
    );
    const weights = normalizationService.normalizeWeights();

    const route = nnService.generateInitialRoute(
      0, // startIndex
      4, // endIndex
      [1, 2, 3], // intermediateIndices
      distMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );

    expect(route[0]).toBe(0); // Start remains first
    expect(route[route.length - 1]).toBe(4); // End remains last
    expect(route.length).toBe(5); // All 5 locations present

    // Check that every intermediate destination is visited exactly once
    const intermediates = route.slice(1, -1);
    expect(intermediates.sort()).toEqual([1, 2, 3]);
  });
});
