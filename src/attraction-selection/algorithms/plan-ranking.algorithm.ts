import { TripPlan } from '../interfaces/candidate-plans.interface';

/**
 * Weights applied when computing the composite plan score.
 *
 * planScore = (planInterestScore × INTEREST_WEIGHT) + (diversityScore × DIVERSITY_WEIGHT)
 *
 * Both inputs are on the 0–10 scale, so the result is also on the 0–10 scale.
 * The weights reflect the project's priority: high interest fit matters more
 * than breadth of categories, but diversity is still meaningfully rewarded.
 */
const INTEREST_WEIGHT = 0.7;
const DIVERSITY_WEIGHT = 0.3;

/**
 * Calculates the composite plan score from its two components.
 *
 * Formula:
 *   planScore = (planInterestScore × 0.7) + (diversityScore × 0.3)
 *
 * Both inputs must be on the 0–10 scale.
 * The result is rounded to two decimal places for clean API output.
 *
 * Complexity: O(1)
 *
 * @param planInterestScore Average normalised interest score of selected attractions (0–10)
 * @param diversityScore    Breadth of interest categories covered (0–10)
 * @returns Composite plan score (0–10, rounded to 2 d.p.)
 */
export function calculatePlanScore(
  planInterestScore: number,
  diversityScore: number,
): number {
  const raw =
    planInterestScore * INTEREST_WEIGHT + diversityScore * DIVERSITY_WEIGHT;
  return Math.round(raw * 100) / 100;
}

/**
 * Ranks an array of trip plans by planScore descending and assigns rank + planId.
 *
 * Tie-breaking order (fully deterministic — important for reproducible test results):
 *   1. Higher diversityScore
 *   2. Higher planInterestScore
 *   3. Lexicographic comparison of sorted, comma-joined attraction IDs
 *
 * After sorting:
 *   - rank   is set to the 1-based position (1 = best)
 *   - planId is set to "PLAN-001", "PLAN-002", … matching the rank
 *
 * The input array is NOT mutated — a new array is returned.
 *
 * Complexity: O(P log P) where P = number of plans
 *
 * @param plans Array of TripPlan objects (planScore must already be calculated)
 * @returns New sorted array with rank and planId populated (best plan first)
 */
export function rankPlans(plans: TripPlan[]): TripPlan[] {
  const sorted = [...plans].sort((a, b) => {
    // Primary sort: higher planScore is better
    if (b.planScore !== a.planScore) {
      return b.planScore - a.planScore;
    }

    // Tie 1: higher diversity score
    if (b.diversityScore !== a.diversityScore) {
      return b.diversityScore - a.diversityScore;
    }

    // Tie 2: higher interest score
    if (b.planInterestScore !== a.planInterestScore) {
      return b.planInterestScore - a.planInterestScore;
    }

    // Tie 3: lexicographic comparison of sorted attraction IDs (stable, deterministic)
    const aKey = a.selectedAttractions
      .map((c) => c.attraction.id)
      .sort()
      .join(',');
    const bKey = b.selectedAttractions
      .map((c) => c.attraction.id)
      .sort()
      .join(',');
    return aKey.localeCompare(bKey);
  });

  return sorted.map((plan, index) => ({
    ...plan,
    rank: index + 1,
    planId: `PLAN-${String(index + 1).padStart(3, '0')}`,
  }));
}
