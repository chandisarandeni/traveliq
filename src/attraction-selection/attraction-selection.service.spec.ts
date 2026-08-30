import { Test, TestingModule } from '@nestjs/testing';
import { AttractionSelectionService } from './attraction-selection.service';

describe('AttractionSelectionService', () => {
  let service: AttractionSelectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AttractionSelectionService],
    }).compile();

    service = module.get<AttractionSelectionService>(AttractionSelectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
