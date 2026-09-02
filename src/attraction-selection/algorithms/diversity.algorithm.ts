import { InterestCategory } from '../enums/interest-category.enum';
import { ScoredCandidateAttraction } from '../interfaces/candidate-plans.interface';

/**
 * Total number of distinct interest categories supported by the system.
 * Equals Object.values(InterestCategory).length — kept as a constant so
 * the diversity formula is explicit and easy to audit.
 *
 * Current value: 10  (BEACH, CULTURE, HISTORY, NATURE, ADVENTURE,
 *                      WILDLIFE, RELIGIOUS, FOOD, SHOPPING, SCENIC)
 */
const TOTAL_INTEREST_CATEGORIES: number = Object.values(InterestCategory).length;

/**
 * Calculates the diversity score for a completed set of selected attractions.
 *
 * Formula:
 *   distinctCategories = union of ALL interest categories across every selected attraction
 *   diversityScore     = (distinctCategories.size / TOTAL_INTEREST_CATEGORIES) × 10
 *
 * A plan where every attraction covers a different category scores closer to 10.
 * A plan where all attractions share the same single category scores closer to 1.
 *
 * Score is on the 0–10 scale (matching the normalised interest score scale).
 *
 * Data structures used:
 *   Set<InterestCategory> — O(1) insert/lookup, guarantees distinct categories
 *
 * Complexity: O(D × K) where D = number of selected attractions,
 *                             K = average number of categories per attraction
 *
 * @param selectedAttractions The attractions chosen for a single trip plan
 * @returns Diversity score in the range [0, 10]
 */
export function calculateDiversityScore(
  selectedAttractions: ScoredCandidateAttraction[],
): number {
  if (selectedAttractions.length === 0) {
    return 0;
  }

  const distinctCategories = new Set<InterestCategory>();

  for (const candidate of selectedAttractions) {
    for (const category of candidate.attraction.categories) {
      distinctCategories.add(category);
    }
  }

  return (distinctCategories.size / TOTAL_INTEREST_CATEGORIES) * 10;
}

/**
 * Calculates how many new unique interest categories a candidate attraction
 * would add to the plan's currently covered category set.
 *
 * Used at each step of the greedy selection loop to give partially-matched
 * attractions a diversity bonus proportional to the genuinely new categories
 * they bring in.
 *
 * Formula:
 *   newCategories       = categories on this candidate NOT already in coveredCategories
 *   diversityContrib    = (newCategories / TOTAL_INTEREST_CATEGORIES) × 10
 *
 * This returns a 0–10 value comparable to the normalised interest score,
 * so both components can be mixed in the same greedy selection value formula.
 *
 * Data structures used:
 *   Set<InterestCategory> — O(1) membership lookup for coveredCategories
 *
 * Complexity: O(K) where K = number of categories on the candidate attraction
 *
 * @param candidate         Attraction being evaluated for selection
 * @param coveredCategories Categories already represented in the current plan
 * @returns Diversity contribution score in the range [0, 10]
 */
export function calculateDiversityContribution(
  candidate: ScoredCandidateAttraction,
  coveredCategories: Set<InterestCategory>,
): number {
  let newCategoryCount = 0;

  for (const category of candidate.attraction.categories) {
    if (!coveredCategories.has(category)) {
      newCategoryCount++;
    }
  }

  return (newCategoryCount / TOTAL_INTEREST_CATEGORIES) * 10;
}

/**
 * Calculates the overlap ratio between two trip plans.
 *
 * Formula:
 *   overlap = |sharedAttractions| / |planAIds|
 *
 * A value of 1.0 means both plans contain exactly the same attractions.
 * A value of 0.0 means they share no attractions.
 *
 * Used to enforce plan diversity: if overlap exceeds the similarity threshold,
 * the newer plan is considered too similar and is regenerated or discarded.
 *
 * Data structures used:
 *   Set<string> — O(1) membership lookup for planBIds
 *
 * Complexity: O(D) where D = number of attractions per plan
 *
 * @param planAIds Set of attraction IDs belonging to plan A
 * @param planBIds Set of attraction IDs belonging to plan B
 * @returns Overlap ratio in the range [0, 1]
 */
export function calculatePlanSimilarity(
  planAIds: Set<string>,
  planBIds: Set<string>,
): number {
  if (planAIds.size === 0) {
    return 0;
  }

  let sharedCount = 0;

  for (const id of planAIds) {
    if (planBIds.has(id)) {
      sharedCount++;
    }
  }

  return sharedCount / planAIds.size;
}
