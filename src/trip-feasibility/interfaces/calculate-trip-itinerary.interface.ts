import { LocationInput } from './location.interface';
import { OptimizedRouteInput } from './optimized-route.interface';
import { SelectedAttractionInput } from './selected-attraction.interface';

export interface CalculateTripItineraryInput {
  tripDuration: number;
  maxDailyTravelTime: number;
  startingLocation: LocationInput;
  endingLocation: LocationInput;
  selectedAttractions: SelectedAttractionInput[];
  optimizedRoute: OptimizedRouteInput;
}
