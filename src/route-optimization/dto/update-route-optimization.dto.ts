import { PartialType } from '@nestjs/mapped-types';
import { CreateRouteOptimizationDto } from './create-route-optimization.dto';

export class UpdateRouteOptimizationDto extends PartialType(CreateRouteOptimizationDto) {}
