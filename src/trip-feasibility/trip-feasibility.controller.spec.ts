import { Test, TestingModule } from '@nestjs/testing';
import { TripFeasibilityController } from './trip-feasibility.controller';
import { TripFeasibilityService } from './trip-feasibility.service';

describe('TripFeasibilityController', () => {
  let controller: TripFeasibilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripFeasibilityController],
      providers: [TripFeasibilityService],
    }).compile();

    controller = module.get<TripFeasibilityController>(TripFeasibilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
