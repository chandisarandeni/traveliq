import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TravelPlanRankingService } from './travel-plan-ranking.service';
import { CreateTravelPlanRankingDto } from './dto/create-travel-plan-ranking.dto';
import { UpdateTravelPlanRankingDto } from './dto/update-travel-plan-ranking.dto';

@Controller('travel-plan-ranking')
export class TravelPlanRankingController {
  constructor(private readonly travelPlanRankingService: TravelPlanRankingService) {}

  @Post()
  create(@Body() createTravelPlanRankingDto: CreateTravelPlanRankingDto) {
    return this.travelPlanRankingService.create(createTravelPlanRankingDto);
  }

  @Get()
  findAll() {
    return this.travelPlanRankingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.travelPlanRankingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTravelPlanRankingDto: UpdateTravelPlanRankingDto) {
    return this.travelPlanRankingService.update(+id, updateTravelPlanRankingDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.travelPlanRankingService.remove(+id);
  }
}
