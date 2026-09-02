import { BudgetFeasibilityResult } from './budget-feasibility-result.interface';
import { TimeItineraryResult } from './time-itinerary-result.interface';

export interface TripFeasibilityResult {
  // True only when both time scheduling and budget feasibility pass.
  overallFeasible: boolean;

  // Time and itinerary scheduling result.
  time: TimeItineraryResult;

  // Budget feasibility result.
  budget: BudgetFeasibilityResult;

  // Combined explanations from both phases.
  failureReasons: string[];
}
