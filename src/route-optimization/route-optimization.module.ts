import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouteOptimizationController } from './route-optimization.controller';
import { RouteOptimizationService } from './route-optimization.service';
import { MatrixValidationService } from './services/matrix-validation.service';
import { NormalizationService } from './services/normalization.service';
import { RouteEvaluationService } from './services/route-evaluation.service';
import { NearestNeighborService } from './algorithms/nearest-neighbor.service';
import { TwoOptService } from './algorithms/two-opt.service';
import { MockDataService } from './services/mock-data.service';
import {
  RouteOptimizationResult,
  RouteOptimizationResultSchema,
} from './schemas/route-optimization.schema';
import {
  TourismNetwork,
  TourismNetworkSchema,
} from '../tourism-network/schemas/tourism-network.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RouteOptimizationResult.name,
        schema: RouteOptimizationResultSchema,
      },
      {
        name: TourismNetwork.name,
        schema: TourismNetworkSchema,
      },
    ]),
  ],
  controllers: [RouteOptimizationController],
  providers: [
    RouteOptimizationService,
    MatrixValidationService,
    NormalizationService,
    RouteEvaluationService,
    NearestNeighborService,
    TwoOptService,
    MockDataService,
  ],
  exports: [RouteOptimizationService],
})
export class RouteOptimizationModule {}
