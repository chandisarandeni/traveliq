import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { calculateBudgetFeasibility } from './algorithms/budget-feasibility.algorithm';
import { scheduleItinerary } from './algorithms/greedy-itinerary.algorithm';
import {
  FLOAT_COMPARISON_EPSILON,
  PROVINCES,
  TRIP_FEASIBILITY_MODEL,
  TRANSPORTATION_STYLES,
  TRAVEL_STYLES,
} from './constants/trip-feasibility.constants';
import { CalculateTripFeasibilityDto } from './dto/calculate-trip-feasibility.dto';
import { CalculateTripItineraryDto } from './dto/calculate-trip-itinerary.dto';
import { CalculateTripFeasibilityInput } from './interfaces/calculate-trip-feasibility.interface';
import { CalculateTripItineraryInput } from './interfaces/calculate-trip-itinerary.interface';
import { OptimizedRouteInput } from './interfaces/optimized-route.interface';
import { RouteSegment } from './interfaces/route-segment.interface';
import { SelectedAttractionInput } from './interfaces/selected-attraction.interface';
import { TimeItineraryResult } from './interfaces/time-itinerary-result.interface';
import {
  Province,
  TransportationStyle,
  TravelStyle,
} from './interfaces/travel-style.interface';
import { TripFeasibilityResult } from './interfaces/trip-feasibility-result.interface';

type TripFeasibilityCalculationType = 'itinerary' | 'feasibility';

interface TripFeasibilityPersistenceModel {
  create(record: Record<string, unknown>): Promise<unknown>;
}

@Injectable()
export class TripFeasibilityService {
  constructor(
    @Optional()
    @Inject(TRIP_FEASIBILITY_MODEL)
    private readonly tripFeasibilityModel?: TripFeasibilityPersistenceModel,
  ) {}

  // Public service method used by the controller and future module integrations.
  calculateItinerary(dto: CalculateTripItineraryDto): TimeItineraryResult {
    const input = this.validateAndNormalize(dto);

    return scheduleItinerary(input);
  }

  async calculateAndSaveItinerary(
    dto: CalculateTripItineraryDto,
  ): Promise<TimeItineraryResult> {
    const result = this.calculateItinerary(dto);

    await this.saveCalculation('itinerary', dto, result);

    return result;
  }

  // Full Module 2 check for the current phase: time scheduling plus budget feasibility.
  calculateFeasibility(
    dto: CalculateTripFeasibilityDto,
  ): TripFeasibilityResult {
    const input = this.validateAndNormalizeFeasibility(dto);
    const time = scheduleItinerary(input);
    const budget = calculateBudgetFeasibility(input, time);

    return {
      overallFeasible: time.timeFeasible && budget.budgetFeasible,
      time,
      budget,
      failureReasons: [...time.failureReasons, ...budget.failureReasons],
    };
  }

  async calculateAndSaveFeasibility(
    dto: CalculateTripFeasibilityDto,
  ): Promise<TripFeasibilityResult> {
    const result = this.calculateFeasibility(dto);

    await this.saveCalculation('feasibility', dto, result);

    return result;
  }

  private async saveCalculation(
    calculationType: TripFeasibilityCalculationType,
    requestSnapshot: CalculateTripItineraryDto | CalculateTripFeasibilityDto,
    resultSnapshot: TimeItineraryResult | TripFeasibilityResult,
  ): Promise<void> {
    if (!this.tripFeasibilityModel) {
      return;
    }

    await this.tripFeasibilityModel.create({
      calculationType,
      requestSnapshot,
      resultSnapshot,
      overallFeasible:
        'overallFeasible' in resultSnapshot
          ? resultSnapshot.overallFeasible
          : undefined,
      timeFeasible:
        'time' in resultSnapshot
          ? resultSnapshot.time.timeFeasible
          : resultSnapshot.timeFeasible,
      budgetFeasible:
        'budget' in resultSnapshot
          ? resultSnapshot.budget.budgetFeasible
          : undefined,
    });
  }

  // Keep validation at the NestJS service boundary so the algorithm stays pure.
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

    this.assertRouteMatchesRequestedEndpoints(
      dto.startingLocation.name,
      dto.endingLocation.name,
      selectedAttractions,
      optimizedRoute,
    );
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

  // Extends itinerary validation with budget fields needed by resource feasibility.
  private validateAndNormalizeFeasibility(
    dto: CalculateTripFeasibilityDto,
  ): CalculateTripFeasibilityInput {
    const itineraryInput = this.validateAndNormalize(dto);

    this.assertPositiveNumber(dto.totalBudget, 'totalBudget');
    this.assertNonNegativeNumber(
      dto.minEmergencyReserve,
      'minEmergencyReserve',
    );

    const travelStyle = this.assertTravelStyle(dto.travelStyle);
    const transportationStyle = this.assertTransportationStyle(
      dto.transportationStyle,
    );
    const province = this.assertProvince(dto.province);

    return {
      ...itineraryInput,
      totalBudget: dto.totalBudget,
      minEmergencyReserve: dto.minEmergencyReserve,
      travelStyle,
      transportationStyle,
      province,
    };
  }

  // Selected attractions provide visit time and activity cost for each stop.
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

  // Route Optimization provides the order and travel data; this module only validates and consumes it.
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

  // Each segment must have non-empty endpoints and non-negative travel values.
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

  // The route must be continuous: destinations[i] -> destinations[i + 1].
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

  // Recalculate totals from the detailed segments so inconsistent route summaries are rejected.
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

  // Every selected attraction must appear in the route by either ID or unique name.
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

  // The optimized route must represent the same journey requested by the tourist.
  private assertRouteMatchesRequestedEndpoints(
    startingLocationName: string,
    endingLocationName: string,
    selectedAttractions: SelectedAttractionInput[],
    optimizedRoute: OptimizedRouteInput,
  ): void {
    if (optimizedRoute.destinations.length === 0) {
      return;
    }

    const firstDestination = optimizedRoute.destinations[0];
    const finalDestination =
      optimizedRoute.destinations[optimizedRoute.destinations.length - 1];

    if (firstDestination !== startingLocationName) {
      throw new BadRequestException(
        `optimizedRoute must start at startingLocation ${startingLocationName}.`,
      );
    }

    if (
      finalDestination !== endingLocationName &&
      !this.isDestinationForLocation(
        finalDestination,
        endingLocationName,
        selectedAttractions,
      )
    ) {
      throw new BadRequestException(
        `optimizedRoute must end at endingLocation ${endingLocationName}.`,
      );
    }
  }

  private isDestinationForLocation(
    destination: string,
    locationName: string,
    selectedAttractions: SelectedAttractionInput[],
  ): boolean {
    return selectedAttractions.some(
      (attraction) =>
        attraction.attractionName === locationName &&
        attraction.attractionId === destination,
    );
  }

  // Duplicate names are allowed only when the route uses IDs, because names would be ambiguous.
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

  // Small helper for validating supplied totalTravelTime/Distance/Cost.
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

  // Allows tiny decimal differences but rejects genuinely inconsistent totals.
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

  // Location coordinates are optional today, but when present they must be valid numbers.
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

  // Used for tripDuration because a trip must be a whole number of days.
  private assertPositiveInteger(value: unknown, fieldName: string): void {
    if (!Number.isInteger(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
  }

  // Used for durations that may be decimal hours, such as 2.5 hours.
  private assertPositiveNumber(value: unknown, fieldName: string): void {
    if (!this.isFiniteNumber(value) || Number(value) <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive number.`);
    }
  }

  // Used for costs, distances, and travel times where zero is valid.
  private assertNonNegativeNumber(value: unknown, fieldName: string): void {
    if (!this.isFiniteNumber(value) || Number(value) < 0) {
      throw new BadRequestException(`${fieldName} must be zero or greater.`);
    }
  }

  // Used for optional latitude and longitude when provided.
  private assertFiniteNumber(value: unknown, fieldName: string): void {
    if (!this.isFiniteNumber(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number.`);
    }
  }

  // Rejects empty route/location names before they reach the algorithm.
  private assertNonEmptyString(value: unknown, fieldName: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string.`);
    }
  }

  // Travel style must match one of the configured cost profiles.
  private assertTravelStyle(value: unknown): TravelStyle {
    if (!TRAVEL_STYLES.includes(value as TravelStyle)) {
      throw new BadRequestException(
        `travelStyle must be one of: ${TRAVEL_STYLES.join(', ')}.`,
      );
    }

    return value as TravelStyle;
  }

  // Transport style is validated even though routeSegments already contain transport cost.
  private assertTransportationStyle(value: unknown): TransportationStyle {
    if (!TRANSPORTATION_STYLES.includes(value as TransportationStyle)) {
      throw new BadRequestException(
        `transportationStyle must be one of: ${TRANSPORTATION_STYLES.join(', ')}.`,
      );
    }

    return value as TransportationStyle;
  }

  // Province is optional; when given it must match a configured pricing group.
  private assertProvince(value: unknown): Province | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (!PROVINCES.includes(value as Province)) {
      throw new BadRequestException(
        `province must be one of: ${PROVINCES.join(', ')}.`,
      );
    }

    return value as Province;
  }

  // Shared primitive check for all numeric validation helpers.
  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
