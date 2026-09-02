import { Test, TestingModule } from '@nestjs/testing';
import { TourismNetworkController } from './tourism-network.controller';
import { TourismNetworkService } from './tourism-network.service';

describe('TourismNetworkController', () => {
  let controller: TourismNetworkController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TourismNetworkController],
      providers: [
        {
          provide: TourismNetworkService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<TourismNetworkController>(TourismNetworkController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
