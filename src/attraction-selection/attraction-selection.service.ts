import { Injectable } from '@nestjs/common';
import { TravelStyle } from './enums/travel-style.enum';
import { InterestCategory } from './enums/interest-category.enum';
import {
  SriLankaAttraction,
  InterestWeight,
  AttractionFilterCriteria,
  AttractionSelectionRequest,
  AttractionSelectionResult,
  CandidateAttraction,
  ScoredAttraction,
} from './interfaces/attraction-selection.interface';
import { CandidatePlansResult } from './interfaces/candidate-plans.interface';
import { calculateDestinationCount } from './algorithms/destination-count.algorithm';
import { buildInterestWeightMap } from './algorithms/interest-weighting.algorithm';
import { calculateInterestScore } from './algorithms/interest-scoring.algorithm';
import { filterAttractions } from './algorithms/attraction-filter.algorithm';
import { AttractionMaxHeap } from './data-structures/attraction-max-heap';
import { generateCandidatePlans as runPlanGeneration } from './algorithms/plan-generator.algorithm';
import { rankPlans } from './algorithms/plan-ranking.algorithm';

@Injectable()
export class AttractionSelectionService {
  /**
   * 1. Destination Count Algorithm
   * Determines the recommended number of destinations based on trip duration and travel style.
   */
  calculateDestinationCount(
    tripDuration: number,
    travelStyle: TravelStyle,
  ): number {
    return calculateDestinationCount(tripDuration, travelStyle);
  }

  /**
   * 2. Interest Weighting Algorithm
   * Processes user interest weights into an efficient lookup map.
   */
  normalizeInterestWeights(
    userInterests: InterestWeight[],
  ): Map<InterestCategory, number> {
    return buildInterestWeightMap(userInterests);
  }

  /**
   * 3. Interest Scoring Algorithm
   * Calculates the match score between an attraction's tags and user interest preferences.
   */
  calculateInterestScore(
    attraction: SriLankaAttraction,
    userInterests: InterestWeight[] | Map<InterestCategory, number>,
  ): number {
    const weightMap =
      userInterests instanceof Map
        ? userInterests
        : buildInterestWeightMap(userInterests);
    return calculateInterestScore(attraction, weightMap);
  }

  /**
   * 4. Attraction Filtering Algorithm
   * Removes invalid or non-candidate attractions before priority queue insertion.
   */
  filterAttractions(
    attractions: SriLankaAttraction[],
    criteria?: AttractionFilterCriteria,
    userInterests?: InterestWeight[] | Map<InterestCategory, number>,
  ): SriLankaAttraction[] {
    const weightMap =
      userInterests instanceof Map
        ? userInterests
        : userInterests
          ? buildInterestWeightMap(userInterests)
          : undefined;

    return filterAttractions(attractions, criteria, weightMap);
  }

  /**
   * 5 & 6. Overall Attraction Selection Pipeline
   * Orchestrates complete attraction selection:
   * Trip input -> Calculate Destination Count -> Process Interest Weights -> Filter Attractions
   * -> Calculate Interest Scores -> Insert into Max Heap -> Extract Top Candidates.
   */
  selectAttractions(
    request: AttractionSelectionRequest,
  ): AttractionSelectionResult {
    const {
      tripDuration,
      travelStyle,
      userInterests,
      availableAttractions,
      filterCriteria,
    } = request;

    // Step 1: Determine recommended destination count
    const recommendedDestinationCount = this.calculateDestinationCount(
      tripDuration,
      travelStyle,
    );

    // Step 2: Build interest weight lookup map
    const weightMap = this.normalizeInterestWeights(userInterests);

    // Step 3: Filter attractions according to criteria
    const filteredAttractions = this.filterAttractions(
      availableAttractions,
      filterCriteria,
      weightMap,
    );

    // Step 4 & 5: Calculate interest scores & insert into Max Heap
    const maxHeap = new AttractionMaxHeap();

    for (const attraction of filteredAttractions) {
      const score = this.calculateInterestScore(attraction, weightMap);
      maxHeap.insert({ attraction, score });
    }

    // Step 6: Extract highest-priority candidate attractions up to target destination count
    const candidateAttractions: CandidateAttraction[] = [];
    const countToExtract = Math.min(
      recommendedDestinationCount,
      maxHeap.size(),
    );

    for (let rank = 1; rank <= countToExtract; rank++) {
      const maxScored = maxHeap.extractMax();
      if (!maxScored) {
        break;
      }
      candidateAttractions.push({
        attraction: maxScored.attraction,
        score: maxScored.score,
        rank,
      });
    }

    return {
      recommendedDestinationCount,
      candidateAttractions,
      totalCandidatesEvaluated: availableAttractions.length,
      totalCandidatesFiltered: filteredAttractions.length,
    };
  }

  /**
   * 7. Candidate Plan Generation Pipeline
   *
   * Builds up to 5 ranked, diverse trip plans by:
   *   1. Calling the other developer's algorithms to get destination count,
   *      interest weights, filtered attractions, and interest scores.
   *   2. Passing the full scored pool to the greedy plan-generation algorithm.
   *   3. Ranking the generated plans by composite score.
   *
   * Greedy algorithm complexity: O(P × D × N × K)
   *   P = MAX_CANDIDATE_PLANS (5)
   *   D = destinationCount
   *   N = number of scored candidate attractions
   *   K = average number of interest categories per attraction
   *
   * @param request Same input shape as selectAttractions()
   * @returns CandidatePlansResult with up to 5 ranked trip plans
   */
  generateCandidatePlans(
    request: AttractionSelectionRequest,
  ): CandidatePlansResult {
    const {
      tripDuration,
      travelStyle,
      userInterests,
      availableAttractions,
      filterCriteria,
    } = request;

    // Step 1: Destination count (other developer's algorithm)
    const destinationCount = this.calculateDestinationCount(
      tripDuration,
      travelStyle,
    );

    // Step 2: Build interest weight lookup map (other developer's algorithm)
    const weightMap = this.normalizeInterestWeights(userInterests);

    // Step 3: Filter attractions (other developer's algorithm)
    const filteredAttractions = this.filterAttractions(
      availableAttractions,
      filterCriteria,
      weightMap,
    );

    // Step 4: Score ALL filtered attractions (other developer's algorithm).
    // Unlike selectAttractions(), we do NOT cap at recommendedDestinationCount here —
    // the greedy algorithm needs the full pool to generate meaningfully different plans.
    const rawPool = filteredAttractions.map((attraction) => ({
      attraction,
      interestScore: this.calculateInterestScore(attraction, weightMap),
    }));

    // Step 5: Generate candidate plans (greedy algorithm — my responsibility)
    const unrankedPlans = runPlanGeneration(rawPool, destinationCount);

    // Step 6: Rank plans by composite score (my responsibility)
    const candidatePlans = rankPlans(unrankedPlans);

    return {
      destinationCount,
      candidatePlans,
    };
  }

  // Preserve boilerplate endpoints for controller compatibility if needed
  create(dto: any) {
    return 'This action adds a new attractionSelection';
  }

  findAll() {
    return `This action returns all attractionSelection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} attractionSelection`;
  }

  update(id: number, dto: any) {
    return `This action updates a #${id} attractionSelection`;
  }

  remove(id: number) {
    return `This action removes a #${id} attractionSelection`;
  }
}
