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
  tripDuration: number;
  maxDailyTravelTime: number;
  startingLocation: LocationDto;
  endingLocation: LocationDto;
  selectedAttractions: SelectedAttractionDto[];
  optimizedRoute: OptimizedRouteDto;
}
