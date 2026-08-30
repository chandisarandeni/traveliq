import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationController } from './route-optimization.controller';
import { RouteOptimizationService } from './route-optimization.service';

describe('RouteOptimizationController', () => {
  let controller: RouteOptimizationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteOptimizationController],
      providers: [RouteOptimizationService],
    }).compile();

    controller = module.get<RouteOptimizationController>(RouteOptimizationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
