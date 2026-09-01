import { Test, TestingModule } from '@nestjs/testing';
import { TripFeasibilityService } from './trip-feasibility.service';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';

describe('TripFeasibilityService', () => {
  let service: TripFeasibilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TripFeasibilityService],
    }).compile();

    service = module.get<TripFeasibilityService>(TripFeasibilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('schedules a normal valid route', () => {
    const result = service.calculateItinerary(buildRequest());

    expect(result.timeFeasible).toBe(true);
    expect(result.requestedDays).toBe(4);
    expect(result.daysRequired).toBe(2);
    expect(result.unusedDays).toBe(2);
    expect(result.totalTravelTime).toBe(7.5);
    expect(result.totalVisitTime).toBe(8);
    expect(result.failureReasons).toEqual([]);
  });

  it('keeps two attractions on the same day when both limits allow it', () => {
    const result = service.calculateItinerary(
      buildRequest({
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

  it('moves the next attraction to the next day when it does not fit today', () => {
    const result = service.calculateItinerary(
      buildRequest({
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

  it('allows travel time exactly equal to the daily travel limit', () => {
    const result = service.calculateItinerary(
      buildRequest({
        selectedAttractions: [attraction('A01', 'Sigiriya', 2)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [5]),
      }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.itinerary[0].dailyTravelTime).toBe(5);
  });

  it('returns a failure when one segment exceeds the travel limit', () => {
    const result = service.calculateItinerary(
      buildRequest({
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

  it('returns a failure when one destination exceeds daily tourism hours', () => {
    const result = service.calculateItinerary(
      buildRequest({
        selectedAttractions: [attraction('A01', 'Sigiriya', 9)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [2]),
      }),
    );

    expect(result.timeFeasible).toBe(false);
    expect(result.failureReasons[0]).toContain(
      'maximum realistic daily tourism limit',
    );
  });

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

  it('reports unused days when the trip uses fewer days than requested', () => {
    const result = service.calculateItinerary(
      buildRequest({ tripDuration: 5 }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.unusedDays).toBe(3);
  });

  it('schedules one attraction correctly', () => {
    const result = service.calculateItinerary(
      buildRequest({
        selectedAttractions: [attraction('A01', 'Sigiriya', 3)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [4]),
      }),
    );

    expect(result.daysRequired).toBe(1);
    expect(result.itinerary[0].destinations[0].attractionName).toBe('Sigiriya');
  });

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

  it('rejects negative visit duration', () => {
    expect(() =>
      service.calculateItinerary({
        ...buildRequest(),
        selectedAttractions: [attraction('A01', 'Sigiriya', -1)],
      }),
    ).toThrow('visitDuration must be a positive number');
  });

  it('allows the starting point to be outside the selected attractions', () => {
    const result = service.calculateItinerary(buildRequest());

    expect(result.itinerary[0].startingLocation).toBe('Colombo');
    expect(result.itinerary[0].destinations[0].attractionName).toBe('Sigiriya');
  });

  it('preserves route continuity across days', () => {
    const result = service.calculateItinerary(buildRequest());

    expect(result.itinerary[0].endingLocation).toBe(
      result.itinerary[1].startingLocation,
    );
  });

  it('preserves the original route order', () => {
    const result = service.calculateItinerary(buildRequest());
    const flattenedRoute = result.itinerary.flatMap((day) =>
      day.destinations.map((destination) => destination.attractionName),
    );

    expect(flattenedRoute).toEqual(['Sigiriya', 'Dambulla', 'Kandy']);
  });

  it('allows zero travel time', () => {
    const result = service.calculateItinerary(
      buildRequest({
        selectedAttractions: [attraction('A01', 'Sigiriya', 3)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [0]),
      }),
    );

    expect(result.timeFeasible).toBe(true);
    expect(result.itinerary[0].dailyTravelTime).toBe(0);
  });

  it('rejects invalid trip duration', () => {
    expect(() =>
      service.calculateItinerary(buildRequest({ tripDuration: 0 })),
    ).toThrow('tripDuration must be a positive integer');
  });

  it('rejects invalid max daily travel time', () => {
    expect(() =>
      service.calculateItinerary(buildRequest({ maxDailyTravelTime: 0 })),
    ).toThrow('maxDailyTravelTime must be a positive number');
  });

  it('does not enter an infinite loop when a destination cannot fit', () => {
    const startedAt = Date.now();
    const result = service.calculateItinerary(
      buildRequest({
        selectedAttractions: [attraction('A01', 'Sigiriya', 11)],
        optimizedRoute: route(['Colombo', 'Sigiriya'], [0]),
      }),
    );

    expect(Date.now() - startedAt).toBeLessThan(100);
    expect(result.timeFeasible).toBe(false);
  });

  it('rejects ambiguous duplicate attraction names when the route uses names', () => {
    expect(() =>
      service.calculateItinerary(
        buildRequest({
          selectedAttractions: [
            attraction('A01', 'Temple', 2),
            attraction('A02', 'Temple', 2),
          ],
          optimizedRoute: route(['Colombo', 'Temple'], [1]),
        }),
      ),
    ).toThrow('Use attraction IDs');
  });

  it('supports duplicate names when the optimized route uses attraction IDs', () => {
    const result = service.calculateItinerary(
      buildRequest({
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
});

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
