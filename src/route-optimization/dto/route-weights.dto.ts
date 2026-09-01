import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class RouteWeightsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  costWeight?: number = 0.5;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  timeWeight?: number = 0.3;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  distanceWeight?: number = 0.2;
}
