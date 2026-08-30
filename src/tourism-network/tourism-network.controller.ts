import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TourismNetworkService } from './tourism-network.service';
import { CreateTourismNetworkDto } from './dto/create-tourism-network.dto';
import { UpdateTourismNetworkDto } from './dto/update-tourism-network.dto';

@Controller('tourism-network')
export class TourismNetworkController {
  constructor(private readonly tourismNetworkService: TourismNetworkService) {}

  @Post()
  create(@Body() createTourismNetworkDto: CreateTourismNetworkDto) {
    return this.tourismNetworkService.create(createTourismNetworkDto);
  }

  @Get()
  findAll() {
    return this.tourismNetworkService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tourismNetworkService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTourismNetworkDto: UpdateTourismNetworkDto) {
    return this.tourismNetworkService.update(+id, updateTourismNetworkDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tourismNetworkService.remove(+id);
  }
}
