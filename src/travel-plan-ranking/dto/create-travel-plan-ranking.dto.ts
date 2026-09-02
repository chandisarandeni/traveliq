import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CandidatePlanDto {
  @IsString()
  planId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  interestScore!: number;

  @IsNumber()
  @Min(0)
  totalTravelTime!: number;

  @IsNumber()
  @Min(1)
  daysRequired!: number;

  @IsNumber()
  @Min(0)
  totalCost!: number;

  @IsBoolean()
  feasible!: boolean;
}

export class WeightsDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  interest!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  budget!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  travel!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  time!: number;
}

export class OptimizationPreferencesDto {
  @IsNumber()
  @Min(1)
  budget!: number;

  @IsNumber()
  @Min(1)
  tripDuration!: number;

  @IsNumber()
  @Min(1)
  maximumTravelTime!: number;

  @ValidateNested()
  @Type(() => WeightsDto)
  weights!: WeightsDto;
}

export class CreateTravelPlanRankingDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CandidatePlanDto)
  candidatePlans!: CandidatePlanDto[];

  @ValidateNested()
  @Type(() => OptimizationPreferencesDto)
  preferences!: OptimizationPreferencesDto;
}