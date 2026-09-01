import { RouteSegment } from './route-segment.interface';

export interface OptimizedRouteInput {
  destinations: string[];
  routeSegments: RouteSegment[];
  totalTravelTime: number;
  totalTravelDistance: number;
  totalTravelCost: number;
}
