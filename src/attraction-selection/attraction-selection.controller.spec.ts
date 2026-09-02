// Workaround for @nestjs/mapped-types ESM incompatibility with Jest's CommonJS transform.
// UpdateAttractionSelectionDto uses PartialType() from @nestjs/mapped-types which is ESM-only.
// The UpdateAttractionSelectionDto is not used by any of our test cases; this mock prevents
// the import chain from failing without affecting any test logic.
jest.mock('./dto/update-attraction-selection.dto', () => ({
  UpdateAttractionSelectionDto: class UpdateAttractionSelectionDto {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AttractionSelectionController } from './attraction-selection.controller';
import { AttractionSelectionService } from './attraction-selection.service';
import { TravelStyle } from './enums/travel-style.enum';
import { InterestCategory } from './enums/interest-category.enum';

describe('AttractionSelectionController', () => {
  let controller: AttractionSelectionController;
  let service: AttractionSelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttractionSelectionController],
      providers: [AttractionSelectionService],
    }).compile();

    controller = module.get<AttractionSelectionController>(
      AttractionSelectionController,
    );
    service = module.get<AttractionSelectionService>(
      AttractionSelectionService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should process attraction selection request via controller', () => {
    const result = controller.selectAttractions({
      tripDuration: 3,
      travelStyle: TravelStyle.BALANCED,
      userInterests: [{ interest: InterestCategory.BEACH, weight: 5 }],
      availableAttractions: [
        {
          id: '1',
          name: 'Bentota Beach',
          categories: [InterestCategory.BEACH],
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.recommendedDestinationCount).toBe(4);
    expect(result.candidateAttractions.length).toBe(1);
    expect(result.candidateAttractions[0].attraction.name).toBe('Bentota Beach');
  });

  describe('POST /attraction-selection/plans', () => {
    /**
     * Ten diverse attractions — large enough pool to generate 5 plans
     * for a 3-day BALANCED trip (destinationCount = 4).
     */
    const planAttractions = [
      { id: 'P01', name: 'Sigiriya', categories: [InterestCategory.HISTORY, InterestCategory.CULTURE, InterestCategory.NATURE], isAvailable: true },
      { id: 'P02', name: 'Yala', categories: [InterestCategory.WILDLIFE, InterestCategory.NATURE], isAvailable: true },
      { id: 'P03', name: 'Mirissa', categories: [InterestCategory.BEACH, InterestCategory.SCENIC], isAvailable: true },
      { id: 'P04', name: 'Ella', categories: [InterestCategory.NATURE, InterestCategory.ADVENTURE], isAvailable: true },
      { id: 'P05', name: 'Galle Fort', categories: [InterestCategory.HISTORY, InterestCategory.CULTURE], isAvailable: true },
      { id: 'P06', name: 'Udawalawe', categories: [InterestCategory.WILDLIFE], isAvailable: true },
      { id: 'P07', name: 'Temple of Tooth', categories: [InterestCategory.RELIGIOUS, InterestCategory.CULTURE], isAvailable: true },
      { id: 'P08', name: 'Arugam Bay', categories: [InterestCategory.BEACH, InterestCategory.ADVENTURE], isAvailable: true },
      { id: 'P09', name: 'Pettah Market', categories: [InterestCategory.SHOPPING, InterestCategory.FOOD], isAvailable: true },
      { id: 'P10', name: 'Nuwara Eliya', categories: [InterestCategory.NATURE, InterestCategory.SCENIC], isAvailable: true },
    ];

    const planInterests = [
      { interest: InterestCategory.NATURE, weight: 5 },
      { interest: InterestCategory.WILDLIFE, weight: 4 },
      { interest: InterestCategory.HISTORY, weight: 3 },
      { interest: InterestCategory.BEACH, weight: 3 },
      { interest: InterestCategory.CULTURE, weight: 2 },
      { interest: InterestCategory.ADVENTURE, weight: 2 },
      { interest: InterestCategory.RELIGIOUS, weight: 1 },
      { interest: InterestCategory.SCENIC, weight: 1 },
      { interest: InterestCategory.SHOPPING, weight: 1 },
      { interest: InterestCategory.FOOD, weight: 1 },
    ];

    it('should delegate to service and return a CandidatePlansResult', () => {
      const result = controller.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: planInterests,
        availableAttractions: planAttractions,
      });

      expect(result).toBeDefined();
      expect(result.destinationCount).toBe(4); // (3+1) BALANCED
      expect(Array.isArray(result.candidatePlans)).toBe(true);
    });

    it('should return up to 5 ranked plans with correct structure', () => {
      const result = controller.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: planInterests,
        availableAttractions: planAttractions,
      });

      expect(result.candidatePlans.length).toBe(5);

      for (const plan of result.candidatePlans) {
        expect(plan.planId).toMatch(/^PLAN-\d{3}$/);
        expect(plan.rank).toBeGreaterThanOrEqual(1);
        expect(plan.selectedAttractions.length).toBe(result.destinationCount);
        expect(typeof plan.planScore).toBe('number');
        expect(typeof plan.diversityScore).toBe('number');
        expect(typeof plan.planInterestScore).toBe('number');
      }
    });

    it('should return empty candidatePlans when no attractions are provided', () => {
      const result = controller.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: planInterests,
        availableAttractions: [],
      });

      expect(result.candidatePlans).toEqual([]);
    });

    it('should call the service generateCandidatePlans method (thin controller check)', () => {
      const spy = jest.spyOn(service, 'generateCandidatePlans');

      controller.generateCandidatePlans({
        tripDuration: 2,
        travelStyle: TravelStyle.RELAXED,
        userInterests: planInterests,
        availableAttractions: planAttractions,
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});

