import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TourismNetworkDocument = HydratedDocument<TourismNetwork>;

@Schema({ _id: false })
export class RouteWeightsSchema {
  @Prop({ required: true })
  costWeight!: number;

  @Prop({ required: true })
  timeWeight!: number;

  @Prop({ required: true })
  distanceWeight!: number;
}

@Schema({ _id: false })
export class ShortestPathSchema {
  @Prop({ required: true })
  algorithm!: 'DIJKSTRA';

  @Prop({ required: true })
  metric!: 'distanceKm' | 'travelTimeHours' | 'travelCost';

  @Prop({ required: true, type: [String] })
  path!: string[];

  @Prop({ required: true })
  totalWeight!: number;
}

@Schema({ _id: false })
export class AllPairsShortestPathSchema {
  @Prop({ required: true })
  algorithm!: 'FLOYD_WARSHALL';

  @Prop({ required: true })
  metric!: 'distanceKm' | 'travelTimeHours' | 'travelCost';

  @Prop({ required: true, type: [String] })
  nodeIds!: string[];

  @Prop({ required: true, type: [[Number]] })
  matrix!: number[][];
}

@Schema({ _id: false })
export class RouteOptimizationPlanSchema {
  @Prop({ required: true })
  planId!: string;

  @Prop({ required: true })
  startLocation!: string;

  @Prop({ required: true })
  endLocation!: string;

  @Prop({ required: true, type: [String] })
  locations!: string[];

  @Prop({ required: true, type: [[Number]] })
  distanceMatrix!: number[][];

  @Prop({ required: true, type: [[Number]] })
  timeMatrix!: number[][];

  @Prop({ required: true, type: [[Number]] })
  costMatrix!: number[][];

  @Prop({ required: true, type: RouteWeightsSchema })
  weights!: RouteWeightsSchema;

  @Prop({ required: true, type: ShortestPathSchema })
  shortestPath!: ShortestPathSchema;

  @Prop({ required: true, type: AllPairsShortestPathSchema })
  allPairsShortestPaths!: AllPairsShortestPathSchema;
}

@Schema({ versionKey: false })
export class TourismNetwork {
  @Prop({ required: true, unique: true, index: true })
  networkId!: string;

  @Prop({ required: true, type: [RouteOptimizationPlanSchema] })
  routeOptimizationPlans!: RouteOptimizationPlanSchema[];
}

export const TourismNetworkSchema = SchemaFactory.createForClass(TourismNetwork);
