import { BadRequestException } from '@nestjs/common';
import { MatrixValidationService } from './matrix-validation.service';
import { OptimizeSinglePlanDto } from '../dto/optimize-route.dto';

describe('MatrixValidationService', () => {
  let service: MatrixValidationService;

  beforeEach(() => {
    service = new MatrixValidationService();
  });

  const getValidDto = (): OptimizeSinglePlanDto => ({
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
  });

  it('should validate a correct DTO', () => {
    const dto = getValidDto();
    const result = service.validateInput(dto);

    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(6);
    expect(result.intermediateIndices).toEqual([1, 2, 3, 4, 5]);
  });

  it('should throw BadRequestException if planId is missing', () => {
    const dto = getValidDto();
    dto.planId = '';
    expect(() => service.validateInput(dto)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if startLocation is not found', () => {
    const dto = getValidDto();
    dto.startLocation = 'Galle';
    expect(() => service.validateInput(dto)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if endLocation is not found', () => {
    const dto = getValidDto();
    dto.endLocation = 'Jaffna';
    expect(() => service.validateInput(dto)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if matrix dimensions do not match locations length', () => {
    const dto = getValidDto();
    dto.distanceMatrix = dto.distanceMatrix.slice(0, 6); // 6 rows instead of 7
    expect(() => service.validateInput(dto)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if matrix contains negative values', () => {
    const dto = getValidDto();
    dto.costMatrix[0][1] = -500;
    expect(() => service.validateInput(dto)).toThrow(BadRequestException);
  });

  it('should throw BadRequestException if startLocation appears as an intermediate location', () => {
    const dto = getValidDto();
    dto.locations[2] = 'Colombo Airport'; // Place start location at index 2
    expect(() => service.validateInput(dto)).toThrow(BadRequestException);
  });

  it('should handle minimum valid 2-location input (Start + End, 0 destinations)', () => {
    const dto: OptimizeSinglePlanDto = {
      planId: 'P02',
      startLocation: 'Colombo',
      endLocation: 'Kandy',
      locations: ['Colombo', 'Kandy'],
      distanceMatrix: [
        [0, 115],
        [115, 0],
      ],
      timeMatrix: [
        [0, 3.2],
        [3.2, 0],
      ],
      costMatrix: [
        [0, 4000],
        [4000, 0],
      ],
    };

    const result = service.validateInput(dto);
    expect(result.startIndex).toBe(0);
    expect(result.endIndex).toBe(1);
    expect(result.intermediateIndices).toEqual([]);
  });
});
