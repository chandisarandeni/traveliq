import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AttractionSelectionService } from './attraction-selection.service';
import { TravelStyle } from './enums/travel-style.enum';
import { InterestCategory } from './enums/interest-category.enum';
import {
  SriLankaAttraction,
  InterestWeight,
} from './interfaces/attraction-selection.interface';

describe('AttractionSelectionService', () => {
  let service: AttractionSelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttractionSelectionService],
    }).compile();

    service = module.get<AttractionSelectionService>(
      AttractionSelectionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. Destination Count Calculation', () => {
    it('should calculate destination count for 1-day BALANCED trip', () => {
      // 1 day + 1 = 2
      expect(
        service.calculateDestinationCount(1, TravelStyle.BALANCED),
      ).toBe(2);
    });

    it('should calculate destination count for multi-day trips with different travel styles', () => {
      // 5 day trip:
      // RELAXED: (5 + 1) - 1 = 5
      expect(
        service.calculateDestinationCount(5, TravelStyle.RELAXED),
      ).toBe(5);

      // BALANCED: (5 + 1) = 6
      expect(
        service.calculateDestinationCount(5, TravelStyle.BALANCED),
      ).toBe(6);

      // ADVENTURE: (5 + 1) + 1 = 7
      expect(
        service.calculateDestinationCount(5, TravelStyle.ADVENTURE),
      ).toBe(7);
    });

    it('should enforce a minimum destination count of 2 for 1-day RELAXED trip', () => {
      // (1 + 1) - 1 = 1, but bounded to min 2
      expect(
        service.calculateDestinationCount(1, TravelStyle.RELAXED),
      ).toBe(2);
    });

    it('should throw BadRequestException for invalid trip durations (0, negative, non-integers, NaN)', () => {
      expect(() =>
        service.calculateDestinationCount(0, TravelStyle.BALANCED),
      ).toThrow(BadRequestException);
      expect(() =>
        service.calculateDestinationCount(-3, TravelStyle.BALANCED),
      ).toThrow(BadRequestException);
      expect(() =>
        service.calculateDestinationCount(2.5, TravelStyle.BALANCED),
      ).toThrow(BadRequestException);
      expect(() =>
        service.calculateDestinationCount(NaN, TravelStyle.BALANCED),
      ).toThrow(BadRequestException);
    });
  });

  describe('2. Interest Weighting', () => {
    it('should process and map valid user interest weights', () => {
      const interests: InterestWeight[] = [
        { interest: InterestCategory.BEACH, weight: 5 },
        { interest: InterestCategory.HISTORY, weight: 3 },
        { interest: InterestCategory.NATURE, weight: 2 },
      ];

      const weightMap = service.normalizeInterestWeights(interests);
      expect(weightMap.get(InterestCategory.BEACH)).toBe(5);
      expect(weightMap.get(InterestCategory.HISTORY)).toBe(3);
      expect(weightMap.get(InterestCategory.NATURE)).toBe(2);
      expect(weightMap.get(InterestCategory.ADVENTURE)).toBeUndefined();
    });

    it('should handle empty or invalid interest entries gracefully', () => {
      const weightMap = service.normalizeInterestWeights([
        { interest: InterestCategory.BEACH, weight: -2 },
        null as any,
      ]);
      expect(weightMap.size).toBe(0);
    });
  });

  describe('3. Interest Scoring', () => {
    const userInterests: InterestWeight[] = [
      { interest: InterestCategory.BEACH, weight: 5 },
      { interest: InterestCategory.HISTORY, weight: 3 },
      { interest: InterestCategory.NATURE, weight: 2 },
    ];

    it('should return correct score when all attraction interests match user interests', () => {
      const attraction: SriLankaAttraction = {
        id: 'mirissa',
        name: 'Mirissa Beach',
        categories: [
          InterestCategory.BEACH,
          InterestCategory.HISTORY,
          InterestCategory.NATURE,
        ],
      };

      const score = service.calculateInterestScore(attraction, userInterests);
      expect(score).toBe(5 + 3 + 2); // 10
    });

    it('should calculate correct score when some attraction interests match', () => {
      const attraction: SriLankaAttraction = {
        id: 'sigiriya',
        name: 'Sigiriya Rock Fortress',
        categories: [InterestCategory.BEACH, InterestCategory.HISTORY],
      };

      const score = service.calculateInterestScore(attraction, userInterests);
      expect(score).toBe(5 + 3); // 8
    });

    it('should return zero score when no attraction interests match', () => {
      const attraction: SriLankaAttraction = {
        id: 'casino',
        name: 'Colombo Shopping Mall',
        categories: [InterestCategory.SHOPPING, InterestCategory.FOOD],
      };

      const score = service.calculateInterestScore(attraction, userInterests);
      expect(score).toBe(0);
    });
  });

  describe('4. Attraction Filtering', () => {
    const mockAttractions: SriLankaAttraction[] = [
      {
        id: '1',
        name: 'Unawatuna Beach',
        categories: [InterestCategory.BEACH],
        isAvailable: true,
        region: 'Southern',
        district: 'Galle',
        rating: 4.5,
      },
      {
        id: '2',
        name: 'Temple of the Tooth',
        categories: [InterestCategory.RELIGIOUS, InterestCategory.HISTORY],
        isAvailable: true,
        region: 'Central',
        district: 'Kandy',
        rating: 4.8,
      },
      {
        id: '3',
        name: 'Closed Attraction',
        categories: [InterestCategory.BEACH],
        isAvailable: false,
        region: 'Southern',
        district: 'Galle',
        rating: 4.0,
      },
    ];

    it('should filter out unavailable attractions', () => {
      const result = service.filterAttractions(mockAttractions);
      expect(result.length).toBe(2);
      expect(result.map((a) => a.id)).toEqual(['1', '2']);
    });

    it('should filter by region if provided', () => {
      const result = service.filterAttractions(mockAttractions, {
        region: 'Southern',
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });

    it('should filter out zero interest match attractions when requireInterestMatch is true', () => {
      const interests: InterestWeight[] = [
        { interest: InterestCategory.BEACH, weight: 5 },
      ];
      const result = service.filterAttractions(
        mockAttractions,
        { requireInterestMatch: true },
        interests,
      );

      // Only Unawatuna Beach matches BEACH
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('5 & 6. Selection Pipeline Integration', () => {
    const attractions: SriLankaAttraction[] = [
      {
        id: 'attr-1',
        name: 'Arugam Bay',
        categories: [InterestCategory.BEACH, InterestCategory.ADVENTURE],
        isAvailable: true,
      },
      {
        id: 'attr-2',
        name: 'Galle Fort',
        categories: [InterestCategory.HISTORY, InterestCategory.CULTURE],
        isAvailable: true,
      },
      {
        id: 'attr-3',
        name: 'Yala National Park',
        categories: [InterestCategory.WILDLIFE, InterestCategory.NATURE],
        isAvailable: true,
      },
      {
        id: 'attr-4',
        name: 'Udawalawe National Park',
        categories: [InterestCategory.WILDLIFE],
        isAvailable: true,
      },
      {
        id: 'attr-5',
        name: 'Sinharaja Forest',
        categories: [InterestCategory.NATURE],
        isAvailable: true,
      },
    ];

    it('should execute full selection pipeline and rank candidate attractions by priority heap', () => {
      const userInterests: InterestWeight[] = [
        { interest: InterestCategory.BEACH, weight: 5 },
        { interest: InterestCategory.ADVENTURE, weight: 4 },
        { interest: InterestCategory.WILDLIFE, weight: 3 },
      ];

      // 2 day trip, ADVENTURE style -> (2 + 1) + 1 = 4 recommended destinations
      const result = service.selectAttractions({
        tripDuration: 2,
        travelStyle: TravelStyle.ADVENTURE,
        userInterests,
        availableAttractions: attractions,
      });

      expect(result.recommendedDestinationCount).toBe(4);
      expect(result.candidateAttractions.length).toBe(4);

      // Rank 1: Arugam Bay (BEACH = 5 + ADVENTURE = 4 -> score 9)
      expect(result.candidateAttractions[0].attraction.id).toBe('attr-1');
      expect(result.candidateAttractions[0].score).toBe(9);
      expect(result.candidateAttractions[0].rank).toBe(1);

      // Rank 2 & 3: Yala (3) and Udawalawe (3)
      expect(result.candidateAttractions[1].score).toBe(3);
      expect(result.candidateAttractions[2].score).toBe(3);

      // Ensure returned count does not exceed recommendedDestinationCount
      expect(result.candidateAttractions.length).toBeLessThanOrEqual(
        result.recommendedDestinationCount,
      );
    });
  });
});
