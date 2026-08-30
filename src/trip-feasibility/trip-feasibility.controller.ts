import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TripFeasibilityService } from './trip-feasibility.service';
import { CreateTripFeasibilityDto } from './dto/create-trip-feasibility.dto';
import { UpdateTripFeasibilityDto } from './dto/update-trip-feasibility.dto';

@Controller('trip-feasibility')
export class TripFeasibilityController {
  constructor(private readonly tripFeasibilityService: TripFeasibilityService) {}

  @Post()
  create(@Body() createTripFeasibilityDto: CreateTripFeasibilityDto) {
    return this.tripFeasibilityService.create(createTripFeasibilityDto);
  }

  @Get()
  findAll() {
    return this.tripFeasibilityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripFeasibilityService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTripFeasibilityDto: UpdateTripFeasibilityDto) {
    return this.tripFeasibilityService.update(+id, updateTripFeasibilityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tripFeasibilityService.remove(+id);
  }
}
