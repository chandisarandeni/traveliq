import { ItineraryDay } from './itinerary-day.interface';

export interface TimeItineraryResult {
  timeFeasible: boolean;
  requestedDays: number;
  daysRequired: number;
  unusedDays: number;
  totalTravelTime: number;
  totalVisitTime: number;
  totalScheduledHours: number;
  totalTravelDistance: number;
  constraintChecks: {
    maxDailyTravelTime: number;
    maxDailyTourismHours: number;
    allDaysWithinTravelLimit: boolean;
    allDaysWithinTourismHourLimit: boolean;
  };
  itinerary: ItineraryDay[];
  failureReasons: string[];
}
