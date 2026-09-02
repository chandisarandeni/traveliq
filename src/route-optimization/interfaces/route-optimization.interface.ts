export interface RouteWeights {
  costWeight: number;
  timeWeight: number;
  distanceWeight: number;
}

export interface RouteSegment {
  from: string;
  to: string;
  travelTime: number;
  travelDistance: number;
  travelCost: number;
}

export interface MatrixBounds {
  minDistance: number;
  maxDistance: number;
  minTime: number;
  maxTime: number;
  minCost: number;
  maxCost: number;
}

export interface RouteEvaluationResult {
  routeIndices: number[];
  destinations: string[];
  totalTravelDistance: number;
  totalTravelTime: number;
  totalTravelCost: number;
  routeScore: number;
  routeSegments: RouteSegment[];
}

export interface OptimizedPlanResult {
  planId: string;
  destinations: string[];
  routeSegments: RouteSegment[];
  totalTravelDistance: number;
  totalTravelTime: number;
  totalTravelCost: number;
}
