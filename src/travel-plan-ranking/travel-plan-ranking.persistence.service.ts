import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  TravelPlanRanking,
  TravelPlanRankingDocument,
} from './schemas/travel-plan-ranking.schema';

@Injectable()
export class TravelPlanRankingPersistenceService {
  constructor(
    @InjectModel(TravelPlanRanking.name)
    private readonly rankingModel:
      Model<TravelPlanRankingDocument>,
  ) {}

  async saveResult(data: {
    algorithmUsed: string;
    candidateCount: number;

    weights: {
      interest: number;
      budget: number;
      travel: number;
      time: number;
    };

    bestPlan: Record<string, unknown>;

    rankedPlans:
      Record<string, unknown>[];

    executionTimeMs: number;
  }) {
    const result =
      new this.rankingModel(data);

    return result.save();
  }

  async getResults() {
    return this.rankingModel
      .find()
      .sort({
        createdAt: -1,
      })
      .exec();
  }
}