import { Injectable } from '@nestjs/common';
import { CreateRouteOptimizationDto } from './dto/create-route-optimization.dto';
import { UpdateRouteOptimizationDto } from './dto/update-route-optimization.dto';

@Injectable()
export class RouteOptimizationService {
  create(createRouteOptimizationDto: CreateRouteOptimizationDto) {
    return 'This action adds a new routeOptimization';
  }

  findAll() {
    return `This action returns all routeOptimization`;
  }

  findOne(id: number) {
    return `This action returns a #${id} routeOptimization`;
  }

  update(id: number, updateRouteOptimizationDto: UpdateRouteOptimizationDto) {
    return `This action updates a #${id} routeOptimization`;
  }

  remove(id: number) {
    return `This action removes a #${id} routeOptimization`;
  }
}
