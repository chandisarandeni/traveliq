export interface RouteSegment {
  // Segment start point.
  from: string;

  // Segment end point.
  to: string;

  // Segment travel time in hours.
  travelTime: number;

  // Segment travel distance in kilometres.
  travelDistance: number;

  // Segment transport cost in LKR.
  travelCost: number;
}
