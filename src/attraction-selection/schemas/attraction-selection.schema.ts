import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TravelStyle } from '../enums/travel-style.enum';

export type AttractionSelectionDocument = HydratedDocument<AttractionSelection>;

@Schema({ _id: false })
export class AttractionLocationSchema {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;
}

@Schema({ _id: false })
export class AttractionDetailSchema {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ default: true })
  isAvailable?: boolean;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop()
  region?: string;

  @Prop()
  district?: string;

  @Prop()
  rating?: number;
}

@Schema({ _id: false })
export class ScoredAttractionSchema {
  @Prop({ required: true, type: AttractionDetailSchema })
  attraction: AttractionDetailSchema;

  @Prop({ default: 0 })
  interestScore: number;

  @Prop({ default: 0 })
  normalizedScore: number;
}

@Schema({ _id: false })
export class CandidatePlanSchema {
  @Prop({ required: true })
  planId: string;

  @Prop({ required: true })
  rank: number;

  @Prop({ required: true })
  planInterestScore: number;

  @Prop({ required: true })
  diversityScore: number;

  @Prop({ required: true })
  planScore: number;

  @Prop({ required: true, type: [ScoredAttractionSchema] })
  selectedAttractions: ScoredAttractionSchema[];
}

@Schema({ _id: false })
export class UserInterestSchema {
  @Prop({ required: true })
  interest: string;

  @Prop({ required: true })
  weight: number;
}

@Schema({ timestamps: true })
export class AttractionSelection {
  @Prop({ required: true, unique: true, index: true })
  selectionId: string;

  @Prop()
  tripDuration?: number;

  @Prop({ enum: TravelStyle, type: String })
  travelStyle?: TravelStyle;

  @Prop({ default: 0 })
  destinationCount: number;

  @Prop({ type: [UserInterestSchema], default: [] })
  userInterests?: UserInterestSchema[];

  @Prop({ type: [CandidatePlanSchema], default: [] })
  candidatePlans: CandidatePlanSchema[];

  @Prop()
  preferredTransportation?: string;

  @Prop({ type: AttractionLocationSchema })
  startingLocation?: AttractionLocationSchema;

  @Prop({ type: AttractionLocationSchema })
  endingLocation?: AttractionLocationSchema;
}

export const AttractionSelectionSchema = SchemaFactory.createForClass(AttractionSelection);
