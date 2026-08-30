import { PartialType } from '@nestjs/mapped-types';
import { CreateAttractionSelectionDto } from './create-attraction-selection.dto';

export class UpdateAttractionSelectionDto extends PartialType(CreateAttractionSelectionDto) {}
