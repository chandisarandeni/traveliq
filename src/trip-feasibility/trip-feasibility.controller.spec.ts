import { Test, TestingModule } from '@nestjs/testing';
import { TripFeasibilityController } from './trip-feasibility.controller';
import { TripFeasibilityService } from './trip-feasibility.service';
import { CalculateTripFeasibilityDto } from './dto/calculate-trip-feasibility.dto';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';

describe('TripFeasibilityController', () => {
  let controller: TripFeasibilityController;
  let service: TripFeasibilityService;

  // Build a small Nest testing module so controller wiring is tested realistically.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripFeasibilityController],
      providers: [TripFeasibilityService],
    }).compile();

    controller = module.get<TripFeasibilityController>(
      TripFeasibilityController,
    );
    service = module.get<TripFeasibilityService>(TripFeasibilityService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Confirms the endpoint delegates request handling to the service.
  it('posts itinerary requests to the service', async () => {
    const dto = {
      tripDuration: 1,
      maxDailyTravelTime: 5,
      startingLocation: { name: 'Colombo' },
      endingLocation: { name: 'Sigiriya' },
      selectedAttractions: [
        {
          attractionId: 'A01',
          attractionName: 'Sigiriya',
          activityCost: 1000,
          visitDuration: 2,
          interestScore: 5,
        },
      ],
      optimizedRoute: {
        destinations: ['Colombo', 'Sigiriya'],
        routeSegments: [
          {
            from: 'Colombo',
            to: 'Sigiriya',
            travelTime: 2,
            travelDistance: 20,
            travelCost: 200,
          },
        ],
        totalTravelTime: 2,
        totalTravelDistance: 20,
        totalTravelCost: 200,
      },
    } satisfies CalculateTripItineraryDto;
    const spy = jest.spyOn(service, 'calculateAndSaveItinerary');

    const result = await controller.calculateItinerary(dto);

    expect(spy).toHaveBeenCalledWith(dto);
    expect(result.timeFeasible).toBe(true);
  });

  // Confirms the full feasibility endpoint also delegates to the service.
  it('posts full feasibility requests to the service', async () => {
    const dto = {
      ...buildControllerItineraryDto(),
      totalBudget: 200000,
      minEmergencyReserve: 20000,
      travelStyle: 'balanced',
      transportationStyle: 'private transport',
    } satisfies CalculateTripFeasibilityDto;
    const spy = jest.spyOn(service, 'calculateAndSaveFeasibility');

    const result = await controller.calculateFeasibility(dto);

    expect(spy).toHaveBeenCalledWith(dto);
    expect(result.overallFeasible).toBe(true);
  });
});

function buildControllerItineraryDto(): CalculateTripItineraryDto {
  return {
    tripDuration: 1,
    maxDailyTravelTime: 5,
    startingLocation: { name: 'Colombo' },
    endingLocation: { name: 'Sigiriya' },
    selectedAttractions: [
      {
        attractionId: 'A01',
        attractionName: 'Sigiriya',
        activityCost: 1000,
        visitDuration: 2,
        interestScore: 5,
      },
    ],
    optimizedRoute: {
      destinations: ['Colombo', 'Sigiriya'],
      routeSegments: [
        {
          from: 'Colombo',
          to: 'Sigiriya',
          travelTime: 2,
          travelDistance: 20,
          travelCost: 200,
        },
      ],
      totalTravelTime: 2,
      totalTravelDistance: 20,
      totalTravelCost: 200,
    },
  };
}
