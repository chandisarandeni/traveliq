import { ConfigService } from '@nestjs/config';
import { TransportCostService } from './transport-cost.service';

describe('TransportCostService', () => {
  it('calculates travel cost in O(1) for one edge', () => {
    const service = new TransportCostService({} as ConfigService);

    expect(service.calculateTravelCost(6.8, 120)).toBe(816);
  });
});
