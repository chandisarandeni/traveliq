import { RouteSegment } from './route-segment.interface';

export interface OptimizedRouteInput {
  // Fixed destination order from Route Optimization.
  destinations: string[];

  // Ordered travel segments between each pair of destinations.
  routeSegments: RouteSegment[];

  // Declared total hours; checked against the segments for consistency.
  totalTravelTime: number;

  // Declared total kilometres; checked against the segments for consistency.
  totalTravelDistance: number;

  // Declared total transport cost in LKR; checked against the segments for consistency.
  totalTravelCost: number;
}
