import { Test, TestingModule } from '@nestjs/testing';
import { AttractionSelectionController } from './attraction-selection.controller';
import { AttractionSelectionService } from './attraction-selection.service';

describe('AttractionSelectionController', () => {
  let controller: AttractionSelectionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttractionSelectionController],
      providers: [AttractionSelectionService],
    }).compile();

    controller = module.get<AttractionSelectionController>(AttractionSelectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
