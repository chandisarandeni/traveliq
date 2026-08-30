import { Module } from '@nestjs/common';
import { TripFeasibilityService } from './trip-feasibility.service';
import { TripFeasibilityController } from './trip-feasibility.controller';

@Module({
  controllers: [TripFeasibilityController],
  providers: [TripFeasibilityService],
})
export class TripFeasibilityModule {}
