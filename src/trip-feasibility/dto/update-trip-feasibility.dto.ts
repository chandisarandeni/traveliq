import { PartialType } from '@nestjs/mapped-types';
import { CreateTripFeasibilityDto } from './create-trip-feasibility.dto';

export class UpdateTripFeasibilityDto extends PartialType(CreateTripFeasibilityDto) {}
