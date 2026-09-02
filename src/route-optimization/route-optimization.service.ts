import { Injectable, Optional, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OptimizeSinglePlanDto } from './dto/optimize-route.dto';
import { OptimizedPlanResult } from './interfaces/route-optimization.interface';
import { MatrixValidationService } from './services/matrix-validation.service';
import { NormalizationService } from './services/normalization.service';
import { RouteEvaluationService } from './services/route-evaluation.service';
import { NearestNeighborService } from './algorithms/nearest-neighbor.service';
import { TwoOptService } from './algorithms/two-opt.service';
import {
  RouteOptimizationResult,
  RouteOptimizationResultDocument,
} from './schemas/route-optimization.schema';
import {
  TourismNetwork,
  TourismNetworkDocument,
} from '../tourism-network/schemas/tourism-network.schema';

@Injectable()
export class RouteOptimizationService {
  constructor(
    private readonly matrixValidationService: MatrixValidationService,
    private readonly normalizationService: NormalizationService,
    private readonly routeEvaluationService: RouteEvaluationService,
    private readonly nearestNeighborService: NearestNeighborService,
    private readonly twoOptService: TwoOptService,
    @Optional()
    @InjectModel(RouteOptimizationResult.name)
    private readonly routeOptimizationModel?: Model<RouteOptimizationResultDocument>,
    @Optional()
    @InjectModel(TourismNetwork.name)
    private readonly tourismNetworkModel?: Model<TourismNetworkDocument>,
  ) {}

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
  optimizePlans(
    dtos: OptimizeSinglePlanDto[],
    networkId?: string,
  ): OptimizedPlanResult[] {
    const results = dtos.map((dto) => this.optimizeSinglePlan(dto));
    this.saveOptimizationResult(results, undefined, networkId).catch(() => {});
    return results;
  }

  /**
   * Compares multiple travel plans, evaluates total time, distance, and cost for each plan,
   * and returns ONLY the single best overall optimized route.
   */
  optimizeBestPlan(
    dtos: OptimizeSinglePlanDto[],
    networkId?: string,
  ): OptimizedPlanResult {
    if (!dtos || dtos.length === 0) {
      throw new Error('At least one plan must be provided for optimization.');
    }

    const optimizedResults = dtos.map((dto) => this.optimizeSinglePlan(dto));

    let bestPlan = optimizedResults[0];

    if (optimizedResults.length > 1) {
      // Min-Max normalize total metrics across the optimized plans
      let minDist = Infinity,
        maxDist = -Infinity;
      let minTime = Infinity,
        maxTime = -Infinity;
      let minCost = Infinity,
        maxCost = -Infinity;

      optimizedResults.forEach((res) => {
        if (res.totalTravelDistance < minDist) minDist = res.totalTravelDistance;
        if (res.totalTravelDistance > maxDist) maxDist = res.totalTravelDistance;

        if (res.totalTravelTime < minTime) minTime = res.totalTravelTime;
        if (res.totalTravelTime > maxTime) maxTime = res.totalTravelTime;

        if (res.totalTravelCost < minCost) minCost = res.totalTravelCost;
        if (res.totalTravelCost > maxCost) maxCost = res.totalTravelCost;
      });

      let bestScore = Infinity;

      optimizedResults.forEach((res, idx) => {
        const weights = this.normalizationService.normalizeWeights(
          dtos[idx].weights,
        );

        const normDist = this.normalizationService.normalizeValue(
          res.totalTravelDistance,
          minDist,
          maxDist,
        );
        const normTime = this.normalizationService.normalizeValue(
          res.totalTravelTime,
          minTime,
          maxTime,
        );
        const normCost = this.normalizationService.normalizeValue(
          res.totalTravelCost,
          minCost,
          maxCost,
        );

        const planScore =
          weights.costWeight * normCost +
          weights.timeWeight * normTime +
          weights.distanceWeight * normDist;

        if (planScore < bestScore) {
          bestScore = planScore;
          bestPlan = res;
        }
      });
    }

    this.saveOptimizationResult(optimizedResults, bestPlan, networkId).catch(
      () => {},
    );
    return bestPlan;
  }

  /**
   * Fetches real Network Analysis matrices from MongoDB by networkId, runs optimization, saves result, and returns.
   */
  async optimizeFromNetworkId(networkId: string): Promise<OptimizedPlanResult[]> {
    if (!this.tourismNetworkModel) {
      throw new Error('Database model is not configured.');
    }

    const networkDoc = await this.tourismNetworkModel
      .findOne({ networkId })
      .exec();

    if (!networkDoc || !networkDoc.routeOptimizationPlans) {
      throw new NotFoundException(
        `Tourism Network Analysis record with networkId "${networkId}" was not found in database.`,
      );
    }

    const dtos: OptimizeSinglePlanDto[] = networkDoc.routeOptimizationPlans.map(
      (plan) => ({
        planId: plan.planId,
        startLocation: plan.startLocation,
        endLocation: plan.endLocation,
        locations: plan.locations,
        distanceMatrix: plan.distanceMatrix,
        timeMatrix: plan.timeMatrix,
        costMatrix: plan.costMatrix,
        weights: plan.weights,
      }),
    );

    return this.optimizePlans(dtos, networkId);
  }

  /**
   * Persists route optimization results into MongoDB collection.
   */
  async saveOptimizationResult(
    plans: OptimizedPlanResult[],
    bestPlan?: OptimizedPlanResult,
    networkId?: string,
  ): Promise<RouteOptimizationResult | null> {
    if (!this.routeOptimizationModel) {
      return null;
    }

    try {
      const optimizationId = `opt_${Date.now()}_${Math.floor(
        Math.random() * 1000,
      )}`;

      const newDoc = new this.routeOptimizationModel({
        optimizationId,
        networkId,
        plans,
        bestPlan,
      });

      return await newDoc.save();
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all saved route optimization results from MongoDB.
   */
  async findAllSavedResults(): Promise<RouteOptimizationResult[]> {
    if (!this.routeOptimizationModel) {
      return [];
    }
    return this.routeOptimizationModel.find().exec();
  }

  /**
   * Retrieves a saved route optimization result by ID from MongoDB.
   */
  async findSavedResultById(id: string): Promise<RouteOptimizationResult | null> {
    if (!this.routeOptimizationModel) {
      return null;
    }
    return this.routeOptimizationModel
      .findOne({ $or: [{ optimizationId: id }, { networkId: id }] })
      .exec();
  }
}
