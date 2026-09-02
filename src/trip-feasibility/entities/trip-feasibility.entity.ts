import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type TripFeasibilityDocument = HydratedDocument<TripFeasibility>;

export type TripFeasibilityCalculationType = 'itinerary' | 'feasibility';

@Schema({ timestamps: true })
export class TripFeasibility {
  @Prop({ required: true, enum: ['itinerary', 'feasibility'] })
  calculationType: TripFeasibilityCalculationType;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  requestSnapshot: Record<string, unknown>;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  resultSnapshot: Record<string, unknown>;

  @Prop({ type: Boolean })
  overallFeasible?: boolean;

  @Prop({ type: Boolean })
  timeFeasible?: boolean;

  @Prop({ type: Boolean })
  budgetFeasible?: boolean;
}

export const TripFeasibilitySchema =
  SchemaFactory.createForClass(TripFeasibility);
