import { TravelStyle } from '../enums/travel-style.enum';
import {
  InterestWeight,
  SriLankaAttraction,
  AttractionFilterCriteria,
} from '../interfaces/attraction-selection.interface';
import { TripLocation } from '../interfaces/candidate-plans.interface';

/**
 * Request DTO for the POST /attraction-selection/plans endpoint.
 *
 * Fields are intentionally identical to SelectAttractionsDto so that
 * callers do not need to change their payload shape — the new endpoint
 * simply extends the existing pipeline with plan generation on top.
 *
 * Kept as a separate class (rather than extending SelectAttractionsDto)
 * to avoid coupling the two endpoints together in case their contracts
 * diverge in future iterations.
 *
 * preferredTransportation — e.g. "private" | "public" | "mixed"
 *                           echoed in the response and forwarded to route optimisation
 * startingLocation        — coordinates of the trip start point
 * endingLocation          — coordinates of the trip end point
 */
export class GeneratePlansDto {
  tripDuration: number;
  travelStyle: TravelStyle;
  userInterests: InterestWeight[];
  availableAttractions: SriLankaAttraction[];
  filterCriteria?: AttractionFilterCriteria;
  preferredTransportation?: string;
  startingLocation?: TripLocation;
  endingLocation?: TripLocation;
}

