import { BudgetBreakdown } from './budget-breakdown.interface';

export interface BudgetFeasibilityResult {
  // True when estimated trip cost fits inside totalBudget after emergency reserve.
  budgetFeasible: boolean;

  // Tourist's full available trip budget in LKR.
  totalBudget: number;

  // Reserve amount that should not be spent.
  minEmergencyReserve: number;

  // Detailed cost explanation.
  budgetBreakdown: BudgetBreakdown;

  // Human-readable reasons when the budget is not feasible.
  failureReasons: string[];
}
