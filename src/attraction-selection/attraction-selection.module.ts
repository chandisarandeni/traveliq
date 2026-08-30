import { Module } from '@nestjs/common';
import { AttractionSelectionService } from './attraction-selection.service';
import { AttractionSelectionController } from './attraction-selection.controller';

@Module({
  controllers: [AttractionSelectionController],
  providers: [AttractionSelectionService],
})
export class AttractionSelectionModule {}
