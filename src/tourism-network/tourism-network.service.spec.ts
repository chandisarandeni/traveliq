import { Test, TestingModule } from '@nestjs/testing';
import { TourismNetworkService } from './tourism-network.service';

describe('TourismNetworkService', () => {
  let service: TourismNetworkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TourismNetworkService],
    }).compile();

    service = module.get<TourismNetworkService>(TourismNetworkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
