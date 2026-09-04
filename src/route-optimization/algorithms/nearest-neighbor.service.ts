import { Injectable } from '@nestjs/common';
import {
  MatrixBounds,
  RouteWeights,
} from '../interfaces/route-optimization.interface';
import { NormalizationService } from '../services/normalization.service';

@Injectable()
export class NearestNeighborService {
  constructor(private readonly normalizationService: NormalizationService) {}

  /**
   * Generates initial route using Nearest Neighbor heuristic based on weighted edge scores.
   * Start location remains fixed at index 0, end location remains fixed at the final index.
   */
  generateInitialRoute(
    startIndex: number,
    endIndex: number,
    intermediateIndices: number[],
    distanceMatrix: number[][],
    timeMatrix: number[][],
    costMatrix: number[][],
    bounds: MatrixBounds,
    weights: RouteWeights,
  ): number[] {
    const route: number[] = [startIndex];
    const visited = new Set<number>();
    visited.add(startIndex);

    // Prevent endIndex from being selected as an intermediate destination
    visited.add(endIndex);

    let current = startIndex;

    // Remaining unvisited intermediate tourist destinations
    const remainingToVisit = new Set<number>(intermediateIndices);

    while (remainingToVisit.size > 0) {
      let bestCandidate = -1;
      let bestScore = Infinity;

      for (const candidate of remainingToVisit) {
        const score = this.normalizationService.calculateEdgeScore(
          current,
          candidate,
          distanceMatrix,
          timeMatrix,
          costMatrix,
          bounds,
          weights,
        );

        if (score < bestScore) {
          bestScore = score;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate !== -1) {
        route.push(bestCandidate);
        visited.add(bestCandidate);
        remainingToVisit.delete(bestCandidate);
        current = bestCandidate;
      } else {
        // Fallback in case no candidate found (unlikely)
        break;
      }
    }

    // Append fixed end location at the end of the route
    route.push(endIndex);

    return route;
  }
}
