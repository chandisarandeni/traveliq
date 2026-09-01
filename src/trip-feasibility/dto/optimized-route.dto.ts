import { RouteSegmentDto } from './route-segment.dto';

export class OptimizedRouteDto {
  // Ordered list of stops exactly as Route Optimization produced them.
  destinations: string[];

  // Ordered connections between consecutive destinations.
  routeSegments: RouteSegmentDto[];

  // Supplied total travel hours; validated against routeSegments.
  totalTravelTime: number;

  // Supplied total travel kilometres; validated against routeSegments.
  totalTravelDistance: number;

  // Supplied total transport cost in LKR; validated against routeSegments.
  totalTravelCost: number;
}
