import { Injectable } from '@nestjs/common';
import {
  MatrixBounds,
  RouteEvaluationResult,
  RouteSegment,
  RouteWeights,
} from '../interfaces/route-optimization.interface';
import { NormalizationService } from './normalization.service';

@Injectable()
export class RouteEvaluationService {
  constructor(private readonly normalizationService: NormalizationService) {}

  /**
   * Evaluates an ordered sequence of location indices against matrices, bounds, and weights.
   */
  evaluateRoute(
    routeIndices: number[],
    locations: string[],
    distanceMatrix: number[][],
    timeMatrix: number[][],
    costMatrix: number[][],
    bounds: MatrixBounds,
    weights: RouteWeights,
  ): RouteEvaluationResult {
    let totalTravelDistance = 0;
    let totalTravelTime = 0;
    let totalTravelCost = 0;
    let totalWeightedScore = 0;

    const routeSegments: RouteSegment[] = [];
    const numSegments = routeIndices.length - 1;

    for (let i = 0; i < numSegments; i++) {
      const u = routeIndices[i];
      const v = routeIndices[i + 1];

      const dist = distanceMatrix[u][v];
      const time = timeMatrix[u][v];
      const cost = costMatrix[u][v];

      totalTravelDistance += dist;
      totalTravelTime += time;
      totalTravelCost += cost;

      const edgeScore = this.normalizationService.calculateEdgeScore(
        u,
        v,
        distanceMatrix,
        timeMatrix,
        costMatrix,
        bounds,
        weights,
      );
      totalWeightedScore += edgeScore;

      routeSegments.push({
        from: locations[u],
        to: locations[v],
        travelDistance: this.roundToTwoDecimals(dist),
        travelTime: this.roundToTwoDecimals(time),
        travelCost: this.roundToTwoDecimals(cost),
      });
    }

    // Average edge score represents overall normalized route score [0, 1]
    const routeScore = numSegments > 0 ? totalWeightedScore / numSegments : 0;

    const destinations = routeIndices.map((idx) => locations[idx]);

    return {
      routeIndices,
      destinations,
      totalTravelDistance: this.roundToTwoDecimals(totalTravelDistance),
      totalTravelTime: this.roundToTwoDecimals(totalTravelTime),
      totalTravelCost: this.roundToTwoDecimals(totalTravelCost),
      routeScore: this.roundToFourDecimals(routeScore),
      routeSegments,
    };
  }

  private roundToTwoDecimals(val: number): number {
    return Math.round(val * 100) / 100;
  }

  private roundToFourDecimals(val: number): number {
    return Math.round(val * 10000) / 10000;
  }
}
