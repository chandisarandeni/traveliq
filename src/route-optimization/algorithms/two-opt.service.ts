import { Injectable } from '@nestjs/common';
import {
  MatrixBounds,
  RouteEvaluationResult,
  RouteWeights,
} from '../interfaces/route-optimization.interface';
import { RouteEvaluationService } from '../services/route-evaluation.service';

@Injectable()
export class TwoOptService {
  constructor(
    private readonly routeEvaluationService: RouteEvaluationService,
  ) {}

  /**
   * Optimizes an initial route using 2-opt edge-reversal algorithm.
   * Start location (index 0) and End location (index length-1) remain strictly fixed.
   */
  optimizeRoute(
    initialRoute: number[],
    locations: string[],
    distanceMatrix: number[][],
    timeMatrix: number[][],
    costMatrix: number[][],
    bounds: MatrixBounds,
    weights: RouteWeights,
    maxIterations = 500,
  ): RouteEvaluationResult {
    let currentRoute = [...initialRoute];
    let currentEvaluation = this.routeEvaluationService.evaluateRoute(
      currentRoute,
      locations,
      distanceMatrix,
      timeMatrix,
      costMatrix,
      bounds,
      weights,
    );

    const n = currentRoute.length;
    // If fewer than 4 locations (e.g. start + 0 or 1 destination + end), 2-opt cannot swap
    if (n < 4) {
      return currentEvaluation;
    }

    let improvement = true;
    let iterationCount = 0;

    // Continue until no improving 2-opt swap is found or safety limit reached
    while (improvement && iterationCount < maxIterations) {
      improvement = false;
      iterationCount++;

      // i ranges from 1 to n - 3 (inclusive)
      // j ranges from i + 1 to n - 2 (inclusive)
      // Route index 0 (Start) and n - 1 (End) are NOT modified
      for (let i = 1; i <= n - 3; i++) {
        for (let j = i + 1; j <= n - 2; j++) {
          const candidateRoute = this.reverseSubSegment(currentRoute, i, j);

          const candidateEvaluation = this.routeEvaluationService.evaluateRoute(
            candidateRoute,
            locations,
            distanceMatrix,
            timeMatrix,
            costMatrix,
            bounds,
            weights,
          );

          // Epsilon tolerance to avoid floating-point churn
          if (
            candidateEvaluation.routeScore <
            currentEvaluation.routeScore - 1e-6
          ) {
            currentRoute = candidateRoute;
            currentEvaluation = candidateEvaluation;
            improvement = true;
            break; // First-improvement strategy
          }
        }
        if (improvement) {
          break;
        }
      }
    }

    return currentEvaluation;
  }

  /**
   * Reverses sub-segment of array from index i to index j inclusive.
   */
  private reverseSubSegment(arr: number[], i: number, j: number): number[] {
    const newArr = [...arr];
    let left = i;
    let right = j;
    while (left < right) {
      const temp = newArr[left];
      newArr[left] = newArr[right];
      newArr[right] = temp;
      left++;
      right--;
    }
    return newArr;
  }
}
