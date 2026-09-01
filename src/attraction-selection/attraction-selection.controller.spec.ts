import { Test, TestingModule } from '@nestjs/testing';
import { AttractionSelectionController } from './attraction-selection.controller';
import { AttractionSelectionService } from './attraction-selection.service';
import { TravelStyle } from './enums/travel-style.enum';
import { InterestCategory } from './enums/interest-category.enum';

describe('AttractionSelectionController', () => {
  let controller: AttractionSelectionController;
  let service: AttractionSelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttractionSelectionController],
      providers: [AttractionSelectionService],
    }).compile();

    controller = module.get<AttractionSelectionController>(
      AttractionSelectionController,
    );
    service = module.get<AttractionSelectionService>(
      AttractionSelectionService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should process attraction selection request via controller', () => {
    const result = controller.selectAttractions({
      tripDuration: 3,
      travelStyle: TravelStyle.BALANCED,
      userInterests: [{ interest: InterestCategory.BEACH, weight: 5 }],
      availableAttractions: [
        {
          id: '1',
          name: 'Bentota Beach',
          categories: [InterestCategory.BEACH],
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.recommendedDestinationCount).toBe(4);
    expect(result.candidateAttractions.length).toBe(1);
    expect(result.candidateAttractions[0].attraction.name).toBe('Bentota Beach');
  });
});
