import { Injectable } from '@nestjs/common';
import { CreateTripFeasibilityDto } from './dto/create-trip-feasibility.dto';
import { UpdateTripFeasibilityDto } from './dto/update-trip-feasibility.dto';

@Injectable()
export class TripFeasibilityService {
  create(createTripFeasibilityDto: CreateTripFeasibilityDto) {
    return 'This action adds a new tripFeasibility';
  }

  findAll() {
    return `This action returns all tripFeasibility`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tripFeasibility`;
  }

  update(id: number, updateTripFeasibilityDto: UpdateTripFeasibilityDto) {
    return `This action updates a #${id} tripFeasibility`;
  }

  remove(id: number) {
    return `This action removes a #${id} tripFeasibility`;
  }
}
