import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteWeightsDto } from './route-weights.dto';

export class OptimizeSinglePlanDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  startLocation: string;

  @IsString()
  @IsNotEmpty()
  endLocation: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  locations: string[];

  @IsArray()
  distanceMatrix: number[][];

  @IsArray()
  timeMatrix: number[][];

  @IsArray()
  costMatrix: number[][];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RouteWeightsDto)
  weights?: RouteWeightsDto;
}

export class OptimizePlansDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptimizeSinglePlanDto)
  plans: OptimizeSinglePlanDto[];
}
