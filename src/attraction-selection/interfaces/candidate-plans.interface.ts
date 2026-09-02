import { SriLankaAttraction } from './attraction-selection.interface';

/**
 * An attraction from the scored candidate pool, enriched with a normalised score.
 *
 * interestScore    — raw score produced by calculateInterestScore() (unbounded sum of weights)
 * normalizedScore  — score rescaled to the 0–10 range within the candidate pool,
 *                    used by the greedy algorithm for fair comparison with diversityContribution
 */
export interface ScoredCandidateAttraction {
  attraction: SriLankaAttraction;
  interestScore: number;
  normalizedScore: number;
}

/**
 * A single generated trip plan with computed scores.
 *
 * planId               — assigned after ranking (e.g. "PLAN-001")
 * rank                 — 1 = best, 2 = second best, …
 * planInterestScore    — average normalised interest score of selected attractions (0–10)
 * diversityScore       — breadth of interest categories covered (0–10)
 * planScore            — weighted combination: (interest × 0.7) + (diversity × 0.3)
 * selectedAttractions  — ordered as selected by the greedy algorithm
 */
export interface TripPlan {
  planId: string;
  rank: number;
  planInterestScore: number;
  diversityScore: number;
  planScore: number;
  selectedAttractions: ScoredCandidateAttraction[];
}

/**
 * A geographic coordinate point with a human-readable name.
 * Used for the trip's starting and ending locations.
 * These values are passed through from the request and forwarded
 * to the route optimisation module — no calculation is done here.
 */
export interface TripLocation {
  name: string;
  latitude: number;
  longitude: number;
}

/**
 * Final API response for the candidate plan generation endpoint.
 *
 * destinationCount        — how many attractions each plan must contain
 *                           (calculated by the other developer's destination-count algorithm)
 * candidatePlans          — up to 5 ranked trip plans (best first)
 * preferredTransportation — echoed from the request (e.g. "private", "public")
 * startingLocation        — echoed from the request; passed on to route optimisation
 * endingLocation          — echoed from the request; passed on to route optimisation
 */
export interface CandidatePlansResult {
  destinationCount: number;
  candidatePlans: TripPlan[];
  preferredTransportation?: string;
  startingLocation?: TripLocation;
  endingLocation?: TripLocation;
}

/**
 * Internal options that control how a single greedy plan is generated.
 * Not exposed in the API response.
 */
export interface PlanGenerationOptions {
  /** Relative weight assigned to the interest score component (0–1) */
  interestWeight: number;
  /** Relative weight assigned to the diversity contribution component (0–1) */
  diversityWeight: number;
  /**
   * Maps attractionId → accumulated penalty count.
   * Penalty multiplier = 1 / (1 + penaltyCount × 0.5).
   * Attractions selected in earlier plans carry higher penalties
   * to encourage variation across the five generated plans.
   */
  frequencyPenalties: Map<string, number>;
  /**
   * If provided, the greedy algorithm pre-selects this attraction
   * as the forced first pick before the normal greedy loop begins.
   * Used by the Plan 4 "different seed" strategy.
   */
  forcedFirstAttractionId?: string;
}
