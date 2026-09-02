import { Injectable } from '@nestjs/common';

type CandidatePlan = {
  planId: string;
  interestScore: number;
  totalTravelTime: number;
  daysRequired: number;
  totalCost: number;
  feasible: boolean;
};

type OptimizationPreferences = {
  budget: number;
  tripDuration: number;
  maximumTravelTime: number;

  weights: {
    interest: number;
    budget: number;
    travel: number;
    time: number;
  };
};

@Injectable()
export class GreedyRankingService {
  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private calculateGreedyUtility(
    plan: CandidatePlan,
    preferences: OptimizationPreferences,
  ): number {
    const interest =
      this.clamp(plan.interestScore / 100);

    const budgetRemaining =
      this.clamp(
        1 -
          plan.totalCost /
            preferences.budget,
      );

    const travelEfficiency =
      this.clamp(
        1 -
          plan.totalTravelTime /
            preferences.maximumTravelTime,
      );

    const timeSuitability =
      this.clamp(
        1 -
          Math.abs(
            plan.daysRequired -
              preferences.tripDuration,
          ) /
            preferences.tripDuration,
      );

    const benefit =
      preferences.weights.interest * interest +
      preferences.weights.budget * budgetRemaining +
      preferences.weights.travel * travelEfficiency +
      preferences.weights.time * timeSuitability;

    const resourceUsage =
      plan.totalCost / preferences.budget +
      plan.totalTravelTime / preferences.maximumTravelTime;

    return benefit / (1 + resourceUsage);
  }

  greedyRank(
    plans: CandidatePlan[],
    preferences: OptimizationPreferences,
  ) {
    return plans
      .filter((plan) => plan.feasible)
      .map((plan) => ({
        ...plan,
        greedyUtility:
          this.calculateGreedyUtility(
            plan,
            preferences,
          ),
      }))
      .sort(
        (a, b) =>
          b.greedyUtility -
          a.greedyUtility,
      )
      .map((plan, index) => ({
        ...plan,
        greedyRank: index + 1,
      }));
  }
}