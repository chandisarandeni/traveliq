import { Test, TestingModule } from '@nestjs/testing';
import { TripFeasibilityService } from './trip-feasibility.service';
import { CalculateTripFeasibilityDto } from './dto/calculate-trip-feasibility.dto';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';

describe('TripFeasibilityService', () => {
  let service: TripFeasibilityService;

  // Create a fresh service for each test so no itinerary state leaks between cases.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripFeasibilityService],
    }).compile();

    service = module.get<TripFeasibilityService>(TripFeasibilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Covers the main happy path using the sample route from the implementation prompt.
  it('schedules a normal valid route', () => {
    const result = service.calculateItinerary(buildRequest());

    expect(result.timeFeasible).toBe(true);
    expect(result.requestedDays).toBe(4);
    expect(result.daysRequired).toBe(2);
    expect(result.minimumDaysRequired).toBe(2);
    expect(result.unusedDays).toBe(2);
    expect(result.totalTravelTime).toBe(7.5);
    expect(result.totalVisitTime).toBe(8);
    expect(result.failureReasons).toEqual([]);
  });

  // Proves greedy scheduling keeps adding destinations while both daily limits still fit.
  it('keeps two attractions on the same day when both limits allow it', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Dambulla' },
        selectedAttractions: [
          attraction('A01', 'Sigiriya', 2),
          attraction('A02', 'Dambulla', 2),
        ],
        optimizedRoute: route(['Colombo', 'Sigiriya', 'Dambulla'], [2, 1]),
      }),
    );

    expect(result.daysRequired).toBe(1);
    expect(
      result.itinerary[0].destinations.map((item) => item.attractionName),
    ).toEqual(['Sigiriya', 'Dambulla']);
  });

  // Proves the next destination is retried on a new day instead of being dropped.
  it('moves the next attraction to the next day when it does not fit today', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Dambulla' },
        selectedAttractions: [
          attraction('A01', 'Sigiriya', 5),
          attraction('A02', 'Dambulla', 4),
        ],
        optimizedRoute: route(['Colombo', 'Sigiriya', 'Dambulla'], [2, 1]),
      }),
    );

    expect(result.daysRequired).toBe(2);
    expect(result.itinerary[0].endingLocation).toBe('Sigiriya');
    expect(result.itinerary[1].startingLocation).toBe('Sigiriya');
  });

  // Boundary test: equal to the max travel time is valid.
  it('allows travel time exactly equal to the daily travel limit', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Sigiriya' },
        selectedAttractions: [attraction('A01', 'Sigiriya', 2)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [5]),
      }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.itinerary[0].dailyTravelTime).toBe(5);
  });

  // Impossible travel segments fail without attempting to split them across days.
  it('returns a failure when one segment exceeds the travel limit', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Jaffna' },
        selectedAttractions: [attraction('A01', 'Jaffna', 2)],
        optimizedRoute: route(['Colombo', 'Jaffna'], [7]),
      }),
    );

    expect(result.timeFeasible).toBe(false);
    expect(result.daysRequired).toBe(0);
    expect(result.itinerary).toEqual([]);
    expect(result.failureReasons[0]).toContain(
      'exceeds the maximum daily travel limit',
    );
  });

  // A route step also fails when travel plus visit time exceeds realistic tourism hours.
  it('returns a failure when one destination exceeds daily tourism hours', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Sigiriya' },
        selectedAttractions: [attraction('A01', 'Sigiriya', 9)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [2]),
      }),
    );

    expect(result.timeFeasible).toBe(false);
    expect(result.failureReasons[0]).toContain(
      'maximum realistic daily tourism limit',
    );
  });

  // The generated itinerary is still returned even when the tourist requested too few days.
  it('keeps the generated itinerary when required days exceed requested days', () => {
    const result = service.calculateItinerary(
      buildRequest({ tripDuration: 1 }),
    );

    expect(result.timeFeasible).toBe(false);
    expect(result.daysRequired).toBe(2);
    expect(result.itinerary).toHaveLength(2);
    expect(result.failureReasons[0]).toContain(
      'requires 2 days, but the tourist selected only 1 day',
    );
  });

  // Extra days are reported so the caller knows the plan fits with spare time.
  it('reports unused days when the trip uses fewer days than requested', () => {
    const result = service.calculateItinerary(
      buildRequest({ tripDuration: 5 }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.unusedDays).toBe(3);
  });

  // Smallest non-empty itinerary case.
  it('schedules one attraction correctly', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Sigiriya' },
        selectedAttractions: [attraction('A01', 'Sigiriya', 3)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [4]),
      }),
    );

    expect(result.daysRequired).toBe(1);
    expect(result.itinerary[0].destinations[0].attractionName).toBe('Sigiriya');
  });

  // Final route legs are kept even when the ending location is not an attraction.
  it('schedules travel to a separate ending location', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Colombo' },
        selectedAttractions: [attraction('A01', 'Sigiriya', 2)],
        optimizedRoute: route(['Colombo', 'Sigiriya', 'Colombo'], [2, 2]),
      }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.itinerary[0].startingLocation).toBe('Colombo');
    expect(result.itinerary[0].endingLocation).toBe('Colombo');
    expect(result.itinerary[0].destinations).toHaveLength(1);
    expect(result.itinerary[0].routeSegments).toHaveLength(2);
  });

  // Empty attraction lists should produce a valid empty schedule, not a crash.
  it('handles no attractions without crashing', () => {
    const result = service.calculateItinerary(
      buildRequest({
        selectedAttractions: [],
        optimizedRoute: route([], []),
      }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.daysRequired).toBe(0);
    expect(result.itinerary).toEqual([]);
  });

  // Route destinations and routeSegments must match one-to-one.
  it('rejects a missing route segment', () => {
    expect(() =>
      service.calculateItinerary(
        buildRequest({
          optimizedRoute: {
            destinations: ['Colombo', 'Sigiriya', 'Dambulla'],
            routeSegments: [
              {
                from: 'Colombo',
                to: 'Sigiriya',
                travelTime: 4,
                travelDistance: 40,
                travelCost: 400,
              },
            ],
            totalTravelTime: 4,
            totalTravelDistance: 40,
            totalTravelCost: 400,
          },
        }),
      ),
    ).toThrow('optimizedRoute.destinations must include one more entry');
  });

  // Travel time cannot be negative.
  it('rejects negative travel time', () => {
    expect(() =>
      service.calculateItinerary(
        buildRequest({
          optimizedRoute: route(['Colombo', 'Sigiriya'], [-1]),
          selectedAttractions: [attraction('A01', 'Sigiriya', 2)],
        }),
      ),
    ).toThrow('travelTime must be zero or greater');
  });

  // Visit duration must be positive because a zero-hour attraction is not schedulable work.
  it('rejects negative visit duration', () => {
    expect(() =>
      service.calculateItinerary({
        ...buildRequest(),
        selectedAttractions: [attraction('A01', 'Sigiriya', -1)],
      }),
    ).toThrow('visitDuration must be a positive number');
  });

  // Starting location can be a city/hotel/airport outside selected attractions.
  it('allows the starting point to be outside the selected attractions', () => {
    const result = service.calculateItinerary(buildRequest());

    expect(result.itinerary[0].startingLocation).toBe('Colombo');
    expect(result.itinerary[0].destinations[0].attractionName).toBe('Sigiriya');
  });

  // The supplied route must start from the tourist's requested starting location.
  it('rejects a route that starts somewhere else', () => {
    expect(() =>
      service.calculateItinerary(
        buildRequest({
          optimizedRoute: route(['Galle', 'Sigiriya', 'Kandy'], [2, 2]),
        }),
      ),
    ).toThrow('optimizedRoute must start at startingLocation Colombo');
  });

  // The supplied route must reach the tourist's requested ending location.
  it('rejects a route that ends somewhere else', () => {
    expect(() =>
      service.calculateItinerary(
        buildRequest({
          optimizedRoute: route(['Colombo', 'Sigiriya', 'Dambulla'], [2, 2]),
        }),
      ),
    ).toThrow('optimizedRoute must end at endingLocation Kandy');
  });

  // When a new day starts, it starts where the previous day ended.
  it('preserves route continuity across days', () => {
    const result = service.calculateItinerary(buildRequest());

    expect(result.itinerary[0].endingLocation).toBe(
      result.itinerary[1].startingLocation,
    );
  });

  // The scheduler may split the route into days, but it must never reorder attractions.
  it('preserves the original route order', () => {
    const result = service.calculateItinerary(buildRequest());
    const flattenedRoute = result.itinerary.flatMap((day) =>
      day.destinations.map((destination) => destination.attractionName),
    );

    expect(flattenedRoute).toEqual(['Sigiriya', 'Dambulla', 'Kandy']);
  });

  // Zero travel time is allowed, for example nearby attractions or same-location visits.
  it('allows zero travel time', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Sigiriya' },
        selectedAttractions: [attraction('A01', 'Sigiriya', 3)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [0]),
      }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.itinerary[0].dailyTravelTime).toBe(0);
  });

  // Trip duration must be at least one day.
  it('rejects invalid trip duration', () => {
    expect(() =>
      service.calculateItinerary(buildRequest({ tripDuration: 0 })),
    ).toThrow('tripDuration must be a positive integer');
  });

  // Daily travel limit must be positive.
  it('rejects invalid max daily travel time', () => {
    expect(() =>
      service.calculateItinerary(buildRequest({ maxDailyTravelTime: 0 })),
    ).toThrow('maxDailyTravelTime must be a positive number');
  });

  // Safety check for the peek/retry loop: impossible steps must exit quickly.
  it('does not enter an infinite loop when a destination cannot fit', () => {
    const startedAt = Date.now();
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Sigiriya' },
        selectedAttractions: [attraction('A01', 'Sigiriya', 11)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [0]),
      }),
    );

    expect(Date.now() - startedAt).toBeLessThan(100);
    expect(result.timeFeasible).toBe(false);
  });

  // Name-based routes cannot safely identify which attraction to schedule when names repeat.
  it('rejects ambiguous duplicate attraction names when the route uses names', () => {
    expect(() =>
      service.calculateItinerary(
        buildRequest({
          endingLocation: { name: 'Temple' },
          selectedAttractions: [
            attraction('A01', 'Temple', 2),
            attraction('A02', 'Temple', 2),
          ],
          optimizedRoute: route(['Colombo', 'Temple'], [1]),
        }),
      ),
    ).toThrow('Use attraction IDs');
  });

  // ID-based routes can safely schedule duplicate attraction names.
  it('supports duplicate names when the optimized route uses attraction IDs', () => {
    const result = service.calculateItinerary(
      buildRequest({
        endingLocation: { name: 'Temple' },
        selectedAttractions: [
          attraction('A01', 'Temple', 2),
          attraction('A02', 'Temple', 2),
        ],
        optimizedRoute: {
          destinations: ['Colombo', 'A01', 'A02'],
          routeSegments: [
            {
              from: 'Colombo',
              to: 'A01',
              travelTime: 1,
              travelDistance: 10,
              travelCost: 100,
            },
            {
              from: 'A01',
              to: 'A02',
              travelTime: 1,
              travelDistance: 10,
              travelCost: 100,
            },
          ],
          totalTravelTime: 2,
          totalTravelDistance: 20,
          totalTravelCost: 200,
        },
      }),
    );

    expect(result.itinerary[0].destinations).toHaveLength(2);
  });

  // Budget happy path: total budget covers trip cost while keeping the emergency reserve.
  it('calculates full time and budget feasibility for an affordable trip', () => {
    const result = service.calculateFeasibility(buildFeasibilityRequest());

    expect(result.overallFeasible).toBe(true);
    expect(result.time.timeFeasible).toBe(true);
    expect(result.budget.budgetFeasible).toBe(true);
    expect(result.budget.budgetBreakdown.totalTravelCost).toBe(10500);
    expect(result.budget.budgetBreakdown.totalActivityCost).toBe(11500);
    expect(result.budget.budgetBreakdown.totalFoodCost).toBe(14000);
    expect(result.budget.budgetBreakdown.totalAccommodationCost).toBe(27000);
    expect(result.budget.budgetBreakdown.totalEstimatedCost).toBe(63000);
    expect(result.budget.budgetBreakdown.remainingBalance).toBe(117000);
    expect(result.budget.budgetBreakdown.affordableDays).toBe(4);
    expect(result.budget.budgetBreakdown.firstUnaffordableDay).toBeNull();
    expect(
      result.budget.budgetBreakdown.dailyBreakdown.map((day) => ({
        dayNumber: day.dayNumber,
        cumulativeCost: day.cumulativeCost,
        affordable: day.affordable,
      })),
    ).toEqual([
      { dayNumber: 1, cumulativeCost: 28500, affordable: true },
      { dayNumber: 2, cumulativeCost: 47000, affordable: true },
      { dayNumber: 3, cumulativeCost: 59500, affordable: true },
      { dayNumber: 4, cumulativeCost: 63000, affordable: true },
    ]);
  });

  // Budget uses requested trip duration when the itinerary needs fewer days.
  it('budgets food and accommodation for the requested trip duration', () => {
    const result = service.calculateFeasibility(
      buildFeasibilityRequest({
        tripDuration: 5,
      }),
    );

    expect(result.time.minimumDaysRequired).toBe(2);
    expect(result.budget.budgetBreakdown.plannedBudgetDays).toBe(5);
    expect(result.budget.budgetBreakdown.accommodationNights).toBe(4);
    expect(result.budget.budgetBreakdown.totalFoodCost).toBe(17500);
    expect(result.budget.budgetBreakdown.totalAccommodationCost).toBe(36000);
  });

  // Budget uses minimum required days when the route cannot fit inside requested duration.
  it('budgets for the minimum required days when time is infeasible', () => {
    const result = service.calculateFeasibility(
      buildFeasibilityRequest({
        tripDuration: 1,
      }),
    );

    expect(result.overallFeasible).toBe(false);
    expect(result.time.timeFeasible).toBe(false);
    expect(result.budget.budgetBreakdown.plannedBudgetDays).toBe(2);
  });

  // A low budget fails with a readable reason.
  it('returns budget infeasible when estimated cost exceeds spendable budget', () => {
    const result = service.calculateFeasibility(
      buildFeasibilityRequest({
        totalBudget: 50000,
        minEmergencyReserve: 10000,
      }),
    );

    expect(result.overallFeasible).toBe(false);
    expect(result.budget.budgetFeasible).toBe(false);
    expect(result.budget.budgetBreakdown.affordableDays).toBe(1);
    expect(result.budget.budgetBreakdown.firstUnaffordableDay).toBe(2);
    expect(
      result.budget.budgetBreakdown.dailyBreakdown.map((day) => ({
        dayNumber: day.dayNumber,
        remainingBudgetAfterDay: day.remainingBudgetAfterDay,
        affordable: day.affordable,
      })),
    ).toEqual([
      { dayNumber: 1, remainingBudgetAfterDay: 11500, affordable: true },
      { dayNumber: 2, remainingBudgetAfterDay: -7000, affordable: false },
      { dayNumber: 3, remainingBudgetAfterDay: -19500, affordable: false },
      { dayNumber: 4, remainingBudgetAfterDay: -23000, affordable: false },
    ]);
    expect(result.budget.failureReasons[0]).toContain(
      'estimated trip cost is 63000 LKR',
    );
    expect(result.budget.failureReasons[0]).toContain(
      'first shortfall occurs on day 2',
    );
  });

  // The emergency reserve cannot be larger than the total available budget.
  it('returns budget infeasible when emergency reserve exceeds total budget', () => {
    const result = service.calculateFeasibility(
      buildFeasibilityRequest({
        totalBudget: 10000,
        minEmergencyReserve: 20000,
      }),
    );

    expect(result.budget.budgetFeasible).toBe(false);
    expect(result.budget.failureReasons[0]).toContain(
      'emergency reserve of 20000 LKR',
    );
  });

  // Different travel styles use different food/accommodation rates.
  it('uses comfort cost estimates for comfort travelers', () => {
    const result = service.calculateFeasibility(
      buildFeasibilityRequest({
        travelStyle: 'comfort',
      }),
    );

    expect(result.budget.budgetBreakdown.dailyFoodCost).toBe(6000);
    expect(result.budget.budgetBreakdown.nightlyAccommodationCost).toBe(18000);
  });

  // Travel style must match the configured cost profiles.
  it('rejects invalid travel style', () => {
    expect(() =>
      service.calculateFeasibility(
        buildFeasibilityRequest({
          travelStyle: 'luxury',
        }),
      ),
    ).toThrow('travelStyle must be one of');
  });

  // Transportation style is validated for consistency with user preferences.
  it('rejects invalid transportation style', () => {
    expect(() =>
      service.calculateFeasibility(
        buildFeasibilityRequest({
          transportationStyle: 'spaceship',
        }),
      ),
    ).toThrow('transportationStyle must be one of');
  });
});

// Builds the default request used by most tests; individual cases override only what matters.
function buildRequest(
  overrides: Partial<CalculateTripItineraryDto> = {},
): CalculateTripItineraryDto {
  return {
    tripDuration: 4,
    maxDailyTravelTime: 5,
    startingLocation: {
      name: 'Colombo',
    },
    endingLocation: {
      name: 'Kandy',
    },
    selectedAttractions: [
      attraction('A01', 'Sigiriya', 3, 6000, 5),
      attraction('A02', 'Dambulla', 2, 2500, 5),
      attraction('A03', 'Kandy', 3, 3000, 4),
    ],
    optimizedRoute: {
      destinations: ['Colombo', 'Sigiriya', 'Dambulla', 'Kandy'],
      routeSegments: [
        {
          from: 'Colombo',
          to: 'Sigiriya',
          travelTime: 4,
          travelDistance: 170,
          travelCost: 6000,
        },
        {
          from: 'Sigiriya',
          to: 'Dambulla',
          travelTime: 1,
          travelDistance: 20,
          travelCost: 1500,
        },
        {
          from: 'Dambulla',
          to: 'Kandy',
          travelTime: 2.5,
          travelDistance: 75,
          travelCost: 3000,
        },
      ],
      totalTravelTime: 7.5,
      totalTravelDistance: 265,
      totalTravelCost: 10500,
    },
    ...overrides,
  };
}

// Builds full feasibility requests with budget fields.
function buildFeasibilityRequest(
  overrides: Partial<CalculateTripFeasibilityDto> = {},
): CalculateTripFeasibilityDto {
  return {
    ...buildRequest(),
    totalBudget: 200000,
    minEmergencyReserve: 20000,
    travelStyle: 'balanced',
    transportationStyle: 'private transport',
    ...overrides,
  };
}

// Test helper for selected attraction objects.
function attraction(
  attractionId: string,
  attractionName: string,
  visitDuration: number,
  activityCost = 1000,
  interestScore = 5,
) {
  return {
    attractionId,
    attractionName,
    activityCost,
    visitDuration,
    interestScore,
  };
}

// Test helper that creates continuous route segments and matching route totals.
function route(destinations: string[], travelTimes: number[]) {
  const routeSegments = travelTimes.map((travelTime, index) => ({
    from: destinations[index],
    to: destinations[index + 1],
    travelTime,
    travelDistance: Math.max(travelTime * 10, 0),
    travelCost: Math.max(travelTime * 100, 0),
  }));

  return {
    destinations,
    routeSegments,
    totalTravelTime: Number(
      routeSegments
        .reduce((total, segment) => total + segment.travelTime, 0)
        .toFixed(3),
    ),
    totalTravelDistance: Number(
      routeSegments
        .reduce((total, segment) => total + segment.travelDistance, 0)
        .toFixed(3),
    ),
    totalTravelCost: Number(
      routeSegments
        .reduce((total, segment) => total + segment.travelCost, 0)
        .toFixed(3),
    ),
  };
}
