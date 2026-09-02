import { InterestWeight } from '../interfaces/attraction-selection.interface';
import { InterestCategory } from '../enums/interest-category.enum';

/**
 * Processes and creates a lookup map of user interest weights.
 *
 * Validates weights (ignores negative weights or invalid categories) and creates a fast O(1) map lookup.
 * If duplicate categories exist in input, the maximum weight provided is retained.
 *
 * Complexity:
 * - Time: O(M) where M is the number of user interest entries.
 * - Space: O(K) where K is the number of unique valid interest categories.
 *
 * @param userInterests Array of user interest weight inputs
 * @returns Map mapping InterestCategory -> weight (number)
 */
export function buildInterestWeightMap(
  userInterests: InterestWeight[],
): Map<InterestCategory, number> {
  const weightMap = new Map<InterestCategory, number>();

  if (!Array.isArray(userInterests)) {
    return weightMap;
  }

  for (const entry of userInterests) {
    if (!entry || !entry.interest || typeof entry.weight !== 'number') {
      continue;
    }

    // Ignore negative or non-finite weights
    if (entry.weight <= 0 || !Number.isFinite(entry.weight)) {
      continue;
    }

    const existingWeight = weightMap.get(entry.interest) ?? 0;
    weightMap.set(entry.interest, Math.max(existingWeight, entry.weight));
  }

  return weightMap;
}
