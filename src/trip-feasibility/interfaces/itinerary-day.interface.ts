import { RouteSegment } from './route-segment.interface';
import { ScheduledAttraction } from './scheduled-attraction.interface';

export interface ItineraryDay {
  dayNumber: number;
  startingLocation: string;
  endingLocation: string;
  destinations: ScheduledAttraction[];
  routeSegments: RouteSegment[];
  dailyTravelTime: number;
  dailyVisitTime: number;
  totalScheduledHours: number;
  dailyTravelDistance: number;
  dailyTravelCost: number;
  dailyActivityCost: number;
}
