import { RouteSegment } from './route-segment.interface';
import { ScheduledAttraction } from './scheduled-attraction.interface';

export interface ItineraryDay {
  // Human-friendly day number starting from 1.
  dayNumber: number;

  // Location where the day's travel begins.
  startingLocation: string;

  // Location where the day's travel ends.
  endingLocation: string;

  // Attractions visited during this day.
  destinations: ScheduledAttraction[];

  // Travel segments assigned to this day.
  routeSegments: RouteSegment[];

  // Travel-only time for this day, in hours.
  dailyTravelTime: number;

  // Attraction visit time for this day, in hours.
  dailyVisitTime: number;

  // Combined travel and visit time for this day, in hours.
  totalScheduledHours: number;

  // Total kilometres travelled during this day.
  dailyTravelDistance: number;

  // Transport cost for this day in LKR.
  dailyTravelCost: number;

  // Attraction activity cost for this day in LKR.
  dailyActivityCost: number;
}
