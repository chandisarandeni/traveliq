import { Injectable } from '@nestjs/common';
import { OptimizePlansDto, OptimizeSinglePlanDto } from '../dto/optimize-route.dto';

@Injectable()
export class MockDataService {
  /**
   * Generates sample Network Analysis mock input dataset representing 5 travel plans.
   */
  getSampleNetworkAnalysisData(): OptimizePlansDto {
    const p01: OptimizeSinglePlanDto = {
      planId: 'P01',
      startLocation: 'Colombo Airport',
      endLocation: 'Bandaranaike Airport',
      locations: [
        'Colombo Airport',
        'Sigiriya',
        'Dambulla',
        'Kandy',
        'Yala',
        'Unawatuna',
        'Bandaranaike Airport',
      ],
      distanceMatrix: [
        [0, 170, 150, 115, 300, 125, 35],
        [170, 0, 20, 90, 250, 300, 170],
        [150, 20, 0, 75, 230, 280, 150],
        [115, 90, 75, 0, 250, 230, 115],
        [300, 250, 230, 250, 0, 160, 300],
        [125, 300, 280, 230, 160, 0, 125],
        [35, 170, 150, 115, 300, 125, 0],
      ],
      timeMatrix: [
        [0, 3.8, 3.4, 3.2, 6.0, 2.5, 0.8],
        [3.8, 0, 0.5, 2.0, 5.0, 5.5, 3.8],
        [3.4, 0.5, 0, 1.7, 4.7, 5.0, 3.4],
        [3.2, 2.0, 1.7, 0, 5.0, 4.5, 3.2],
        [6.0, 5.0, 4.7, 5.0, 0, 3.0, 6.0],
        [2.5, 5.5, 5.0, 4.5, 3.0, 0, 2.5],
        [0.8, 3.8, 3.4, 3.2, 6.0, 2.5, 0],
      ],
      costMatrix: [
        [0, 6000, 5500, 4000, 10000, 4500, 1500],
        [6000, 0, 1500, 3000, 8000, 9000, 6000],
        [5500, 1500, 0, 2500, 7500, 8500, 5500],
        [4000, 3000, 2500, 0, 8000, 7000, 4000],
        [10000, 8000, 7500, 8000, 0, 5000, 10000],
        [4500, 9000, 8500, 7000, 5000, 0, 4500],
        [1500, 6000, 5500, 4000, 10000, 4500, 0],
      ],
      weights: { costWeight: 0.5, timeWeight: 0.3, distanceWeight: 0.2 },
    };

    const p02: OptimizeSinglePlanDto = {
      planId: 'P02',
      startLocation: 'Colombo Airport',
      endLocation: 'Bandaranaike Airport',
      locations: [
        'Colombo Airport',
        'Kandy',
        'Nuwara Eliya',
        'Ella',
        'Bandaranaike Airport',
      ],
      distanceMatrix: [
        [0, 115, 160, 200, 35],
        [115, 0, 75, 135, 115],
        [160, 75, 0, 60, 160],
        [200, 135, 60, 0, 200],
        [35, 115, 160, 200, 0],
      ],
      timeMatrix: [
        [0, 3.2, 4.5, 5.5, 0.8],
        [3.2, 0, 2.5, 3.8, 3.2],
        [4.5, 2.5, 0, 2.0, 4.5],
        [5.5, 3.8, 2.0, 0, 5.5],
        [0.8, 3.2, 4.5, 5.5, 0],
      ],
      costMatrix: [
        [0, 4000, 5500, 7000, 1500],
        [4000, 0, 2500, 4500, 4000],
        [5500, 2500, 0, 2000, 5500],
        [7000, 4500, 2000, 0, 7000],
        [1500, 4000, 5500, 7000, 0],
      ],
      weights: { costWeight: 0.5, timeWeight: 0.3, distanceWeight: 0.2 },
    };

    const p03: OptimizeSinglePlanDto = {
      planId: 'P03',
      startLocation: 'Colombo Airport',
      endLocation: 'Bandaranaike Airport',
      locations: [
        'Colombo Airport',
        'Galle',
        'Mirissa',
        'Arugam Bay',
        'Bandaranaike Airport',
      ],
      distanceMatrix: [
        [0, 125, 150, 320, 35],
        [125, 0, 30, 280, 125],
        [150, 30, 0, 260, 150],
        [320, 280, 260, 0, 320],
        [35, 125, 150, 320, 0],
      ],
      timeMatrix: [
        [0, 2.5, 3.0, 6.5, 0.8],
        [2.5, 0, 0.6, 5.5, 2.5],
        [3.0, 0.6, 0, 5.0, 3.0],
        [6.5, 5.5, 5.0, 0, 6.5],
        [0.8, 2.5, 3.0, 6.5, 0],
      ],
      costMatrix: [
        [0, 4500, 5000, 11000, 1500],
        [4500, 0, 1000, 9500, 4500],
        [5000, 1000, 0, 9000, 5000],
        [11000, 9500, 9000, 0, 11000],
        [1500, 4500, 5000, 11000, 0],
      ],
      weights: { costWeight: 0.5, timeWeight: 0.3, distanceWeight: 0.2 },
    };

    const p04: OptimizeSinglePlanDto = {
      planId: 'P04',
      startLocation: 'Colombo Airport',
      endLocation: 'Bandaranaike Airport',
      locations: [
        'Colombo Airport',
        'Anuradhapura',
        'Polonnaruwa',
        'Sigiriya',
        'Bandaranaike Airport',
      ],
      distanceMatrix: [
        [0, 205, 225, 170, 35],
        [205, 0, 100, 75, 205],
        [225, 100, 0, 65, 225],
        [170, 75, 65, 0, 170],
        [35, 205, 225, 170, 0],
      ],
      timeMatrix: [
        [0, 4.2, 4.8, 3.8, 0.8],
        [4.2, 0, 2.2, 1.8, 4.2],
        [4.8, 2.2, 0, 1.5, 4.8],
        [3.8, 1.8, 1.5, 0, 3.8],
        [0.8, 4.2, 4.8, 3.8, 0],
      ],
      costMatrix: [
        [0, 7000, 7500, 6000, 1500],
        [7000, 0, 3500, 2500, 7000],
        [7500, 3500, 0, 2000, 7500],
        [6000, 2500, 2000, 0, 6000],
        [1500, 7000, 7500, 6000, 0],
      ],
      weights: { costWeight: 0.5, timeWeight: 0.3, distanceWeight: 0.2 },
    };

    const p05: OptimizeSinglePlanDto = {
      planId: 'P05',
      startLocation: 'Colombo Airport',
      endLocation: 'Bandaranaike Airport',
      locations: [
        'Colombo Airport',
        'Trincomalee',
        'Jaffna',
        'Bandaranaike Airport',
      ],
      distanceMatrix: [
        [0, 260, 395, 35],
        [260, 0, 235, 260],
        [395, 235, 0, 395],
        [35, 260, 395, 0],
      ],
      timeMatrix: [
        [0, 5.5, 8.0, 0.8],
        [5.5, 0, 4.8, 5.5],
        [8.0, 4.8, 0, 8.0],
        [0.8, 5.5, 8.0, 0],
      ],
      costMatrix: [
        [0, 9000, 13500, 1500],
        [9000, 0, 8000, 9000],
        [13500, 8000, 0, 13500],
        [1500, 9000, 13500, 0],
      ],
      weights: { costWeight: 0.5, timeWeight: 0.3, distanceWeight: 0.2 },
    };

    return {
      plans: [p01, p02, p03, p04, p05],
    };
  }
}
