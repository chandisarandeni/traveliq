export class RouteSegmentDto {
  // Location or attraction where this route segment starts.
  from: string;

  // Location or attraction where this route segment ends.
  to: string;

  // Travel duration for this segment, measured in hours.
  travelTime: number;

  // Travel distance for this segment, measured in kilometres.
  travelDistance: number;

  // Transport cost for this segment in LKR.
  travelCost: number;
}
