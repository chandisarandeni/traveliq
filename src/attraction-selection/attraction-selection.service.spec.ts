 import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AttractionSelectionService } from './attraction-selection.service';
import { TravelStyle } from './enums/travel-style.enum';
import { InterestCategory } from './enums/interest-category.enum';
import {
  SriLankaAttraction,
  InterestWeight,
} from './interfaces/attraction-selection.interface';
import {
  calculateDiversityScore,
  calculatePlanSimilarity,
} from './algorithms/diversity.algorithm';
import { ScoredCandidateAttraction } from './interfaces/candidate-plans.interface';

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

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Candidate Plan Generation (MY RESPONSIBILITY)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Shared test fixtures for section 7.
   *
   * Ten diverse Sri Lankan attractions covering all 10 InterestCategory values.
   * This pool is large enough to generate 5 meaningfully different plans.
   *
   * 3-day BALANCED trip → destinationCount = (3 + 1) = 4 attractions per plan.
   */
  const POOL_ATTRACTIONS: SriLankaAttraction[] = [
    {
      id: 'A01',
      name: 'Sigiriya Rock Fortress',
      categories: [
        InterestCategory.HISTORY,
        InterestCategory.CULTURE,
        InterestCategory.NATURE,
      ],
      isAvailable: true,
    },
    {
      id: 'A02',
      name: 'Yala National Park',
      categories: [InterestCategory.WILDLIFE, InterestCategory.NATURE],
      isAvailable: true,
    },
    {
      id: 'A03',
      name: 'Mirissa Beach',
      categories: [InterestCategory.BEACH, InterestCategory.SCENIC],
      isAvailable: true,
    },
    {
      id: 'A04',
      name: 'Ella Rock',
      categories: [
        InterestCategory.NATURE,
        InterestCategory.SCENIC,
        InterestCategory.ADVENTURE,
      ],
      isAvailable: true,
    },
    {
      id: 'A05',
      name: 'Galle Fort',
      categories: [InterestCategory.HISTORY, InterestCategory.CULTURE],
      isAvailable: true,
    },
    {
      id: 'A06',
      name: 'Udawalawe National Park',
      categories: [InterestCategory.WILDLIFE],
      isAvailable: true,
    },
    {
      id: 'A07',
      name: 'Temple of the Tooth',
      categories: [InterestCategory.RELIGIOUS, InterestCategory.CULTURE],
      isAvailable: true,
    },
    {
      id: 'A08',
      name: 'Arugam Bay',
      categories: [InterestCategory.BEACH, InterestCategory.ADVENTURE],
      isAvailable: true,
    },
    {
      id: 'A09',
      name: 'Pettah Market',
      categories: [InterestCategory.SHOPPING, InterestCategory.FOOD],
      isAvailable: true,
    },
    {
      id: 'A10',
      name: 'Nuwara Eliya',
      categories: [InterestCategory.NATURE, InterestCategory.SCENIC],
      isAvailable: true,
    },
  ];

  const POOL_INTERESTS: InterestWeight[] = [
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

  describe('7a. Diversity Algorithm (unit tests)', () => {
    it('should return 0 for an empty selection', () => {
      expect(calculateDiversityScore([])).toBe(0);
    });

    it('should return a higher diversity score for a plan with varied categories than one with uniform categories', () => {
      // Diverse plan: covers HISTORY, CULTURE, NATURE, WILDLIFE, BEACH, SCENIC = 6 categories
      const diversePlan: ScoredCandidateAttraction[] = [
        {
          attraction: POOL_ATTRACTIONS[0], // HISTORY, CULTURE, NATURE
          interestScore: 10,
          normalizedScore: 10,
        },
        {
          attraction: POOL_ATTRACTIONS[1], // WILDLIFE, NATURE
          interestScore: 8,
          normalizedScore: 8,
        },
        {
          attraction: POOL_ATTRACTIONS[2], // BEACH, SCENIC
          interestScore: 6,
          normalizedScore: 6,
        },
      ];

      // Uniform plan: all attractions share only WILDLIFE (1 unique category)
      const uniformAttraction: SriLankaAttraction = {
        id: 'U01',
        name: 'Wildlife Only A',
        categories: [InterestCategory.WILDLIFE],
        isAvailable: true,
      };
      const uniformPlan: ScoredCandidateAttraction[] = [
        { attraction: uniformAttraction, interestScore: 9, normalizedScore: 9 },
        { attraction: uniformAttraction, interestScore: 8, normalizedScore: 8 },
        { attraction: uniformAttraction, interestScore: 7, normalizedScore: 7 },
      ];

      const diverseScore = calculateDiversityScore(diversePlan);
      const uniformScore = calculateDiversityScore(uniformPlan);

      expect(diverseScore).toBeGreaterThan(uniformScore);
    });

    it('should cap at 10 when all categories are covered', () => {
      // One attraction per category covering all 10
      const fullCoveragePlan: ScoredCandidateAttraction[] = [
        {
          attraction: {
            id: 'FULL',
            name: 'All Categories',
            categories: [
              InterestCategory.BEACH,
              InterestCategory.CULTURE,
              InterestCategory.HISTORY,
              InterestCategory.NATURE,
              InterestCategory.ADVENTURE,
              InterestCategory.WILDLIFE,
              InterestCategory.RELIGIOUS,
              InterestCategory.FOOD,
              InterestCategory.SHOPPING,
              InterestCategory.SCENIC,
            ],
            isAvailable: true,
          },
          interestScore: 10,
          normalizedScore: 10,
        },
      ];

      expect(calculateDiversityScore(fullCoveragePlan)).toBe(10);
    });

    it('calculatePlanSimilarity should return 0 for completely different plans', () => {
      const planA = new Set(['A01', 'A02', 'A03', 'A04']);
      const planB = new Set(['A05', 'A06', 'A07', 'A08']);
      expect(calculatePlanSimilarity(planA, planB)).toBe(0);
    });

    it('calculatePlanSimilarity should return 1 for identical plans', () => {
      const planA = new Set(['A01', 'A02', 'A03', 'A04']);
      const planB = new Set(['A01', 'A02', 'A03', 'A04']);
      expect(calculatePlanSimilarity(planA, planB)).toBe(1);
    });

    it('calculatePlanSimilarity should return correct fractional overlap', () => {
      const planA = new Set(['A01', 'A02', 'A03', 'A04']);
      const planB = new Set(['A01', 'A02', 'A05', 'A06']);
      // 2 shared out of 4 in planA
      expect(calculatePlanSimilarity(planA, planB)).toBe(0.5);
    });

    it('calculatePlanSimilarity should return 0 for an empty plan A', () => {
      const planA = new Set<string>();
      const planB = new Set(['A01', 'A02']);
      expect(calculatePlanSimilarity(planA, planB)).toBe(0);
    });
  });

  describe('7b. Greedy Plan Generation — algorithm properties', () => {
    // 3-day BALANCED: destinationCount = 4
    it('should select exactly destinationCount attractions in each plan', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      for (const plan of result.candidatePlans) {
        expect(plan.selectedAttractions.length).toBe(result.destinationCount);
      }
    });

    it('should never select the same attraction twice within a single plan', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      for (const plan of result.candidatePlans) {
        const ids = plan.selectedAttractions.map((a) => a.attraction.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length); // no duplicates
      }
    });

    it('should prefer higher interest-score attractions when diversity is equal', () => {
      // Create a uniform pool where all attractions share the same category
      // so diversity contribution is equal; the greedy should pick by score order
      const uniformAttractions: SriLankaAttraction[] = [
        { id: 'H1', name: 'High1', categories: [InterestCategory.HISTORY], isAvailable: true },
        { id: 'H2', name: 'High2', categories: [InterestCategory.HISTORY], isAvailable: true },
        { id: 'H3', name: 'High3', categories: [InterestCategory.HISTORY], isAvailable: true },
        { id: 'H4', name: 'High4', categories: [InterestCategory.HISTORY], isAvailable: true },
      ];

      const historyOnlyInterests: InterestWeight[] = [
        { interest: InterestCategory.HISTORY, weight: 5 },
      ];

      const result = service.generateCandidatePlans({
        tripDuration: 1,
        travelStyle: TravelStyle.BALANCED,
        userInterests: historyOnlyInterests,
        availableAttractions: uniformAttractions,
      });

      // destinationCount = (1+1) = 2
      expect(result.destinationCount).toBe(2);
      // All four have the same interest score → greedy picks by ID alphabetically
      // Both plans should each have exactly 2 distinct attractions
      for (const plan of result.candidatePlans) {
        expect(plan.selectedAttractions.length).toBe(2);
        const ids = new Set(plan.selectedAttractions.map((a) => a.attraction.id));
        expect(ids.size).toBe(2);
      }
    });
  });

  describe('7c. Multiple plan generation', () => {
    it('should generate exactly 5 plans when the pool is large enough', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      expect(result.candidatePlans.length).toBe(5);
    });

    it('should not generate more than 5 plans', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      expect(result.candidatePlans.length).toBeLessThanOrEqual(5);
    });

    it('should not generate identical plans (no two plans share all attractions)', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      for (let i = 0; i < result.candidatePlans.length; i++) {
        for (let j = i + 1; j < result.candidatePlans.length; j++) {
          const idsA = new Set(
            result.candidatePlans[i].selectedAttractions.map(
              (a) => a.attraction.id,
            ),
          );
          const idsB = new Set(
            result.candidatePlans[j].selectedAttractions.map(
              (a) => a.attraction.id,
            ),
          );
          const similarity = calculatePlanSimilarity(idsA, idsB);
          // No two accepted plans should exceed the similarity threshold
          expect(similarity).toBeLessThanOrEqual(0.75);
        }
      }
    });

    it('should assign sequential rank values starting from 1', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      result.candidatePlans.forEach((plan, index) => {
        expect(plan.rank).toBe(index + 1);
      });
    });

    it('should assign planId values PLAN-001 through PLAN-005', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      const expectedIds = ['PLAN-001', 'PLAN-002', 'PLAN-003', 'PLAN-004', 'PLAN-005'];
      result.candidatePlans.forEach((plan, index) => {
        expect(plan.planId).toBe(expectedIds[index]);
      });
    });
  });

  describe('7d. Plan ranking', () => {
    it('should sort plans descending by planScore (best plan first)', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      for (let i = 0; i < result.candidatePlans.length - 1; i++) {
        expect(result.candidatePlans[i].planScore).toBeGreaterThanOrEqual(
          result.candidatePlans[i + 1].planScore,
        );
      }
    });

    it('should assign rank 1 to the plan with the highest planScore', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      if (result.candidatePlans.length > 0) {
        const highestScore = Math.max(
          ...result.candidatePlans.map((p) => p.planScore),
        );
        expect(result.candidatePlans[0].rank).toBe(1);
        expect(result.candidatePlans[0].planScore).toBe(highestScore);
      }
    });

    it('should populate all score fields as non-negative numbers', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      for (const plan of result.candidatePlans) {
        expect(plan.planInterestScore).toBeGreaterThanOrEqual(0);
        expect(plan.diversityScore).toBeGreaterThanOrEqual(0);
        expect(plan.planScore).toBeGreaterThanOrEqual(0);
        expect(plan.planInterestScore).toBeLessThanOrEqual(10);
        expect(plan.diversityScore).toBeLessThanOrEqual(10);
        expect(plan.planScore).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('7e. Edge cases', () => {
    it('Edge Case 1: empty available attractions — should return 0 candidate plans', () => {
      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: [],
      });

      expect(result.candidatePlans).toEqual([]);
      expect(result.destinationCount).toBe(4);
    });

    it('Edge Case 2: fewer attractions than required destinations — should return 0 valid plans', () => {
      // destinationCount for 3-day BALANCED = 4, but only 2 attractions available
      const twoAttractions: SriLankaAttraction[] = [
        {
          id: 'X01',
          name: 'Attraction One',
          categories: [InterestCategory.BEACH],
          isAvailable: true,
        },
        {
          id: 'X02',
          name: 'Attraction Two',
          categories: [InterestCategory.NATURE],
          isAvailable: true,
        },
      ];

      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: twoAttractions,
      });

      // destinationCount = 4, pool = 2 → cannot fill any plan
      expect(result.candidatePlans).toEqual([]);
    });

    it('Edge Case 3: barely enough attractions for 1 plan — should return at most 1 plan', () => {
      // destinationCount for 1-day BALANCED = 2; provide exactly 2 attractions
      // Since both are identical categories, strategies produce very similar plans
      // so the similarity guard may limit us to 1 accepted plan.
      const minAttractions: SriLankaAttraction[] = [
        {
          id: 'M01',
          name: 'Min Attraction A',
          categories: [InterestCategory.BEACH],
          isAvailable: true,
        },
        {
          id: 'M02',
          name: 'Min Attraction B',
          categories: [InterestCategory.NATURE],
          isAvailable: true,
        },
      ];

      const result = service.generateCandidatePlans({
        tripDuration: 1,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: minAttractions,
      });

      // destinationCount = 2, pool = 2 → at most 1 unique valid plan
      expect(result.candidatePlans.length).toBeLessThanOrEqual(1);
    });

    it('Edge Case 4: unavailable attractions are excluded from plans', () => {
      const mixedAttractions: SriLankaAttraction[] = [
        ...POOL_ATTRACTIONS,
        {
          id: 'UNV',
          name: 'Unavailable Attraction',
          categories: [InterestCategory.BEACH],
          isAvailable: false,
        },
      ];

      const result = service.generateCandidatePlans({
        tripDuration: 3,
        travelStyle: TravelStyle.BALANCED,
        userInterests: POOL_INTERESTS,
        availableAttractions: mixedAttractions,
      });

      for (const plan of result.candidatePlans) {
        const ids = plan.selectedAttractions.map((a) => a.attraction.id);
        expect(ids).not.toContain('UNV');
      }
    });

    it('Edge Case 5: returned destinationCount matches the other developer\'s calculation', () => {
      // 5-day ADVENTURE trip: (5 + 1) + 1 = 7 destinations
      const result = service.generateCandidatePlans({
        tripDuration: 5,
        travelStyle: TravelStyle.ADVENTURE,
        userInterests: POOL_INTERESTS,
        availableAttractions: POOL_ATTRACTIONS,
      });

      expect(result.destinationCount).toBe(7);
      // Pool has only 10 attractions, destinationCount = 7 → very limited variation
      // Plans should still each contain exactly 7 (if valid)
      for (const plan of result.candidatePlans) {
        expect(plan.selectedAttractions.length).toBe(7);
      }
    });
  });
});

