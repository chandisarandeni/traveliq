import { Injectable, BadRequestException } from '@nestjs/common';
import { OptimizeSinglePlanDto } from '../dto/optimize-route.dto';

export interface ValidatedRouteStructure {
  startIndex: number;
  endIndex: number;
  intermediateIndices: number[];
}

@Injectable()
export class MatrixValidationService {
  /**
   * Validates input DTO, matrices dimensions, values, and location structures.
   * Throws BadRequestException if validation fails.
   */
  validateInput(dto: OptimizeSinglePlanDto): ValidatedRouteStructure {
    const {
      planId,
      startLocation,
      endLocation,
      locations,
      distanceMatrix,
      timeMatrix,
      costMatrix,
    } = dto;

    if (!planId || typeof planId !== 'string') {
      throw new BadRequestException('planId is required and must be a string.');
    }

    if (!startLocation || typeof startLocation !== 'string') {
      throw new BadRequestException(
        'startLocation is required and must be a string.',
      );
    }

    if (!endLocation || typeof endLocation !== 'string') {
      throw new BadRequestException(
        'endLocation is required and must be a string.',
      );
    }

    if (!Array.isArray(locations) || locations.length < 2) {
      throw new BadRequestException(
        'locations must be an array containing at least startLocation and endLocation.',
      );
    }

    const n = locations.length;

    // Validate matrices existence and type
    this.validateMatrix(distanceMatrix, n, 'distanceMatrix');
    this.validateMatrix(timeMatrix, n, 'timeMatrix');
    this.validateMatrix(costMatrix, n, 'costMatrix');

    // Find start and end indices
    const startIndex = locations.indexOf(startLocation);
    if (startIndex === -1) {
      throw new BadRequestException(
        `startLocation "${startLocation}" was not found in the locations array.`,
      );
    }

    const endIndex = locations.lastIndexOf(endLocation);
    if (endIndex === -1) {
      throw new BadRequestException(
        `endLocation "${endLocation}" was not found in the locations array.`,
      );
    }

    // Identify intermediate indices (indices that are neither start nor end)
    const intermediateIndices: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i !== startIndex && i !== endIndex) {
        intermediateIndices.push(i);
      }
    }

    // Check for invalid duplicate placements of start or end
    for (const idx of intermediateIndices) {
      if (locations[idx] === startLocation) {
        throw new BadRequestException(
          `startLocation "${startLocation}" appears as an intermediate destination at index ${idx}.`,
        );
      }
      if (locations[idx] === endLocation) {
        throw new BadRequestException(
          `endLocation "${endLocation}" appears as an intermediate destination at index ${idx}.`,
        );
      }
    }

    return {
      startIndex,
      endIndex,
      intermediateIndices,
    };
  }

  private validateMatrix(
    matrix: number[][],
    expectedSize: number,
    matrixName: string,
  ): void {
    if (!Array.isArray(matrix)) {
      throw new BadRequestException(`${matrixName} must be a 2D array.`);
    }

    if (matrix.length !== expectedSize) {
      throw new BadRequestException(
        `${matrixName} outer dimension (${matrix.length}) does not match locations count (${expectedSize}).`,
      );
    }

    for (let i = 0; i < expectedSize; i++) {
      const row = matrix[i];
      if (!Array.isArray(row)) {
        throw new BadRequestException(
          `${matrixName}[${i}] must be an array of numbers.`,
        );
      }

      if (row.length !== expectedSize) {
        throw new BadRequestException(
          `${matrixName}[${i}] dimension (${row.length}) does not match locations count (${expectedSize}).`,
        );
      }

      for (let j = 0; j < expectedSize; j++) {
        const val = row[j];
        if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
          throw new BadRequestException(
            `${matrixName}[${i}][${j}] must be a valid finite number.`,
          );
        }

        if (val < 0) {
          throw new BadRequestException(
            `${matrixName}[${i}][${j}] cannot be negative. Got ${val}.`,
          );
        }
      }
    }
  }
}
