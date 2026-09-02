export class SelectedAttractionDto {
  // Stable attraction ID from Attraction Selection or the attractions database.
  attractionId: string;

  // Display name used when route data is name-based.
  attractionName: string;

  // Attraction entry/activity cost in LKR, retained for later budget work.
  activityCost: number;

  // Expected time spent at this attraction, measured in hours.
  visitDuration: number;

  // Preference score from Attraction Selection, retained for later ranking/scoring.
  interestScore: number;
}
