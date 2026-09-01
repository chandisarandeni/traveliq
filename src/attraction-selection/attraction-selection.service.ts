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
import { calculateDestinationCount } from './algorithms/destination-count.algorithm';
import { buildInterestWeightMap } from './algorithms/interest-weighting.algorithm';
import { calculateInterestScore } from './algorithms/interest-scoring.algorithm';
import { filterAttractions } from './algorithms/attraction-filter.algorithm';
import { AttractionMaxHeap } from './data-structures/attraction-max-heap';

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
