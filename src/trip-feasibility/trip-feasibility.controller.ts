import { Body, Controller, Post } from '@nestjs/common';
import { TripFeasibilityService } from './trip-feasibility.service';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';

@Controller('trip-feasibility')
export class TripFeasibilityController {
  constructor(
    private readonly tripFeasibilityService: TripFeasibilityService,
  ) {}

  // Main Trip Feasibility endpoint for this phase: time and itinerary only.
  @Post('itinerary')
  calculateItinerary(@Body() dto: CalculateTripItineraryDto) {
    return this.tripFeasibilityService.calculateItinerary(dto);
  }
}
