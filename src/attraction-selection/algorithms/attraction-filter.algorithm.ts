import {
  SriLankaAttraction,
  AttractionFilterCriteria,
} from '../interfaces/attraction-selection.interface';
import { InterestCategory } from '../enums/interest-category.enum';
import { calculateInterestScore } from './interest-scoring.algorithm';

/**
 * Filters Sri Lankan attractions based on availability and optional candidate criteria prior to priority queue insertion.
 *
 * Filter rules:
 * 1. Exclude unavailable attractions (`isAvailable === false`).
 * 2. Exclude attractions not matching specified region (if filter criteria defines `region`).
 * 3. Exclude attractions not matching specified district (if filter criteria defines `district`).
 * 4. Exclude attractions below `minRating` (if specified).
 * 5. If `requireInterestMatch` is true (or by default when enabled), exclude attractions with an interest score of 0.
 *
 * Complexity:
 * - Time: O(N * C) where N is total attractions and C is average category count per attraction.
 * - Space: O(N) to hold candidate list.
 *
 * @param attractions Input array of SriLankaAttraction objects
 * @param criteria Optional filtering constraints
 * @param interestWeightMap Optional map of user interest weights for scoring filter checks
 * @returns Filtered array of SriLankaAttraction objects
 */
export function filterAttractions(
  attractions: SriLankaAttraction[],
  criteria?: AttractionFilterCriteria,
  interestWeightMap?: Map<InterestCategory, number>,
): SriLankaAttraction[] {
  if (!Array.isArray(attractions)) {
    return [];
  }

  return attractions.filter((attraction) => {
    if (!attraction || !attraction.id) {
      return false;
    }

    // 1. Availability check
    if (attraction.isAvailable === false) {
      return false;
    }

    // 2. Region check (case-insensitive substring/match)
    if (criteria?.region) {
      if (
        !attraction.region ||
        attraction.region.toLowerCase() !== criteria.region.toLowerCase()
      ) {
        return false;
      }
    }

    // 3. District check (case-insensitive)
    if (criteria?.district) {
      if (
        !attraction.district ||
        attraction.district.toLowerCase() !== criteria.district.toLowerCase()
      ) {
        return false;
      }
    }

    // 4. Rating check
    if (typeof criteria?.minRating === 'number') {
      if (
        typeof attraction.rating !== 'number' ||
        attraction.rating < criteria.minRating
      ) {
        return false;
      }
    }

    // 5. Interest match check if specified or if zero-score filtering is active
    if (criteria?.requireInterestMatch && interestWeightMap) {
      const score = calculateInterestScore(attraction, interestWeightMap);
      if (score <= 0) {
        return false;
      }
    }

    return true;
  });
}
