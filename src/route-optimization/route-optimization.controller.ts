import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RouteOptimizationService } from './route-optimization.service';
import { CreateRouteOptimizationDto } from './dto/create-route-optimization.dto';
import { UpdateRouteOptimizationDto } from './dto/update-route-optimization.dto';

@Controller('route-optimization')
export class RouteOptimizationController {
  constructor(private readonly routeOptimizationService: RouteOptimizationService) {}

  @Post()
  create(@Body() createRouteOptimizationDto: CreateRouteOptimizationDto) {
    return this.routeOptimizationService.create(createRouteOptimizationDto);
  }

  @Get()
  findAll() {
    return this.routeOptimizationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routeOptimizationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRouteOptimizationDto: UpdateRouteOptimizationDto) {
    return this.routeOptimizationService.update(+id, updateRouteOptimizationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routeOptimizationService.remove(+id);
  }
}
