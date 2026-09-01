import { RouteSegmentDto } from './route-segment.dto';

export class OptimizedRouteDto {
  destinations: string[];
  routeSegments: RouteSegmentDto[];
  totalTravelTime: number;
  totalTravelDistance: number;
  totalTravelCost: number;
}
