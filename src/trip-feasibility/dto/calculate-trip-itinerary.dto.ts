import { LocationDto } from './location.dto';
import { OptimizedRouteDto } from './optimized-route.dto';
import { SelectedAttractionDto } from './selected-attraction.dto';

/**
 * Request body for POST /trip-feasibility/itinerary.
 *
 * class-validator is not installed in this project yet, so TripFeasibilityService
 * performs explicit validation before calling the pure scheduling algorithm.
 */
export class CalculateTripItineraryDto {
  // Number of days the tourist requested for the trip.
  tripDuration: number;

  // Maximum number of travel-only hours the tourist accepts per day.
  maxDailyTravelTime: number;

  // First location in the journey; it does not need to be an attraction.
  startingLocation: LocationDto;

  // Final location requested by the tourist; Route Optimization decides how it is reached.
  endingLocation: LocationDto;

  // Attractions selected by the previous pipeline step.
  selectedAttractions: SelectedAttractionDto[];

  // Already ordered route produced by Route Optimization.
  optimizedRoute: OptimizedRouteDto;
}
