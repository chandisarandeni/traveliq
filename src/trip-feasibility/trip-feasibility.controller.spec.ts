import { Test, TestingModule } from '@nestjs/testing';
import { TripFeasibilityController } from './trip-feasibility.controller';
import { TripFeasibilityService } from './trip-feasibility.service';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';

describe('TripFeasibilityController', () => {
  let controller: TripFeasibilityController;
  let service: TripFeasibilityService;

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

  it('posts itinerary requests to the service', () => {
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
    const spy = jest.spyOn(service, 'calculateItinerary');

    const result = controller.calculateItinerary(dto);

    expect(spy).toHaveBeenCalledWith(dto);
    expect(result.timeFeasible).toBe(true);
  });
});
