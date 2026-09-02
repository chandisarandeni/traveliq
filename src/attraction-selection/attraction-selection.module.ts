import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttractionSelectionService } from './attraction-selection.service';
import { AttractionSelectionController } from './attraction-selection.controller';
import {
  AttractionSelection,
  AttractionSelectionSchema,
} from './schemas/attraction-selection.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AttractionSelection.name, schema: AttractionSelectionSchema },
    ]),
  ],
  controllers: [AttractionSelectionController],
  providers: [AttractionSelectionService],
  exports: [AttractionSelectionService],
})
export class AttractionSelectionModule {}

