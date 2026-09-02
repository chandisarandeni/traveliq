import {
  PROVINCE_COST_MULTIPLIER,
  TRAVEL_STYLE_COST_PROFILE,
} from '../constants/trip-feasibility.constants';
import { BudgetDay } from '../interfaces/budget-day.interface';
import { BudgetFeasibilityResult } from '../interfaces/budget-feasibility-result.interface';
import { CalculateTripFeasibilityInput } from '../interfaces/calculate-trip-feasibility.interface';
import { ItineraryDay } from '../interfaces/itinerary-day.interface';
import { TimeItineraryResult } from '../interfaces/time-itinerary-result.interface';

type BudgetDayCost = Omit<
  BudgetDay,
  'cumulativeCost' | 'remainingBudgetAfterDay' | 'affordable'
>;

interface BudgetAllocationResult {
  dailyBreakdown: BudgetDay[];
  totalEstimatedCost: number;
  remainingBalance: number;
  affordableDays: number;
  firstUnaffordableDay: number | null;
}

/**
 * Budget feasibility for a generated itinerary.
 *
 * Resource allocation algorithm:
 * - Build a day-cost array from the generated itinerary.
 * - Protect the emergency reserve before allocation.
 * - Greedily allocate the remaining spendable budget in chronological day order.
 * - Track the first day that cannot be fully funded.
 *
 * This works because trip days are mandatory and ordered; a later day cannot be
 * funded meaningfully if an earlier required day is already unaffordable.
 *
 * Complexity: O(d) time and O(d) space, where d is plannedBudgetDays.
 */
export function calculateBudgetFeasibility(
  input: CalculateTripFeasibilityInput,
  timeResult: TimeItineraryResult,
): BudgetFeasibilityResult {
  const costProfile = TRAVEL_STYLE_COST_PROFILE[input.travelStyle];
  const provinceCostMultiplier = input.province
    ? PROVINCE_COST_MULTIPLIER[input.province]
    : 1;
  const dailyFoodCost = Math.round(
    costProfile.dailyFoodCost * provinceCostMultiplier,
  );
  const nightlyAccommodationCost = Math.round(
    costProfile.nightlyAccommodationCost * provinceCostMultiplier,
  );
  const plannedBudgetDays = getPlannedBudgetDays(input, timeResult);
  const accommodationNights = Math.max(plannedBudgetDays - 1, 0);
  const dailyCosts = buildDailyCosts(
    timeResult.itinerary,
    plannedBudgetDays,
    dailyFoodCost,
    nightlyAccommodationCost,
  );
  const totalTravelCost = sumDailyField(dailyCosts, 'travelCost');
  const totalActivityCost = sumDailyField(dailyCosts, 'activityCost');
  const totalFoodCost = dailyFoodCost * plannedBudgetDays;
  const totalAccommodationCost = nightlyAccommodationCost * accommodationNights;
  const spendableBudget = input.totalBudget - input.minEmergencyReserve;
  const allocation = allocateBudgetSequentially(dailyCosts, spendableBudget);
  const failureReasons = buildBudgetFailureReasons(
    input.totalBudget,
    input.minEmergencyReserve,
    allocation.totalEstimatedCost,
    spendableBudget,
    allocation.remainingBalance,
    plannedBudgetDays,
    allocation.affordableDays,
    allocation.firstUnaffordableDay,
  );

  return {
    budgetFeasible: failureReasons.length === 0,
    totalBudget: input.totalBudget,
    minEmergencyReserve: input.minEmergencyReserve,
    budgetBreakdown: {
      travelStyle: input.travelStyle,
      transportationStyle: input.transportationStyle,
      province: input.province,
      provinceCostMultiplier,
      plannedBudgetDays,
      accommodationNights,
      dailyFoodCost,
      nightlyAccommodationCost,
      totalTravelCost,
      totalActivityCost,
      totalFoodCost,
      totalAccommodationCost,
      totalEstimatedCost: allocation.totalEstimatedCost,
      emergencyReserve: input.minEmergencyReserve,
      spendableBudget,
      remainingBalance: allocation.remainingBalance,
      affordableDays: allocation.affordableDays,
      firstUnaffordableDay: allocation.firstUnaffordableDay,
      dailyBreakdown: allocation.dailyBreakdown,
    },
    failureReasons,
  };
}

function getPlannedBudgetDays(
  input: CalculateTripFeasibilityInput,
  timeResult: TimeItineraryResult,
): number {
  // If the route needs extra days, budget for the minimum feasible duration.
  // Otherwise budget for the tourist's full requested trip duration.
  return Math.max(input.tripDuration, timeResult.minimumDaysRequired);
}

function buildDailyCosts(
  itinerary: ItineraryDay[],
  plannedBudgetDays: number,
  dailyFoodCost: number,
  nightlyAccommodationCost: number,
): BudgetDayCost[] {
  const itineraryByDay = new Map<number, ItineraryDay>();

  for (const day of itinerary) {
    itineraryByDay.set(day.dayNumber, day);
  }

  return Array.from({ length: plannedBudgetDays }, (_, index) => {
    const dayNumber = index + 1;
    const itineraryDay = itineraryByDay.get(dayNumber);
    const accommodationCost =
      dayNumber < plannedBudgetDays ? nightlyAccommodationCost : 0;
    const travelCost = itineraryDay?.dailyTravelCost ?? 0;
    const activityCost = itineraryDay?.dailyActivityCost ?? 0;

    return {
      dayNumber,
      foodCost: dailyFoodCost,
      accommodationCost,
      travelCost,
      activityCost,
      totalDayCost:
        dailyFoodCost + accommodationCost + travelCost + activityCost,
    };
  });
}

function allocateBudgetSequentially(
  dailyCosts: BudgetDayCost[],
  spendableBudget: number,
): BudgetAllocationResult {
  let cumulativeCost = 0;
  let remainingBudget = spendableBudget;
  let affordableDays = 0;
  let firstUnaffordableDay: number | null = null;

  const dailyBreakdown = dailyCosts.map((day) => {
    const affordable =
      firstUnaffordableDay === null && remainingBudget >= day.totalDayCost;

    cumulativeCost = roundMoney(cumulativeCost + day.totalDayCost);

    if (affordable) {
      affordableDays += 1;
    } else if (firstUnaffordableDay === null) {
      firstUnaffordableDay = day.dayNumber;
    }

    remainingBudget = roundMoney(remainingBudget - day.totalDayCost);

    return {
      ...day,
      cumulativeCost,
      remainingBudgetAfterDay: remainingBudget,
      affordable,
    };
  });

  return {
    dailyBreakdown,
    totalEstimatedCost: cumulativeCost,
    remainingBalance: remainingBudget,
    affordableDays,
    firstUnaffordableDay,
  };
}

function sumDailyField(
  dailyBreakdown: BudgetDayCost[],
  field: 'travelCost' | 'activityCost',
): number {
  return dailyBreakdown.reduce((total, day) => total + day[field], 0);
}

function buildBudgetFailureReasons(
  totalBudget: number,
  emergencyReserve: number,
  totalEstimatedCost: number,
  spendableBudget: number,
  remainingBalance: number,
  plannedBudgetDays: number,
  affordableDays: number,
  firstUnaffordableDay: number | null,
): string[] {
  const failureReasons: string[] = [];

  if (emergencyReserve > totalBudget) {
    failureReasons.push(
      `The emergency reserve of ${emergencyReserve} LKR is greater than the total budget of ${totalBudget} LKR.`,
    );
  }

  if (totalEstimatedCost > spendableBudget) {
    failureReasons.push(
      `The estimated trip cost is ${totalEstimatedCost} LKR, but only ${spendableBudget} LKR is spendable after keeping the emergency reserve. Short by ${Math.abs(remainingBalance)} LKR. The budget covers ${affordableDays} of ${plannedBudgetDays} planned days; first shortfall occurs on day ${firstUnaffordableDay}.`,
    );
  }

  return failureReasons;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(3));
}
