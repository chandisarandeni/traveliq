export interface ScheduledAttraction {
  // Stable attraction identifier.
  attractionId: string;

  // Attraction name shown in itinerary responses.
  attractionName: string;

  // Visit duration in hours.
  visitDuration: number;

  // Activity cost in LKR, retained for the future budget phase.
  activityCost: number;

  // Tourist-interest score, retained for later ranking.
  interestScore: number;
}
