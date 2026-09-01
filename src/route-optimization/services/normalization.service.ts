import { Injectable } from '@nestjs/common';
import {
  MatrixBounds,
  RouteWeights,
} from '../interfaces/route-optimization.interface';

@Injectable()
export class NormalizationService {
  /**
   * Computes the min and max bounds for distance, time, and cost matrices.
   * Considers off-diagonal (u != v) elements to determine realistic ranges,
   * or all elements if N=1.
   */
  calculateMatrixBounds(
    distanceMatrix: number[][],
    timeMatrix: number[][],
    costMatrix: number[][],
  ): MatrixBounds {
    const n = distanceMatrix.length;
    let minDistance = Infinity;
    let maxDistance = -Infinity;
    let minTime = Infinity;
    let maxTime = -Infinity;
    let minCost = Infinity;
    let maxCost = -Infinity;

    let evaluatedCount = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Prefer off-diagonal values unless matrix is 1x1
        if (i !== j || n === 1) {
          const d = distanceMatrix[i][j];
          const t = timeMatrix[i][j];
          const c = costMatrix[i][j];

          if (d < minDistance) minDistance = d;
          if (d > maxDistance) maxDistance = d;

          if (t < minTime) minTime = t;
          if (t > maxTime) maxTime = t;

          if (c < minCost) minCost = c;
          if (c > maxCost) maxCost = c;

          evaluatedCount++;
        }
      }
    }

    if (evaluatedCount === 0) {
      minDistance = maxDistance = 0;
      minTime = maxTime = 0;
      minCost = maxCost = 0;
    }

    return {
      minDistance,
      maxDistance,
      minTime,
      maxTime,
      minCost,
      maxCost,
    };
  }

  /**
   * Performs min-max normalization. Handles max === min case safely.
   */
  normalizeValue(value: number, min: number, max: number): number {
    if (max === min) {
      return 0;
    }
    return (value - min) / (max - min);
  }

  /**
   * Normalizes weights so that their sum equals 1.0.
   * If sum is 0, defaults to initial recommended weights (0.5 cost, 0.3 time, 0.2 dist).
   */
  normalizeWeights(rawWeights?: Partial<RouteWeights>): RouteWeights {
    const costWeight = rawWeights?.costWeight ?? 0.5;
    const timeWeight = rawWeights?.timeWeight ?? 0.3;
    const distanceWeight = rawWeights?.distanceWeight ?? 0.2;

    const sum = costWeight + timeWeight + distanceWeight;
    if (sum <= 0) {
      return { costWeight: 0.5, timeWeight: 0.3, distanceWeight: 0.2 };
    }

    return {
      costWeight: costWeight / sum,
      timeWeight: timeWeight / sum,
      distanceWeight: distanceWeight / sum,
    };
  }

  /**
   * Calculates the weighted normalized score for a segment from u to v.
   */
  calculateEdgeScore(
    fromIndex: number,
    toIndex: number,
    distanceMatrix: number[][],
    timeMatrix: number[][],
    costMatrix: number[][],
    bounds: MatrixBounds,
    weights: RouteWeights,
  ): number {
    const dist = distanceMatrix[fromIndex][toIndex];
    const time = timeMatrix[fromIndex][toIndex];
    const cost = costMatrix[fromIndex][toIndex];

    const normDist = this.normalizeValue(
      dist,
      bounds.minDistance,
      bounds.maxDistance,
    );
    const normTime = this.normalizeValue(time, bounds.minTime, bounds.maxTime);
    const normCost = this.normalizeValue(cost, bounds.minCost, bounds.maxCost);

    return (
      weights.costWeight * normCost +
      weights.timeWeight * normTime +
      weights.distanceWeight * normDist
    );
  }
}
