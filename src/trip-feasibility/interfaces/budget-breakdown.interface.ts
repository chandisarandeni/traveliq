import { BudgetDay } from './budget-day.interface';
import { TravelStyle, TransportationStyle } from './travel-style.interface';

export interface BudgetBreakdown {
  // Tourist-selected travel style used for living-cost estimates.
  travelStyle: TravelStyle;

  // Tourist-selected transport style, retained for explanation and later costing rules.
  transportationStyle: TransportationStyle;

  // Number of trip days used for food and accommodation estimates.
  plannedBudgetDays: number;

  // Number of accommodation nights, currently plannedBudgetDays - 1.
  accommodationNights: number;

  // Daily food estimate selected by travelStyle.
  dailyFoodCost: number;

  // Nightly accommodation estimate selected by travelStyle.
  nightlyAccommodationCost: number;

  // Sum of route segment travel costs in LKR.
  totalTravelCost: number;

  // Sum of scheduled attraction activity costs in LKR.
  totalActivityCost: number;

  // Food estimate for all planned budget days in LKR.
  totalFoodCost: number;

  // Accommodation estimate for all required nights in LKR.
  totalAccommodationCost: number;

  // Travel + activity + food + accommodation, excluding emergency reserve.
  totalEstimatedCost: number;

  // Emergency reserve that must remain untouched.
  emergencyReserve: number;

  // Budget available after protecting the emergency reserve.
  spendableBudget: number;

  // Money left after paying estimated trip cost and protecting the reserve.
  remainingBalance: number;

  // Number of planned days fully funded in chronological order.
  affordableDays: number;

  // First day where spendable budget is insufficient, or null when all days fit.
  firstUnaffordableDay: number | null;

  // Per-day cost breakdown for presentation and debugging.
  dailyBreakdown: BudgetDay[];
}
