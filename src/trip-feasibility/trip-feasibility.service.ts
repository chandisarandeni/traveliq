import { BadRequestException, Injectable } from '@nestjs/common';
import { scheduleItinerary } from './algorithms/greedy-itinerary.algorithm';
import { FLOAT_COMPARISON_EPSILON } from './constants/trip-feasibility.constants';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';
import { CalculateTripItineraryInput } from './interfaces/calculate-trip-itinerary.interface';
import { OptimizedRouteInput } from './interfaces/optimized-route.interface';
import { RouteSegment } from './interfaces/route-segment.interface';
import { SelectedAttractionInput } from './interfaces/selected-attraction.interface';
import { TimeItineraryResult } from './interfaces/time-itinerary-result.interface';

@Injectable()
export class TripFeasibilityService {
  calculateItinerary(dto: CalculateTripItineraryDto): TimeItineraryResult {
    const input = this.validateAndNormalize(dto);

    return scheduleItinerary(input);
  }

  private validateAndNormalize(
    dto: CalculateTripItineraryDto,
  ): CalculateTripItineraryInput {
    if (!dto || typeof dto !== 'object') {
      throw new BadRequestException('Request body is required.');
    }

    this.assertPositiveInteger(dto.tripDuration, 'tripDuration');
    this.assertPositiveNumber(dto.maxDailyTravelTime, 'maxDailyTravelTime');
    this.assertLocation(dto.startingLocation, 'startingLocation');
    this.assertLocation(dto.endingLocation, 'endingLocation');

    const selectedAttractions = this.validateSelectedAttractions(
      dto.selectedAttractions,
    );
    const optimizedRoute = this.validateOptimizedRoute(dto.optimizedRoute);

    this.assertDuplicateAttractionNamesAreNotAmbiguous(
      selectedAttractions,
      optimizedRoute,
    );
    this.assertRouteContainsSelectedAttractions(
      selectedAttractions,
      optimizedRoute,
    );

    return {
      tripDuration: dto.tripDuration,
      maxDailyTravelTime: dto.maxDailyTravelTime,
      startingLocation: dto.startingLocation,
      endingLocation: dto.endingLocation,
      selectedAttractions,
      optimizedRoute,
    };
  }

  private validateSelectedAttractions(
    selectedAttractions: SelectedAttractionInput[],
  ): SelectedAttractionInput[] {
    if (!Array.isArray(selectedAttractions)) {
      throw new BadRequestException('selectedAttractions must be an array.');
    }

    selectedAttractions.forEach((attraction, index) => {
      const path = `selectedAttractions[${index}]`;

      this.assertNonEmptyString(
        attraction?.attractionId,
        `${path}.attractionId`,
      );
      this.assertNonEmptyString(
        attraction?.attractionName,
        `${path}.attractionName`,
      );
      this.assertNonNegativeNumber(
        attraction?.activityCost,
        `${path}.activityCost`,
      );
      this.assertPositiveNumber(
        attraction?.visitDuration,
        `${path}.visitDuration`,
      );
      this.assertNonNegativeNumber(
        attraction?.interestScore,
        `${path}.interestScore`,
      );
    });

    return selectedAttractions;
  }

  private validateOptimizedRoute(
    optimizedRoute: OptimizedRouteInput,
  ): OptimizedRouteInput {
    if (!optimizedRoute || typeof optimizedRoute !== 'object') {
      throw new BadRequestException('optimizedRoute is required.');
    }

    if (!Array.isArray(optimizedRoute.destinations)) {
      throw new BadRequestException(
        'optimizedRoute.destinations must be an array.',
      );
    }

    if (!Array.isArray(optimizedRoute.routeSegments)) {
      throw new BadRequestException(
        'optimizedRoute.routeSegments must be an array.',
      );
    }

    optimizedRoute.destinations.forEach((destination, index) => {
      this.assertNonEmptyString(
        destination,
        `optimizedRoute.destinations[${index}]`,
      );
    });

    optimizedRoute.routeSegments.forEach((segment, index) => {
      this.validateRouteSegment(segment, index);
    });

    this.assertNonNegativeNumber(
      optimizedRoute.totalTravelTime,
      'optimizedRoute.totalTravelTime',
    );
    this.assertNonNegativeNumber(
      optimizedRoute.totalTravelDistance,
      'optimizedRoute.totalTravelDistance',
    );
    this.assertNonNegativeNumber(
      optimizedRoute.totalTravelCost,
      'optimizedRoute.totalTravelCost',
    );
    this.assertRouteContinuity(optimizedRoute);
    this.assertRouteTotalsAreConsistent(optimizedRoute);

    return optimizedRoute;
  }

  private validateRouteSegment(segment: RouteSegment, index: number): void {
    const path = `optimizedRoute.routeSegments[${index}]`;

    this.assertNonEmptyString(segment?.from, `${path}.from`);
    this.assertNonEmptyString(segment?.to, `${path}.to`);
    this.assertNonNegativeNumber(segment?.travelTime, `${path}.travelTime`);
    this.assertNonNegativeNumber(
      segment?.travelDistance,
      `${path}.travelDistance`,
    );
    this.assertNonNegativeNumber(segment?.travelCost, `${path}.travelCost`);
  }

  private assertRouteContinuity(optimizedRoute: OptimizedRouteInput): void {
    const { destinations, routeSegments } = optimizedRoute;

    if (destinations.length === 0 && routeSegments.length === 0) {
      return;
    }

    if (destinations.length !== routeSegments.length + 1) {
      throw new BadRequestException(
        'optimizedRoute.destinations must include one more entry than routeSegments.',
      );
    }

    for (let index = 0; index < routeSegments.length; index += 1) {
      const expectedFrom = destinations[index];
      const expectedTo = destinations[index + 1];
      const segment = routeSegments[index];

      if (segment.from !== expectedFrom || segment.to !== expectedTo) {
        throw new BadRequestException(
          `Missing route segment from ${expectedFrom} to ${expectedTo}.`,
        );
      }
    }
  }

  private assertRouteTotalsAreConsistent(
    optimizedRoute: OptimizedRouteInput,
  ): void {
    const totalTravelTime = this.sumRouteField(
      optimizedRoute.routeSegments,
      'travelTime',
    );
    const totalTravelDistance = this.sumRouteField(
      optimizedRoute.routeSegments,
      'travelDistance',
    );
    const totalTravelCost = this.sumRouteField(
      optimizedRoute.routeSegments,
      'travelCost',
    );

    this.assertNumbersMatch(
      totalTravelTime,
      optimizedRoute.totalTravelTime,
      'optimizedRoute.totalTravelTime',
    );
    this.assertNumbersMatch(
      totalTravelDistance,
      optimizedRoute.totalTravelDistance,
      'optimizedRoute.totalTravelDistance',
    );
    this.assertNumbersMatch(
      totalTravelCost,
      optimizedRoute.totalTravelCost,
      'optimizedRoute.totalTravelCost',
    );
  }

  private assertRouteContainsSelectedAttractions(
    selectedAttractions: SelectedAttractionInput[],
    optimizedRoute: OptimizedRouteInput,
  ): void {
    const routeDestinations = new Set(optimizedRoute.destinations);

    for (const attraction of selectedAttractions) {
      if (
        !routeDestinations.has(attraction.attractionId) &&
        !routeDestinations.has(attraction.attractionName)
      ) {
        throw new BadRequestException(
          `Selected attraction ${attraction.attractionName} is missing from the optimized route.`,
        );
      }
    }
  }

  private assertDuplicateAttractionNamesAreNotAmbiguous(
    selectedAttractions: SelectedAttractionInput[],
    optimizedRoute: OptimizedRouteInput,
  ): void {
    const nameCounts = new Map<string, number>();

    for (const attraction of selectedAttractions) {
      nameCounts.set(
        attraction.attractionName,
        (nameCounts.get(attraction.attractionName) ?? 0) + 1,
      );
    }

    for (const [attractionName, count] of nameCounts) {
      if (count > 1 && optimizedRoute.destinations.includes(attractionName)) {
        throw new BadRequestException(
          `Attraction name ${attractionName} appears more than once. Use attraction IDs in optimizedRoute.destinations and routeSegments to avoid ambiguity.`,
        );
      }
    }
  }

  private sumRouteField(
    routeSegments: RouteSegment[],
    field: 'travelTime' | 'travelDistance' | 'travelCost',
  ): number {
    return Number(
      routeSegments
        .reduce((total, segment) => total + segment[field], 0)
        .toFixed(3),
    );
  }

  private assertNumbersMatch(
    calculated: number,
    supplied: number,
    fieldName: string,
  ): void {
    if (Math.abs(calculated - supplied) > FLOAT_COMPARISON_EPSILON) {
      throw new BadRequestException(
        `${fieldName} is inconsistent with routeSegments. Expected ${calculated}, received ${supplied}.`,
      );
    }
  }

  private assertLocation(value: unknown, fieldName: string): void {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    const location = value as {
      name?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };

    this.assertNonEmptyString(location.name, `${fieldName}.name`);

    if (location.latitude !== undefined) {
      this.assertFiniteNumber(location.latitude, `${fieldName}.latitude`);
    }

    if (location.longitude !== undefined) {
      this.assertFiniteNumber(location.longitude, `${fieldName}.longitude`);
    }
  }

  private assertPositiveInteger(value: unknown, fieldName: string): void {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
  }

  private assertPositiveNumber(value: unknown, fieldName: string): void {
    if (!this.isFiniteNumber(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number.`);
    }
  }

  private assertNonNegativeNumber(value: unknown, fieldName: string): void {
    if (!this.isFiniteNumber(value) || Number(value) < 0) {
      throw new BadRequestException(`${fieldName} must be zero or greater.`);
    }
  }

  private assertFiniteNumber(value: unknown, fieldName: string): void {
    if (!this.isFiniteNumber(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number.`);
    }
  }

  private assertNonEmptyString(value: unknown, fieldName: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string.`);
    }
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
