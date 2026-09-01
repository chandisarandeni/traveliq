import { SriLankaAttraction } from '../interfaces/attraction-selection.interface';
import { InterestCategory } from '../enums/interest-category.enum';

/**
 * Calculates the interest matching score for a Sri Lankan attraction against user interest weights.
 *
 * Sums the preference weights for all interest categories present on the attraction that match
 * the user's weighted interest list.
 *
 * Example:
 * User: BEACH = 5, HISTORY = 3, NATURE = 2
 * Attraction categories: [BEACH, HISTORY]
 * Score: 5 + 3 = 8
 *
 * Complexity:
 * - Time: O(C) where C is the number of categories on the attraction (assuming O(1) map lookup).
 * - Space: O(1) auxiliary space.
 *
 * @param attraction The Sri Lankan attraction object
 * @param interestWeightMap Map of InterestCategory -> preference weight
 * @returns Numeric interest score (>= 0)
 */
export function calculateInterestScore(
  attraction: SriLankaAttraction,
  interestWeightMap: Map<InterestCategory, number>,
): number {
  if (!attraction || !Array.isArray(attraction.categories)) {
    return 0;
  }

  let totalScore = 0;
  // Use a Set to avoid double-counting duplicate tags on the same attraction
  const uniqueCategories = new Set(attraction.categories);

  for (const category of uniqueCategories) {
    const weight = interestWeightMap.get(category);
    if (weight && weight > 0) {
      totalScore += weight;
    }
  }

  return totalScore;
}
