import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TripFeasibilityService } from './trip-feasibility.service';
import { TripFeasibilityController } from './trip-feasibility.controller';
import {
  TripFeasibility,
  TripFeasibilitySchema,
} from './entities/trip-feasibility.entity';

// NestJS module wrapper for the Trip Feasibility feature.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TripFeasibility.name, schema: TripFeasibilitySchema },
    ]),
  ],

  // Exposes HTTP routes under /trip-feasibility.
  controllers: [TripFeasibilityController],

  // Provides validation and scheduling coordination.
  providers: [TripFeasibilityService],
})
export class TripFeasibilityModule {}
