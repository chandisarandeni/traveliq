import { Injectable } from '@nestjs/common';
import { OptimizeSinglePlanDto } from './dto/optimize-route.dto';
import { OptimizedPlanResult } from './interfaces/route-optimization.interface';
import { MatrixValidationService } from './services/matrix-validation.service';
import { NormalizationService } from './services/normalization.service';
import { RouteEvaluationService } from './services/route-evaluation.service';
import { NearestNeighborService } from './algorithms/nearest-neighbor.service';
import { TwoOptService } from './algorithms/two-opt.service';

@Injectable()
export class RouteOptimizationService {
  constructor(
    private readonly matrixValidationService: MatrixValidationService,
    private readonly normalizationService: NormalizationService,
    private readonly routeEvaluationService: RouteEvaluationService,
    private readonly nearestNeighborService: NearestNeighborService,
    private readonly twoOptService: TwoOptService,
  ) { }

  /**
   * Main entry point for optimizing a single travel plan.
   * Returns ONLY planId, destinations, routeSegments, totalTravelDistance, totalTravelTime, and totalTravelCost.
   */
  optimizeSinglePlan(dto: OptimizeSinglePlanDto): OptimizedPlanResult {
    // 1. Matrix and input validation
    const { startIndex, endIndex, intermediateIndices } =
      this.matrixValidationService.validateInput(dto);

    // 2. Weight normalization and matrix bounds calculation
    const weights = this.normalizationService.normalizeWeights(dto.weights);
    const bounds = this.normalizationService.calculateMatrixBounds(
      dto.distanceMatrix,
      dto.timeMatrix,
      dto.costMatrix,
    );

    // 3. Algorithm 1 — Nearest Neighbor initial route generation
    const initialRouteIndices =
      this.nearestNeighborService.generateInitialRoute(
        startIndex,
        endIndex,
        intermediateIndices,
        dto.distanceMatrix,
        dto.timeMatrix,
        dto.costMatrix,
        bounds,
        weights,
      );

    // 4. Algorithm 2 — 2-opt route optimization
    const optimizedEvaluation = this.twoOptService.optimizeRoute(
      initialRouteIndices,
      dto.locations,
      dto.distanceMatrix,
      dto.timeMatrix,
      dto.costMatrix,
      bounds,
      weights,
    );

    // Return ONLY the requested output fields
    return {
      planId: dto.planId,
      destinations: optimizedEvaluation.destinations,
      routeSegments: optimizedEvaluation.routeSegments,
      totalTravelDistance: optimizedEvaluation.totalTravelDistance,
      totalTravelTime: optimizedEvaluation.totalTravelTime,
      totalTravelCost: optimizedEvaluation.totalTravelCost,
    };
  }

  /**
   * Optimizes multiple travel plans (e.g. 5 plans) provided in batch.
   */
  optimizePlans(dtos: OptimizeSinglePlanDto[]): OptimizedPlanResult[] {
    return dtos.map((dto) => this.optimizeSinglePlan(dto));
  }

  /**
   * Compares multiple travel plans, evaluates total time, distance, and cost for each plan,
   * and returns ONLY the single best overall optimized route.
   */
  optimizeBestPlan(dtos: OptimizeSinglePlanDto[]): OptimizedPlanResult {
    if (!dtos || dtos.length === 0) {
      throw new Error('At least one plan must be provided for optimization.');
    }

    const optimizedResults = this.optimizePlans(dtos);

    if (optimizedResults.length === 1) {
      return optimizedResults[0];
    }

    // Min-Max normalize total metrics across the optimized plans
    let minDist = Infinity, maxDist = -Infinity;
    let minTime = Infinity, maxTime = -Infinity;
    let minCost = Infinity, maxCost = -Infinity;

    optimizedResults.forEach((res) => {
      if (res.totalTravelDistance < minDist) minDist = res.totalTravelDistance;
      if (res.totalTravelDistance > maxDist) maxDist = res.totalTravelDistance;

      if (res.totalTravelTime < minTime) minTime = res.totalTravelTime;
      if (res.totalTravelTime > maxTime) maxTime = res.totalTravelTime;

      if (res.totalTravelCost < minCost) minCost = res.totalTravelCost;
      if (res.totalTravelCost > maxCost) maxCost = res.totalTravelCost;
    });

    let bestPlan = optimizedResults[0];
    let bestScore = Infinity;

    optimizedResults.forEach((res, idx) => {
      const weights = this.normalizationService.normalizeWeights(dtos[idx].weights);

      const normDist = this.normalizationService.normalizeValue(res.totalTravelDistance, minDist, maxDist);
      const normTime = this.normalizationService.normalizeValue(res.totalTravelTime, minTime, maxTime);
      const normCost = this.normalizationService.normalizeValue(res.totalTravelCost, minCost, maxCost);

      const planScore =
        weights.costWeight * normCost +
        weights.timeWeight * normTime +
        weights.distanceWeight * normDist;

      if (planScore < bestScore) {
        bestScore = planScore;
        bestPlan = res;
      }
    });

    return bestPlan;
  }
}
