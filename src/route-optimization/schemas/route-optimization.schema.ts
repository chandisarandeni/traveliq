import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RouteOptimizationResultDocument =
  HydratedDocument<RouteOptimizationResult>;

@Schema({ _id: false })
export class RouteSegmentSchema {
  @Prop({ required: true })
  from!: string;

  @Prop({ required: true })
  to!: string;

  @Prop({ required: true })
  travelTime!: number;

  @Prop({ required: true })
  travelDistance!: number;

  @Prop({ required: true })
  travelCost!: number;
}

@Schema({ _id: false })
export class OptimizedPlanResultSchema {
  @Prop({ required: true })
  planId!: string;

  @Prop({ required: true, type: [String] })
  destinations!: string[];

  @Prop({ required: true, type: [RouteSegmentSchema] })
  routeSegments!: RouteSegmentSchema[];

  @Prop({ required: true })
  totalTravelDistance!: number;

  @Prop({ required: true })
  totalTravelTime!: number;

  @Prop({ required: true })
  totalTravelCost!: number;
}

@Schema({ timestamps: true, versionKey: false })
export class RouteOptimizationResult {
  @Prop({ required: true, unique: true, index: true })
  optimizationId!: string;

  @Prop({ required: false })
  networkId?: string;

  @Prop({ required: true, type: [OptimizedPlanResultSchema] })
  plans!: OptimizedPlanResultSchema[];

  @Prop({ required: false, type: OptimizedPlanResultSchema })
  bestPlan?: OptimizedPlanResultSchema;
}

export const RouteOptimizationResultSchema = SchemaFactory.createForClass(
  RouteOptimizationResult,
);
