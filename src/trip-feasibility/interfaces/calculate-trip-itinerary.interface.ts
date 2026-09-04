import { LocationInput } from './location.interface';
import { OptimizedRouteInput } from './optimized-route.interface';
import { SelectedAttractionInput } from './selected-attraction.interface';

export interface CalculateTripItineraryInput {
  // Requested trip length in days.
  tripDuration: number;

  // Tourist's maximum acceptable travel hours per day.
  maxDailyTravelTime: number;

  // Journey start, which may be a city instead of a selected attraction.
  startingLocation: LocationInput;

  // Journey end, which may or may not also be a selected attraction.
  endingLocation: LocationInput;

  // Attractions that need visit-time scheduling.
  selectedAttractions: SelectedAttractionInput[];

  // Fixed route order and travel segment data.
  optimizedRoute: OptimizedRouteInput;
}
