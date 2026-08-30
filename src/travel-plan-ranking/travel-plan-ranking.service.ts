import { Injectable } from '@nestjs/common';
import { CreateTravelPlanRankingDto } from './dto/create-travel-plan-ranking.dto';
import { UpdateTravelPlanRankingDto } from './dto/update-travel-plan-ranking.dto';

@Injectable()
export class TravelPlanRankingService {
  create(createTravelPlanRankingDto: CreateTravelPlanRankingDto) {
    return 'This action adds a new travelPlanRanking';
  }

  findAll() {
    return `This action returns all travelPlanRanking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} travelPlanRanking`;
  }

  update(id: number, updateTravelPlanRankingDto: UpdateTravelPlanRankingDto) {
    return `This action updates a #${id} travelPlanRanking`;
  }

  remove(id: number) {
    return `This action removes a #${id} travelPlanRanking`;
  }
}
