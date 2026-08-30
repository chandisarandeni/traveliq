import { Injectable } from '@nestjs/common';
import { CreateAttractionSelectionDto } from './dto/create-attraction-selection.dto';
import { UpdateAttractionSelectionDto } from './dto/update-attraction-selection.dto';

@Injectable()
export class AttractionSelectionService {
  create(createAttractionSelectionDto: CreateAttractionSelectionDto) {
    return 'This action adds a new attractionSelection';
  }

  findAll() {
    return `This action returns all attractionSelection`;
  }

  findOne(id: number) {
    return `This action returns a #${id} attractionSelection`;
  }

  update(id: number, updateAttractionSelectionDto: UpdateAttractionSelectionDto) {
    return `This action updates a #${id} attractionSelection`;
  }

  remove(id: number) {
    return `This action removes a #${id} attractionSelection`;
  }
}
