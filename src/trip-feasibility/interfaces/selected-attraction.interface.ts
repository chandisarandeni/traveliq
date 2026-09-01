export interface SelectedAttractionInput {
  // Stable attraction identifier from the selected-attractions output.
  attractionId: string;

  // Attraction display name.
  attractionName: string;

  // Activity cost in LKR, not used for budget feasibility yet.
  activityCost: number;

  // Expected attraction visit duration in hours.
  visitDuration: number;

  // Interest score from the attraction selection phase.
  interestScore: number;
}
