import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Schema as MongooseSchema,
} from 'mongoose';

export type TravelPlanRankingDocument =
  HydratedDocument<TravelPlanRanking>;

@Schema({
  timestamps: true,
})
export class TravelPlanRanking {
  @Prop({
    required: true,
  })
  algorithmUsed!: string;

  @Prop({
    required: true,
  })
  candidateCount!: number;

  @Prop({
    type: Object,
    required: true,
  })
  weights!: {
    interest: number;
    budget: number;
    travel: number;
    time: number;
  };

  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: true,
  })
  bestPlan!: Record<string, unknown>;

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  rankedPlans!: Record<string, unknown>[];

  @Prop({
    required: true,
    default: 0,
  })
  executionTimeMs!: number;
}

export const TravelPlanRankingSchema =
  SchemaFactory.createForClass(
    TravelPlanRanking,
  );