import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttractionSelectionService } from './attraction-selection.service';
import { CreateAttractionSelectionDto } from './dto/create-attraction-selection.dto';
import { UpdateAttractionSelectionDto } from './dto/update-attraction-selection.dto';
import { SelectAttractionsDto } from './dto/select-attractions.dto';

@Controller('attraction-selection')
export class AttractionSelectionController {
  constructor(
    private readonly attractionSelectionService: AttractionSelectionService,
  ) {}

  @Post('select')
  @HttpCode(HttpStatus.OK)
  selectAttractions(@Body() selectAttractionsDto: SelectAttractionsDto) {
    return this.attractionSelectionService.selectAttractions(
      selectAttractionsDto,
    );
  }

  @Post()
  create(@Body() createAttractionSelectionDto: CreateAttractionSelectionDto) {
    return this.attractionSelectionService.create(
      createAttractionSelectionDto,
    );
  }

  @Get()
  findAll() {
    return this.attractionSelectionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attractionSelectionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAttractionSelectionDto: UpdateAttractionSelectionDto,
  ) {
    return this.attractionSelectionService.update(
      +id,
      updateAttractionSelectionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attractionSelectionService.remove(+id);
  }
}
