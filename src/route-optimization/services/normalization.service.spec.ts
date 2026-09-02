import { NormalizationService } from './normalization.service';

describe('NormalizationService', () => {
  let service: NormalizationService;

  beforeEach(() => {
    service = new NormalizationService();
  });

  const distMatrix = [
    [0, 100, 200],
    [100, 0, 150],
    [200, 150, 0],
  ];

  const timeMatrix = [
    [0, 2, 4],
    [2, 0, 3],
    [4, 3, 0],
  ];

  const costMatrix = [
    [0, 1000, 2000],
    [1000, 0, 1500],
    [2000, 1500, 0],
  ];

  it('should calculate matrix bounds correctly', () => {
    const bounds = service.calculateMatrixBounds(
      distMatrix,
      timeMatrix,
      costMatrix,
    );

    expect(bounds.minDistance).toBe(100);
    expect(bounds.maxDistance).toBe(200);
    expect(bounds.minTime).toBe(2);
    expect(bounds.maxTime).toBe(4);
    expect(bounds.minCost).toBe(1000);
    expect(bounds.maxCost).toBe(2000);
  });

  it('should perform min-max normalization correctly', () => {
    expect(service.normalizeValue(150, 100, 200)).toBe(0.5);
    expect(service.normalizeValue(100, 100, 200)).toBe(0.0);
    expect(service.normalizeValue(200, 100, 200)).toBe(1.0);
  });

  it('should handle max === min safely without division by zero', () => {
    expect(service.normalizeValue(100, 100, 100)).toBe(0);
  });

  it('should normalize weights to sum to 1.0', () => {
    const raw = { costWeight: 1.0, timeWeight: 1.0, distanceWeight: 2.0 };
    const norm = service.normalizeWeights(raw);

    expect(norm.costWeight).toBeCloseTo(0.25);
    expect(norm.timeWeight).toBeCloseTo(0.25);
    expect(norm.distanceWeight).toBeCloseTo(0.5);
    expect(norm.costWeight + norm.timeWeight + norm.distanceWeight).toBeCloseTo(
      1.0,
    );
  });

  it('should calculate edge score using weighted normalized values', () => {
    const bounds = service.calculateMatrixBounds(
      distMatrix,
      timeMatrix,
      costMatrix,
    );
    const weights = service.normalizeWeights({
      costWeight: 0.5,
      timeWeight: 0.3,
      distanceWeight: 0.2,
    });

    // Edge from 0 to 1: dist=100 (min=100, max=200 -> norm 0), time=2 (min=2, max=4 -> norm 0), cost=1000 (min=1000, max=2000 -> norm 0)
    const score01 = service.calculateEdgeScore(
      0,
      1,
      distMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );
    expect(score01).toBe(0.0);

    // Edge from 0 to 2: dist=200 (norm 1), time=4 (norm 1), cost=2000 (norm 1)
    const score02 = service.calculateEdgeScore(
      0,
      2,
      distMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );
    expect(score02).toBe(1.0);
  });
});
