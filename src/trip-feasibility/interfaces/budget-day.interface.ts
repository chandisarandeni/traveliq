export interface BudgetDay {
  // Human-friendly day number starting from 1.
  dayNumber: number;

  // Food estimate for this travel day in LKR.
  foodCost: number;

  // Accommodation estimate for the night after this day in LKR.
  accommodationCost: number;

  // Transport cost assigned to this itinerary day in LKR.
  travelCost: number;

  // Attraction activity cost assigned to this itinerary day in LKR.
  activityCost: number;

  // Total estimated cost for this day in LKR.
  totalDayCost: number;
}
