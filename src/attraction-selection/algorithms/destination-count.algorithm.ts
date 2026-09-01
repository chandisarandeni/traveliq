import { BadRequestException } from '@nestjs/common';
import { TravelStyle } from '../enums/travel-style.enum';

/**
 * Calculates the recommended number of destinations based on trip duration and travel style.
 *
 * Algorithm Rules:
 * - Base count = tripDuration + 1
 * - RELAXED: base count - 1
 * - BALANCED: base count
 * - ADVENTURE: base count + 1
 * - Final count is bounded by a lower limit of 2 (Math.max(2, count)).
 *
 * Complexity: O(1) time and space complexity.
 *
 * @param tripDuration Number of days for the trip (must be an integer >= 1)
 * @param travelStyle User's travel style (RELAXED, BALANCED, ADVENTURE)
 * @returns Recommended destination count (integer >= 2)
 */
export function calculateDestinationCount(
  tripDuration: number,
  travelStyle: TravelStyle,
): number {
  if (
    typeof tripDuration !== 'number' ||
    Number.isNaN(tripDuration) ||
    !Number.isFinite(tripDuration) ||
    !Number.isInteger(tripDuration) ||
    tripDuration < 1
  ) {
    throw new BadRequestException(
      'Invalid trip duration: must be a positive integer >= 1.',
    );
  }

  if (!Object.values(TravelStyle).includes(travelStyle)) {
    throw new BadRequestException(
      `Invalid travel style: must be one of ${Object.values(TravelStyle).join(', ')}.`,
    );
  }

  const baseCount = tripDuration + 1;
  let adjustment = 0;

  switch (travelStyle) {
    case TravelStyle.RELAXED:
      adjustment = -1;
      break;
    case TravelStyle.BALANCED:
      adjustment = 0;
      break;
    case TravelStyle.ADVENTURE:
      adjustment = 1;
      break;
  }

  const finalCount = baseCount + adjustment;
  return Math.max(2, finalCount);
}
