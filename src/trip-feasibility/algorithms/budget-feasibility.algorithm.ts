import { TRAVEL_STYLE_COST_PROFILE } from '../constants/trip-feasibility.constants';
import { BudgetDay } from '../interfaces/budget-day.interface';
import { BudgetFeasibilityResult } from '../interfaces/budget-feasibility-result.interface';
import { CalculateTripFeasibilityInput } from '../interfaces/calculate-trip-feasibility.interface';
import { ItineraryDay } from '../interfaces/itinerary-day.interface';
import { TimeItineraryResult } from '../interfaces/time-itinerary-result.interface';

/**
 * Budget feasibility for a generated itinerary.
 *
 * The time algorithm decides how many days are needed. This budget algorithm
 * then estimates whether the tourist can afford that trip while keeping the
 * emergency reserve untouched.
 */
export function calculateBudgetFeasibility(
  input: CalculateTripFeasibilityInput,
  timeResult: TimeItineraryResult,
): BudgetFeasibilityResult {
  const costProfile = TRAVEL_STYLE_COST_PROFILE[input.travelStyle];
  const plannedBudgetDays = getPlannedBudgetDays(input, timeResult);
  const accommodationNights = Math.max(plannedBudgetDays - 1, 0);
  const dailyBreakdown = buildDailyBreakdown(
    timeResult.itinerary,
    plannedBudgetDays,
    costProfile.dailyFoodCost,
    costProfile.nightlyAccommodationCost,
  );
  const totalTravelCost = sumDailyField(dailyBreakdown, 'travelCost');
  const totalActivityCost = sumDailyField(dailyBreakdown, 'activityCost');
  const totalFoodCost = costProfile.dailyFoodCost * plannedBudgetDays;
  const totalAccommodationCost =
    costProfile.nightlyAccommodationCost * accommodationNights;
  const totalEstimatedCost =
    totalTravelCost +
    totalActivityCost +
    totalFoodCost +
    totalAccommodationCost;
  const spendableBudget = input.totalBudget - input.minEmergencyReserve;
  const remainingBalance = spendableBudget - totalEstimatedCost;
  const failureReasons = buildBudgetFailureReasons(
    input.totalBudget,
    input.minEmergencyReserve,
    totalEstimatedCost,
    spendableBudget,
    remainingBalance,
  );

  return {
    budgetFeasible: failureReasons.length === 0,
    totalBudget: input.totalBudget,
    minEmergencyReserve: input.minEmergencyReserve,
    budgetBreakdown: {
      travelStyle: input.travelStyle,
      transportationStyle: input.transportationStyle,
      plannedBudgetDays,
      accommodationNights,
      dailyFoodCost: costProfile.dailyFoodCost,
      nightlyAccommodationCost: costProfile.nightlyAccommodationCost,
      totalTravelCost,
      totalActivityCost,
      totalFoodCost,
      totalAccommodationCost,
      totalEstimatedCost,
      emergencyReserve: input.minEmergencyReserve,
      spendableBudget,
      remainingBalance,
      dailyBreakdown,
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

function buildDailyBreakdown(
  itinerary: ItineraryDay[],
  plannedBudgetDays: number,
  dailyFoodCost: number,
  nightlyAccommodationCost: number,
): BudgetDay[] {
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

function sumDailyField(
  dailyBreakdown: BudgetDay[],
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
): string[] {
  const failureReasons: string[] = [];

  if (emergencyReserve > totalBudget) {
    failureReasons.push(
      `The emergency reserve of ${emergencyReserve} LKR is greater than the total budget of ${totalBudget} LKR.`,
    );
  }

  if (totalEstimatedCost > spendableBudget) {
    failureReasons.push(
      `The estimated trip cost is ${totalEstimatedCost} LKR, but only ${spendableBudget} LKR is spendable after keeping the emergency reserve. Short by ${Math.abs(remainingBalance)} LKR.`,
    );
  }

  return failureReasons;
}
