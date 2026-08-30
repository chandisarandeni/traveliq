import { Module } from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';
import { RouteOptimizationController } from './route-optimization.controller';

@Module({
  controllers: [RouteOptimizationController],
  providers: [RouteOptimizationService],
})
export class RouteOptimizationModule {}
