import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { NodeType } from '../enums/node-type.enum';
import { TransportationMode } from '../enums/transportation-mode.enum';

export type TourismNetworkDocument = HydratedDocument<TourismNetwork>;

@Schema({ _id: false })
export class NetworkNodeSchema {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: NodeType, type: String })
  type: NodeType;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;
}

@Schema({ _id: false })
export class TourismEdgeSchema {
  @Prop({ required: true })
  fromNodeId: string;

  @Prop({ required: true })
  toNodeId: string;

  @Prop({ required: true })
  distanceKm: number;

  @Prop({ required: true })
  travelTimeMinutes: number;

  @Prop({ required: true })
  travelTimeHours: number;

  @Prop({ required: true })
  travelCost: number;
}

@Schema({ _id: false })
export class RouteWeightsSchema {
  @Prop({ required: true })
  costWeight: number;

  @Prop({ required: true })
  timeWeight: number;

  @Prop({ required: true })
  distanceWeight: number;
}

@Schema({ _id: false })
export class RouteOptimizationPlanSchema {
  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  startLocation: string;

  @Prop({ required: true })
  endLocation: string;

  @Prop({ required: true, type: [String] })
  locations: string[];

  @Prop({ required: true, type: [[Number]] })
  distanceMatrix: number[][];

  @Prop({ required: true, type: [[Number]] })
  timeMatrix: number[][];

  @Prop({ required: true, type: [[Number]] })
  costMatrix: number[][];

  @Prop({ required: true, type: RouteWeightsSchema })
  weights: RouteWeightsSchema;
}

@Schema({ timestamps: true })
export class TourismNetwork {
  @Prop({ required: true, unique: true, index: true })
  networkId: string;

  @Prop({ required: true, index: true })
  candidatePlanId: string;

  @Prop({ required: true, enum: TransportationMode, type: String })
  preferredTransportation: TransportationMode;

  @Prop({ required: true, type: [NetworkNodeSchema] })
  nodes: NetworkNodeSchema[];

  @Prop({ required: true, type: [TourismEdgeSchema] })
  connections: TourismEdgeSchema[];

  @Prop({ required: true })
  connected: boolean;

  @Prop({ required: true })
  totalNodes: number;

  @Prop({ required: true })
  reachableNodes: number;

  @Prop({ required: true, type: [String] })
  unreachableNodes: string[];

  @Prop({ type: [RouteOptimizationPlanSchema], default: undefined })
  routeOptimizationPlans?: RouteOptimizationPlanSchema[];
}

export const TourismNetworkSchema = SchemaFactory.createForClass(TourismNetwork);
