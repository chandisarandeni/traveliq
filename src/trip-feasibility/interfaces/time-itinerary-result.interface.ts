import { ItineraryDay } from './itinerary-day.interface';

export interface TimeItineraryResult {
  // True only when all time constraints and requested trip duration are satisfied.
  timeFeasible: boolean;

  // Tourist-requested number of travel days.
  requestedDays: number;

  // Number of days the greedy scheduler actually needed.
  daysRequired: number;

  // Same value as daysRequired, named to make the greedy meaning clearer.
  minimumDaysRequired: number;

  // Extra unused days when the requested duration is longer than required.
  unusedDays: number;

  // Sum of all scheduled travel hours.
  totalTravelTime: number;

  // Sum of all scheduled attraction visit hours.
  totalVisitTime: number;

  // Sum of travel and visit hours.
  totalScheduledHours: number;

  // Sum of all scheduled travel kilometres.
  totalTravelDistance: number;

  // Boolean details for each time-related rule.
  constraintChecks: {
    // Tourist's configured daily travel limit.
    maxDailyTravelTime: number;

    // System-wide daily limit for total tourism activity.
    maxDailyTourismHours: number;

    // Whether every generated day respects maxDailyTravelTime.
    allDaysWithinTravelLimit: boolean;

    // Whether every generated day respects maxDailyTourismHours.
    allDaysWithinTourismHourLimit: boolean;
  };

  // Generated day-by-day itinerary; kept even when requestedDays is too short.
  itinerary: ItineraryDay[];

  // Human-readable reasons when the schedule is not feasible.
  failureReasons: string[];
}
