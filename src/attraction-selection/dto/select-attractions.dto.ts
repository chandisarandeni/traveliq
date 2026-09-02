import { TravelStyle } from '../enums/travel-style.enum';
import {
  InterestWeight,
  SriLankaAttraction,
  AttractionFilterCriteria,
} from '../interfaces/attraction-selection.interface';

export class SelectAttractionsDto {
  tripDuration: number;
  travelStyle: TravelStyle;
  userInterests: InterestWeight[];
  availableAttractions: SriLankaAttraction[];
  filterCriteria?: AttractionFilterCriteria;
}
