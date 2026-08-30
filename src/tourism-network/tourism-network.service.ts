import { Injectable } from '@nestjs/common';
import { CreateTourismNetworkDto } from './dto/create-tourism-network.dto';
import { UpdateTourismNetworkDto } from './dto/update-tourism-network.dto';

@Injectable()
export class TourismNetworkService {
  create(createTourismNetworkDto: CreateTourismNetworkDto) {
    return 'This action adds a new tourismNetwork';
  }

  findAll() {
    return `This action returns all tourismNetwork`;
  }

  findOne(id: number) {
    return `This action returns a #${id} tourismNetwork`;
  }

  update(id: number, updateTourismNetworkDto: UpdateTourismNetworkDto) {
    return `This action updates a #${id} tourismNetwork`;
  }

  remove(id: number) {
    return `This action removes a #${id} tourismNetwork`;
  }
}
