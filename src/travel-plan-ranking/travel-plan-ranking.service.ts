import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

type CandidatePlan = {
  planId: string;
  interestScore: number;
  totalTravelTime: number;
  daysRequired: number;
  totalCost: number;
  feasible: boolean;
};

type RankedPlan = CandidatePlan & {
  interestSatisfaction: number;
  budgetEfficiency: number;
  travelEfficiency: number;
  timeSuitability: number;
  overallScore: number;
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
export class TravelPlanRankingService {
  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private validateWeights(
    preferences: OptimizationPreferences,
  ): void {
    const total =
      preferences.weights.interest +
      preferences.weights.budget +
      preferences.weights.travel +
      preferences.weights.time;

    if (Math.abs(total - 1) > 0.001) {
      throw new BadRequestException(
        'Optimization weights must add up to 1.',
      );
    }
  }

  private calculateInterestSatisfaction(
    interestScore: number,
  ): number {
    return this.clamp(interestScore / 100);
  }

  private calculateBudgetEfficiency(
    totalCost: number,
    budget: number,
  ): number {
    if (totalCost > budget) {
      return 0;
    }

    return this.clamp(
      1 - totalCost / budget,
    );
  }

  private calculateTravelEfficiency(
    travelTime: number,
    maximumTravelTime: number,
  ): number {
    if (travelTime >= maximumTravelTime) {
      return 0;
    }

    return this.clamp(
      1 - travelTime / maximumTravelTime,
    );
  }

  private calculateTimeSuitability(
    daysRequired: number,
    tripDuration: number,
  ): number {
    const difference = Math.abs(
      daysRequired - tripDuration,
    );

    return this.clamp(
      1 - difference / tripDuration,
    );
  }

  private calculateOverallScore(
    plan: CandidatePlan,
    preferences: OptimizationPreferences,
  ) {
    const interest =
      this.calculateInterestSatisfaction(
        plan.interestScore,
      );

    const budget =
      this.calculateBudgetEfficiency(
        plan.totalCost,
        preferences.budget,
      );

    const travel =
      this.calculateTravelEfficiency(
        plan.totalTravelTime,
        preferences.maximumTravelTime,
      );

    const time =
      this.calculateTimeSuitability(
        plan.daysRequired,
        preferences.tripDuration,
      );

    const overallScore =
      preferences.weights.interest * interest +
      preferences.weights.budget * budget +
      preferences.weights.travel * travel +
      preferences.weights.time * time;

    return {
      interestSatisfaction: interest,
      budgetEfficiency: budget,
      travelEfficiency: travel,
      timeSuitability: time,
      overallScore,
    };
  }

  // Linear Search - O(n)
  findBestPlan(
    plans: CandidatePlan[],
    preferences: OptimizationPreferences,
  ): RankedPlan | null {
    if (!Array.isArray(plans)) {
      throw new BadRequestException(
        'candidatePlans must be provided as an array.',
      );
    }

    if (!preferences) {
      throw new BadRequestException(
        'preferences must be provided.',
      );
    }

    this.validateWeights(preferences);

    let bestPlan: RankedPlan | null = null;
    let bestScore = -Infinity;

    for (const plan of plans) {
      if (!plan.feasible) {
        continue;
      }

      const score =
        this.calculateOverallScore(
          plan,
          preferences,
        );

      if (score.overallScore > bestScore) {
        bestScore = score.overallScore;

        bestPlan = {
          ...plan,
          ...score,
        };
      }
    }

    return bestPlan;
  }

  // Sorting - O(n log n)
  rankPlans(
    plans: CandidatePlan[],
    preferences: OptimizationPreferences,
  ) {
    if (!Array.isArray(plans)) {
      throw new BadRequestException(
        'candidatePlans must be provided as an array.',
      );
    }

    if (!preferences) {
      throw new BadRequestException(
        'preferences must be provided.',
      );
    }

    this.validateWeights(preferences);

    const rankedPlans = plans
      .filter((plan) => plan.feasible)

      .map((plan) => {
        const score =
          this.calculateOverallScore(
            plan,
            preferences,
          );

        return {
          ...plan,
          ...score,
        };
      })

      .sort(
        (a, b) =>
          b.overallScore -
          a.overallScore,
      );

    return rankedPlans.map(
      (plan, index) => ({
        ...plan,
        rank: index + 1,
      }),
    );
  }
}