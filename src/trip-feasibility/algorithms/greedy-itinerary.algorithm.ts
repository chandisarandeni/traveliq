import {
  FLOAT_COMPARISON_EPSILON,
  MAX_DAILY_TOURISM_HOURS,
} from '../constants/trip-feasibility.constants';
import { Queue } from '../data-structures/queue';
import { CalculateTripItineraryInput } from '../interfaces/calculate-trip-itinerary.interface';
import { ItineraryDay } from '../interfaces/itinerary-day.interface';
import { RouteSegment } from '../interfaces/route-segment.interface';
import { ScheduledAttraction } from '../interfaces/scheduled-attraction.interface';
import { SelectedAttractionInput } from '../interfaces/selected-attraction.interface';
import { TimeItineraryResult } from '../interfaces/time-itinerary-result.interface';

interface RouteStep {
  destinationName: string;
  routeSegment: RouteSegment;
  attraction?: SelectedAttractionInput;
}

interface AttractionLookup {
  byId: Map<string, SelectedAttractionInput>;
  byUniqueName: Map<string, SelectedAttractionInput>;
  duplicateNames: Set<string>;
}

/**
 * Greedy itinerary scheduling for an already optimized route.
 *
 * DSA summary:
 * - Queue: keeps route steps in FIFO order, preserving Route Optimization output.
 * - Map: gives O(1) average attraction lookup while building route steps.
 * - Arrays: store days, day destinations, day route segments, and failure reasons.
 *
 * Complexity: O(n) time and O(n) space, where n is the number of route segments.
 */
export function scheduleItinerary(
  input: CalculateTripItineraryInput,
): TimeItineraryResult {
  if (input.selectedAttractions.length === 0) {
    return buildResult(input, [], []);
  }

  const attractionLookup = buildAttractionLookup(input.selectedAttractions);
  const routeQueue = buildRouteQueue(input, attractionLookup);
  const itinerary: ItineraryDay[] = [];
  const failureReasons: string[] = [];
  let currentDay = createItineraryDay(
    1,
    input.startingLocation.name,
    input.startingLocation.name,
  );

  while (!routeQueue.isEmpty()) {
    const step = routeQueue.peek();

    if (!step) {
      break;
    }

    const visitDuration = step.attraction?.visitDuration ?? 0;
    const projectedTravelTime =
      currentDay.dailyTravelTime + step.routeSegment.travelTime;
    const projectedVisitTime = currentDay.dailyVisitTime + visitDuration;
    const projectedScheduledHours = projectedTravelTime + projectedVisitTime;

    if (
      exceedsLimit(step.routeSegment.travelTime, input.maxDailyTravelTime) ||
      exceedsLimit(
        step.routeSegment.travelTime + visitDuration,
        MAX_DAILY_TOURISM_HOURS,
      )
    ) {
      return buildImpossibleStepResult(
        input,
        step,
        step.routeSegment.travelTime > input.maxDailyTravelTime,
      );
    }

    const fitsCurrentDay =
      !exceedsLimit(projectedTravelTime, input.maxDailyTravelTime) &&
      !exceedsLimit(projectedScheduledHours, MAX_DAILY_TOURISM_HOURS);

    if (fitsCurrentDay) {
      addStepToDay(currentDay, step);
      routeQueue.dequeue();
      continue;
    }

    if (currentDay.routeSegments.length === 0) {
      failureReasons.push(
        `Travel from ${step.routeSegment.from} to ${step.routeSegment.to} cannot fit into a single realistic tourism day.`,
      );
      return buildResult(input, [], failureReasons);
    }

    itinerary.push(currentDay);
    currentDay = createItineraryDay(
      itinerary.length + 1,
      currentDay.endingLocation,
      currentDay.endingLocation,
    );
  }

  if (currentDay.routeSegments.length > 0) {
    itinerary.push(currentDay);
  }

  return buildResult(input, itinerary, failureReasons);
}

function buildAttractionLookup(
  selectedAttractions: SelectedAttractionInput[],
): AttractionLookup {
  const byId = new Map<string, SelectedAttractionInput>();
  const byUniqueName = new Map<string, SelectedAttractionInput>();
  const duplicateNames = new Set<string>();

  for (const attraction of selectedAttractions) {
    byId.set(attraction.attractionId, attraction);

    if (byUniqueName.has(attraction.attractionName)) {
      duplicateNames.add(attraction.attractionName);
      byUniqueName.delete(attraction.attractionName);
    } else if (!duplicateNames.has(attraction.attractionName)) {
      byUniqueName.set(attraction.attractionName, attraction);
    }
  }

  return { byId, byUniqueName, duplicateNames };
}

function buildRouteQueue(
  input: CalculateTripItineraryInput,
  attractionLookup: AttractionLookup,
): Queue<RouteStep> {
  const queue = new Queue<RouteStep>();

  for (const routeSegment of input.optimizedRoute.routeSegments) {
    const attraction = getAttractionForRouteDestination(
      routeSegment.to,
      attractionLookup,
    );

    queue.enqueue({
      destinationName: routeSegment.to,
      routeSegment,
      attraction,
    });
  }

  return queue;
}

function getAttractionForRouteDestination(
  destination: string,
  attractionLookup: AttractionLookup,
): SelectedAttractionInput | undefined {
  return (
    attractionLookup.byId.get(destination) ??
    attractionLookup.byUniqueName.get(destination)
  );
}

function createItineraryDay(
  dayNumber: number,
  startingLocation: string,
  endingLocation: string,
): ItineraryDay {
  return {
    dayNumber,
    startingLocation,
    endingLocation,
    destinations: [],
    routeSegments: [],
    dailyTravelTime: 0,
    dailyVisitTime: 0,
    totalScheduledHours: 0,
    dailyTravelDistance: 0,
    dailyTravelCost: 0,
    dailyActivityCost: 0,
  };
}

function addStepToDay(day: ItineraryDay, step: RouteStep): void {
  day.routeSegments.push(step.routeSegment);
  day.endingLocation = step.destinationName;
  day.dailyTravelTime = roundHours(
    day.dailyTravelTime + step.routeSegment.travelTime,
  );
  day.dailyTravelDistance = roundHours(
    day.dailyTravelDistance + step.routeSegment.travelDistance,
  );
  day.dailyTravelCost = roundHours(
    day.dailyTravelCost + step.routeSegment.travelCost,
  );

  if (step.attraction) {
    day.destinations.push(toScheduledAttraction(step.attraction));
    day.dailyVisitTime = roundHours(
      day.dailyVisitTime + step.attraction.visitDuration,
    );
    day.dailyActivityCost = roundHours(
      day.dailyActivityCost + step.attraction.activityCost,
    );
  }

  day.totalScheduledHours = roundHours(
    day.dailyTravelTime + day.dailyVisitTime,
  );
}

function toScheduledAttraction(
  attraction: SelectedAttractionInput,
): ScheduledAttraction {
  return {
    attractionId: attraction.attractionId,
    attractionName: attraction.attractionName,
    visitDuration: attraction.visitDuration,
    activityCost: attraction.activityCost,
    interestScore: attraction.interestScore,
  };
}

function buildImpossibleStepResult(
  input: CalculateTripItineraryInput,
  step: RouteStep,
  exceededTravelLimit: boolean,
): TimeItineraryResult {
  const failureReasons = [
    exceededTravelLimit
      ? `Travel from ${step.routeSegment.from} to ${step.routeSegment.to} requires ${step.routeSegment.travelTime} hours, which exceeds the maximum daily travel limit of ${input.maxDailyTravelTime} hours.`
      : `Visiting ${step.destinationName} requires ${roundHours(step.routeSegment.travelTime + (step.attraction?.visitDuration ?? 0))} scheduled hours, which exceeds the maximum realistic daily tourism limit of ${MAX_DAILY_TOURISM_HOURS} hours.`,
  ];

  return buildResult(input, [], failureReasons);
}

function buildResult(
  input: CalculateTripItineraryInput,
  itinerary: ItineraryDay[],
  failureReasons: string[],
): TimeItineraryResult {
  const daysRequired = itinerary.length;
  const durationFailure =
    daysRequired > input.tripDuration
      ? [
          `The itinerary requires ${formatDays(daysRequired)}, but the tourist selected only ${formatDays(input.tripDuration)}.`,
        ]
      : [];
  const allFailureReasons = [...failureReasons, ...durationFailure];
  const allDaysWithinTravelLimit = itinerary.every(
    (day) => !exceedsLimit(day.dailyTravelTime, input.maxDailyTravelTime),
  );
  const allDaysWithinTourismHourLimit = itinerary.every(
    (day) => !exceedsLimit(day.totalScheduledHours, MAX_DAILY_TOURISM_HOURS),
  );

  return {
    timeFeasible:
      allFailureReasons.length === 0 &&
      allDaysWithinTravelLimit &&
      allDaysWithinTourismHourLimit,
    requestedDays: input.tripDuration,
    daysRequired,
    unusedDays:
      daysRequired > 0 && input.tripDuration > daysRequired
        ? input.tripDuration - daysRequired
        : 0,
    totalTravelTime: roundHours(
      itinerary.reduce((total, day) => total + day.dailyTravelTime, 0),
    ),
    totalVisitTime: roundHours(
      itinerary.reduce((total, day) => total + day.dailyVisitTime, 0),
    ),
    totalScheduledHours: roundHours(
      itinerary.reduce((total, day) => total + day.totalScheduledHours, 0),
    ),
    totalTravelDistance: roundHours(
      itinerary.reduce((total, day) => total + day.dailyTravelDistance, 0),
    ),
    constraintChecks: {
      maxDailyTravelTime: input.maxDailyTravelTime,
      maxDailyTourismHours: MAX_DAILY_TOURISM_HOURS,
      allDaysWithinTravelLimit,
      allDaysWithinTourismHourLimit,
    },
    itinerary,
    failureReasons: allFailureReasons,
  };
}

function exceedsLimit(value: number, limit: number): boolean {
  return value - limit > FLOAT_COMPARISON_EPSILON;
}

function roundHours(value: number): number {
  return Number(value.toFixed(3));
}

function formatDays(days: number): string {
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
