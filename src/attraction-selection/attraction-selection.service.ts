import { Injectable, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
import {
  CandidatePlansResult,
  TripLocation,
} from './interfaces/candidate-plans.interface';
import { calculateDestinationCount } from './algorithms/destination-count.algorithm';
import { buildInterestWeightMap } from './algorithms/interest-weighting.algorithm';
import { calculateInterestScore } from './algorithms/interest-scoring.algorithm';
import { filterAttractions } from './algorithms/attraction-filter.algorithm';
import { AttractionMaxHeap } from './data-structures/attraction-max-heap';
import { generateCandidatePlans as runPlanGeneration } from './algorithms/plan-generator.algorithm';
import { rankPlans } from './algorithms/plan-ranking.algorithm';
import {
  AttractionSelection,
  AttractionSelectionDocument,
} from './schemas/attraction-selection.schema';

@Injectable()
export class AttractionSelectionService {
  constructor(
    @Optional()
    @InjectModel(AttractionSelection.name)
    private readonly attractionSelectionModel?: Model<AttractionSelectionDocument>,
  ) {}

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
   *   4. Echoing preferredTransportation, startingLocation, endingLocation
   *      from the request into the response for use by the route-optimisation module.
   *
   * Greedy algorithm complexity: O(P × D × N × K)
   *   P = MAX_CANDIDATE_PLANS (5)
   *   D = destinationCount
   *   N = number of scored candidate attractions
   *   K = average number of interest categories per attraction
   *
   * @param request Same input shape as selectAttractions() plus optional trip-context fields
   * @returns CandidatePlansResult with up to 5 ranked trip plans and echoed trip context
   */
  generateCandidatePlans(
    request: AttractionSelectionRequest & {
      preferredTransportation?: string;
      startingLocation?: TripLocation;
      endingLocation?: TripLocation;
    },
  ): CandidatePlansResult {
    const {
      tripDuration,
      travelStyle,
      userInterests,
      availableAttractions,
      filterCriteria,
      preferredTransportation,
      startingLocation,
      endingLocation,
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

    // Step 7: Build response — echo trip-context fields for route-optimisation module
    const result: CandidatePlansResult = {
      destinationCount,
      candidatePlans,
    };

    if (preferredTransportation !== undefined) {
      result.preferredTransportation = preferredTransportation;
    }
    if (startingLocation !== undefined) {
      result.startingLocation = startingLocation;
    }
    if (endingLocation !== undefined) {
      result.endingLocation = endingLocation;
    }

    // Step 8: Persist to database if Mongoose model is available
    if (this.attractionSelectionModel) {
      const selectionId = `SEL${Date.now()}`;
      this.attractionSelectionModel
        .create({
          selectionId,
          tripDuration,
          travelStyle,
          destinationCount,
          userInterests: userInterests?.map((i) => ({
            interest: i.interest,
            weight: i.weight,
          })),
          candidatePlans,
          preferredTransportation,
          startingLocation,
          endingLocation,
        })
        .catch(() => {
          // Non-blocking: background persistence errors do not affect API response
        });
    }

    return result;
  }

  // Database CRUD methods for AttractionSelection
  async create(dto: any) {
    if (this.attractionSelectionModel) {
      const selectionId = dto.selectionId || `SEL${Date.now()}`;
      return this.attractionSelectionModel.create({
        selectionId,
        ...dto,
      });
    }
    return 'This action adds a new attractionSelection';
  }

  async findAll() {
    if (this.attractionSelectionModel) {
      return this.attractionSelectionModel.find().sort({ createdAt: -1 }).exec();
    }
    return `This action returns all attractionSelection`;
  }

  async findOne(id: string | number) {
    if (this.attractionSelectionModel) {
      const idStr = String(id);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
      const query = isObjectId
        ? { $or: [{ selectionId: idStr }, { _id: idStr }] }
        : { selectionId: idStr };
      return this.attractionSelectionModel.findOne(query).exec();
    }
    return `This action returns a #${id} attractionSelection`;
  }

  async update(id: string | number, dto: any) {
    if (this.attractionSelectionModel) {
      const idStr = String(id);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
      const query = isObjectId
        ? { $or: [{ selectionId: idStr }, { _id: idStr }] }
        : { selectionId: idStr };
      return this.attractionSelectionModel
        .findOneAndUpdate(query, dto, { new: true })
        .exec();
    }
    return `This action updates a #${id} attractionSelection`;
  }

  async remove(id: string | number) {
    if (this.attractionSelectionModel) {
      const idStr = String(id);
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
      const query = isObjectId
        ? { $or: [{ selectionId: idStr }, { _id: idStr }] }
        : { selectionId: idStr };
      return this.attractionSelectionModel.findOneAndDelete(query).exec();
    }
    return `This action removes a #${id} attractionSelection`;
  }
}

