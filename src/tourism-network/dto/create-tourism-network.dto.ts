import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { TransportationMode } from '../enums/transportation-mode.enum';

export class SelectedAttractionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsArray()
  categories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class CandidatePlanSelectedAttractionDto {
  @ValidateNested()
  @Type(() => SelectedAttractionDto)
  attraction!: SelectedAttractionDto;

  @IsOptional()
  @IsNumber()
  interestScore?: number;

  @IsOptional()
  @IsNumber()
  normalizedScore?: number;
}

export class CandidatePlanDto {
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @IsOptional()
  @IsNumber()
  rank?: number;

  @IsOptional()
  @IsNumber()
  planInterestScore?: number;

  @IsOptional()
  @IsNumber()
  diversityScore?: number;

  @IsOptional()
  @IsNumber()
  planScore?: number;

  @IsArray()
  selectedAttractions!: unknown[];
}

export class NetworkLocationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class CreateTourismNetworkDto {
  @IsOptional()
  @IsNumber()
  destinationCount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidatePlanDto)
  candidatePlans!: CandidatePlanDto[];

  @IsEnum(TransportationMode)
  preferredTransportation!: TransportationMode;

  @ValidateNested()
  @Type(() => NetworkLocationDto)
  startingLocation!: NetworkLocationDto;

  @ValidateNested()
  @Type(() => NetworkLocationDto)
  endingLocation!: NetworkLocationDto;
}
