import { PartialType } from '@nestjs/mapped-types';
import { CreateTravelPlanRankingDto } from './create-travel-plan-ranking.dto';

export class UpdateTravelPlanRankingDto extends PartialType(CreateTravelPlanRankingDto) {}
