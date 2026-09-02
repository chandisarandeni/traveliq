import { InterestCategory } from '../enums/interest-category.enum';
import { TravelStyle } from '../enums/travel-style.enum';

/**
 * Domain representation of a Sri Lankan Attraction.
 */
export interface SriLankaAttraction {
  id: string;
  name: string;
  categories: InterestCategory[];
  isAvailable?: boolean;
  region?: string;
  district?: string;
  rating?: number;
  latitude?: number;
  longitude?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

/**
 * Interface representing a user interest and its assigned preference weight.
 */
export interface InterestWeight {
  interest: InterestCategory;
  weight: number;
}

/**
 * Input for destination count calculation.
 */
export interface DestinationCountInput {
  tripDuration: number;
  travelStyle: TravelStyle;
}

/**
 * Filtering criteria for attractions prior to priority queue scoring.
 */
export interface AttractionFilterCriteria {
  region?: string;
  district?: string;
  minRating?: number;
  requireInterestMatch?: boolean;
}

/**
 * An attraction coupled with its computed interest score.
 */
export interface ScoredAttraction {
  attraction: SriLankaAttraction;
  score: number;
}

/**
 * Output candidate attraction with rank and calculated interest score.
 */
export interface CandidateAttraction {
  attraction: SriLankaAttraction;
  score: number;
  rank: number;
}

/**
 * Complete request payload for the attraction selection pipeline.
 */
export interface AttractionSelectionRequest {
  tripDuration: number;
  travelStyle: TravelStyle;
  userInterests: InterestWeight[];
  availableAttractions: SriLankaAttraction[];
  filterCriteria?: AttractionFilterCriteria;
}

/**
 * Response result from the attraction selection service.
 */
export interface AttractionSelectionResult {
  recommendedDestinationCount: number;
  candidateAttractions: CandidateAttraction[];
  totalCandidatesEvaluated: number;
  totalCandidatesFiltered: number;
}
