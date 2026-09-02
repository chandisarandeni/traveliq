import { Module } from '@nestjs/common';
import { TripFeasibilityService } from './trip-feasibility.service';
import { TripFeasibilityController } from './trip-feasibility.controller';

// NestJS module wrapper for the Trip Feasibility feature.
@Module({
  // Exposes HTTP routes under /trip-feasibility.
  controllers: [TripFeasibilityController],

  // Provides validation and scheduling coordination.
  providers: [TripFeasibilityService],
})
export class TripFeasibilityModule {}
