import { InterestCategory } from '../enums/interest-category.enum';
import {
  ScoredCandidateAttraction,
  TripPlan,
  PlanGenerationOptions,
} from '../interfaces/candidate-plans.interface';
import {
  calculateDiversityScore,
  calculateDiversityContribution,
  calculatePlanSimilarity,
} from './diversity.algorithm';
import { calculatePlanScore } from './plan-ranking.algorithm';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of candidate plans the system will generate and return. */
const MAX_CANDIDATE_PLANS = 5;

/**
 * If two plans share more than this fraction of their attractions they are
 * considered too similar and the newer plan will be retried or discarded.
 *
 * Example: threshold 0.75 means plans sharing 3 out of 4 attractions (75%)
 * will trigger a retry.
 */
const PLAN_SIMILARITY_THRESHOLD = 0.75;

/**
 * How many times the algorithm will attempt to regenerate a plan that is
 * too similar to already-accepted plans before giving up on that slot.
 */
const MAX_SIMILARITY_RETRIES = 3;

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Normalises raw interest scores to the 0–10 scale within the given pool.
 *
 * normalizedScore = (interestScore / maxScoreInPool) × 10
 *
 * If every attraction has a raw score of 0, all normalised scores stay at 0
 * (division-by-zero guard).
 *
 * Complexity: O(N) where N = pool size
 *
 * @param rawPool Attractions with their raw interest scores
 * @returns Same attractions enriched with a normalizedScore field
 */
function normalisePool(
  rawPool: Array<{ attraction: ScoredCandidateAttraction['attraction']; interestScore: number }>,
): ScoredCandidateAttraction[] {
  const maxScore = rawPool.reduce(
    (max, c) => Math.max(max, c.interestScore),
    0,
  );

  return rawPool.map((c) => ({
    attraction: c.attraction,
    interestScore: c.interestScore,
    normalizedScore: maxScore > 0 ? (c.interestScore / maxScore) * 10 : 0,
  }));
}

/**
 * Selects the single best candidate to add next to the growing plan.
 *
 * Selection value formula (evaluated for every unselected candidate):
 *
 *   penaltyMultiplier  = 1 / (1 + frequencyPenalty × 0.5)
 *   effectiveScore     = normalizedScore × penaltyMultiplier
 *   diversityContrib   = new categories added / TOTAL_CATEGORIES × 10
 *   selectionValue     = (effectiveScore × interestWeight)
 *                      + (diversityContrib × diversityWeight)
 *
 * Tie-breaking (deterministic):
 *   1. Higher raw interestScore
 *   2. Lower attraction ID (alphabetical) for a stable order
 *
 * Data structures:
 *   Set<InterestCategory> — O(1) lookup in coveredCategories
 *   Map<string, number>   — O(1) lookup of frequencyPenalties
 *
 * Complexity: O(N × K) where N = remaining candidates,
 *                             K = average categories per attraction
 *
 * @param remaining         Candidates not yet selected in the current plan
 * @param coveredCategories Categories already represented in the current plan
 * @param options           Weights and frequency penalties for this run
 * @returns The best next candidate, or null if the pool is empty
 */
function greedySelectNext(
  remaining: ScoredCandidateAttraction[],
  coveredCategories: Set<InterestCategory>,
  options: PlanGenerationOptions,
): ScoredCandidateAttraction | null {
  if (remaining.length === 0) {
    return null;
  }

  let bestCandidate: ScoredCandidateAttraction | null = null;
  let bestSelectionValue = -Infinity;

  for (const candidate of remaining) {
    const penaltyCount =
      options.frequencyPenalties.get(candidate.attraction.id) ?? 0;
    // Higher penaltyCount → smaller multiplier → lowers effective score
    const penaltyMultiplier = 1 / (1 + penaltyCount * 0.5);

    const effectiveScore = candidate.normalizedScore * penaltyMultiplier;
    const diversityContrib = calculateDiversityContribution(
      candidate,
      coveredCategories,
    );

    const selectionValue =
      effectiveScore * options.interestWeight +
      diversityContrib * options.diversityWeight;

    const isBetter =
      selectionValue > bestSelectionValue ||
      (selectionValue === bestSelectionValue &&
        bestCandidate !== null &&
        (candidate.interestScore > bestCandidate.interestScore ||
          (candidate.interestScore === bestCandidate.interestScore &&
            candidate.attraction.id < bestCandidate.attraction.id)));

    if (isBetter) {
      bestSelectionValue = selectionValue;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

/**
 * Builds one complete trip plan by iterating the greedy selection loop.
 *
 * Algorithm:
 *   1. If options.forcedFirstAttractionId is set and exists in the pool,
 *      pre-select that attraction (Plan 4 "different seed" strategy).
 *   2. Repeat until destinationCount attractions are selected OR pool exhausted:
 *      a. Filter pool to candidates not yet in selectedIds  (Set lookup: O(1))
 *      b. Call greedySelectNext() to pick the best remaining candidate
 *      c. Add selected candidate to the plan; update selectedIds & coveredCategories
 *   3. Return the ordered list of selected attractions.
 *
 * If the pool is exhausted before destinationCount is reached, the partial
 * list is returned. The caller (generateCandidatePlans) detects this and
 * discards invalid plans.
 *
 * Data structures:
 *   Set<string>             — selectedIds, O(1) duplicate check
 *   Set<InterestCategory>   — coveredCategories, O(1) diversity tracking
 *
 * Complexity: O(D × N × K) where D = destinationCount,
 *                                 N = pool size,
 *                                 K = avg categories per attraction
 *
 * @param pool            Full normalised candidate pool
 * @param destinationCount Target number of attractions for this plan
 * @param options         Generation options for this run
 * @returns Ordered array of selected ScoredCandidateAttraction objects
 */
function generateSinglePlan(
  pool: ScoredCandidateAttraction[],
  destinationCount: number,
  options: PlanGenerationOptions,
): ScoredCandidateAttraction[] {
  const selectedIds = new Set<string>();
  const selected: ScoredCandidateAttraction[] = [];
  const coveredCategories = new Set<InterestCategory>();

  // Step 1: Pre-select forced first attraction (Plan 4 seed strategy)
  if (options.forcedFirstAttractionId) {
    const forced = pool.find(
      (c) => c.attraction.id === options.forcedFirstAttractionId,
    );
    if (forced) {
      selected.push(forced);
      selectedIds.add(forced.attraction.id);
      for (const cat of forced.attraction.categories) {
        coveredCategories.add(cat);
      }
    }
  }

  // Step 2: Greedy selection loop
  while (selected.length < destinationCount) {
    const remaining = pool.filter((c) => !selectedIds.has(c.attraction.id));

    if (remaining.length === 0) {
      // Pool exhausted — caller will handle partial plan
      break;
    }

    const next = greedySelectNext(remaining, coveredCategories, options);
    if (!next) {
      break;
    }

    selected.push(next);
    selectedIds.add(next.attraction.id);
    for (const cat of next.attraction.categories) {
      coveredCategories.add(cat);
    }
  }

  return selected;
}

/**
 * Wraps a list of selected attractions into a TripPlan value object.
 * rank and planId are left blank — they are assigned by rankPlans() later.
 */
function buildTripPlan(selected: ScoredCandidateAttraction[]): TripPlan {
  const avgInterestScore =
    selected.length > 0
      ? selected.reduce((sum, c) => sum + c.normalizedScore, 0) /
        selected.length
      : 0;

  const diversityScore = calculateDiversityScore(selected);
  const planScore = calculatePlanScore(avgInterestScore, diversityScore);

  return {
    planId: '',
    rank: 0,
    planInterestScore: Math.round(avgInterestScore * 100) / 100,
    diversityScore: Math.round(diversityScore * 100) / 100,
    planScore,
    selectedAttractions: selected,
  };
}

/**
 * Returns true if newPlanIds shares more than PLAN_SIMILARITY_THRESHOLD
 * fraction of its attractions with any already-accepted plan.
 *
 * Complexity: O(A × D) where A = number of accepted plans, D = attractions per plan
 */
function isTooSimilar(
  newPlanIds: Set<string>,
  acceptedPlans: TripPlan[],
): boolean {
  for (const existing of acceptedPlans) {
    const existingIds = new Set(
      existing.selectedAttractions.map((c) => c.attraction.id),
    );
    const similarity = calculatePlanSimilarity(newPlanIds, existingIds);
    if (similarity > PLAN_SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/**
 * Builds a frequency-penalty Map from the accepted plans so far.
 *
 * An attraction that appeared in K previous plans gets a penalty value of K.
 * This is passed to PlanGenerationOptions.frequencyPenalties so that the
 * greedy algorithm discounts over-represented attractions when building the
 * next plan.
 *
 * Data structures: Map<string, number> — attractionId → penalty count
 * Complexity: O(A × D) where A = accepted plan count, D = destinations per plan
 */
function buildFrequencyPenaltyMap(
  acceptedPlans: TripPlan[],
): Map<string, number> {
  const penaltyMap = new Map<string, number>();
  for (const plan of acceptedPlans) {
    for (const candidate of plan.selectedAttractions) {
      const current = penaltyMap.get(candidate.attraction.id) ?? 0;
      penaltyMap.set(candidate.attraction.id, current + 1);
    }
  }
  return penaltyMap;
}

/**
 * Attempts to generate one valid, distinct plan using the given options.
 *
 * "Valid" means the plan contains exactly destinationCount attractions.
 * "Distinct" means it does not exceed the PLAN_SIMILARITY_THRESHOLD with
 * any already-accepted plan.
 *
 * If the resulting plan is too similar, the function retries (up to
 * MAX_SIMILARITY_RETRIES times) with an escalating penalty that pushes
 * the algorithm away from attractions already used in accepted plans.
 *
 * Returns the TripPlan on success, or null if the plan could not be
 * generated validly within the retry budget.
 *
 * @param pool             Normalised, sorted candidate pool
 * @param destinationCount Number of attractions required per plan
 * @param baseOptions      Generation options for this attempt
 * @param acceptedPlans    Plans already accepted (used for similarity check)
 * @param retryCount       Current retry depth (starts at 0)
 */
function attemptGeneratePlan(
  pool: ScoredCandidateAttraction[],
  destinationCount: number,
  baseOptions: PlanGenerationOptions,
  acceptedPlans: TripPlan[],
  retryCount: number = 0,
): TripPlan | null {
  const selected = generateSinglePlan(pool, destinationCount, baseOptions);

  // Discard partial plans — pool was too small to fill all destinations
  if (selected.length < destinationCount) {
    return null;
  }

  const newPlanIds = new Set(selected.map((c) => c.attraction.id));

  if (!isTooSimilar(newPlanIds, acceptedPlans)) {
    return buildTripPlan(selected);
  }

  // Too similar — retry with escalating penalties if budget allows
  if (retryCount >= MAX_SIMILARITY_RETRIES) {
    return null;
  }

  // Escalate: increase penalties for everything in the existing plans
  const escalatedPenalties = new Map(baseOptions.frequencyPenalties);
  for (const existing of acceptedPlans) {
    for (const candidate of existing.selectedAttractions) {
      const current =
        escalatedPenalties.get(candidate.attraction.id) ?? 0;
      escalatedPenalties.set(
        candidate.attraction.id,
        current + (retryCount + 1) * 2,
      );
    }
  }

  return attemptGeneratePlan(
    pool,
    destinationCount,
    { ...baseOptions, frequencyPenalties: escalatedPenalties },
    acceptedPlans,
    retryCount + 1,
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generates up to MAX_CANDIDATE_PLANS (5) diverse trip plans using a
 * controlled-variation greedy strategy.
 *
 * ─── Pipeline ───────────────────────────────────────────────────────────────
 *
 * 1. Guard: if rawPool.length < destinationCount, no valid plan is possible.
 * 2. Normalise interest scores to 0–10 within the pool.
 * 3. Sort the pool descending by interestScore (deterministic ordering).
 * 4. Run five distinct greedy strategies:
 *
 *    Plan 1 — Standard greedy
 *             interestWeight=0.7, diversityWeight=0.3, no penalties
 *
 *    Plan 2 — Frequency-penalised
 *             Same weights, but attractions from Plan 1 are penalised
 *             to encourage different selections
 *
 *    Plan 3 — Diversity-first
 *             interestWeight=0.5, diversityWeight=0.5, no penalties
 *             Rewards attracting a broader variety of interest categories
 *
 *    Plan 4 — Different seed
 *             Same weights as Plan 1, but the greedy loop is forced to
 *             start with the second-best scored attraction instead of the best
 *
 *    Plan 5 — Combined
 *             Diversity-first weights + frequency penalties from all
 *             previously accepted plans
 *
 * 5. After each attempt:
 *    - Invalid plans (partial) are discarded.
 *    - Plans too similar to existing ones trigger retries with escalated
 *      penalties (up to MAX_SIMILARITY_RETRIES times), then discard.
 *    - Valid, distinct plans are accepted.
 * 6. Return the accepted plans (caller will rank and format them).
 *
 * ─── Data structures ────────────────────────────────────────────────────────
 *   Array<ScoredCandidateAttraction>  — sorted candidate pool
 *   Set<string>                       — per-plan duplicate guard (inside greedy)
 *   Set<InterestCategory>             — per-plan covered-category tracker
 *   Map<string, number>               — attractionFrequency & frequencyPenalties
 *
 * ─── Complexity ─────────────────────────────────────────────────────────────
 *   Time:  O(P × D × N × K)  where P = MAX_CANDIDATE_PLANS (5),
 *                                   D = destinationCount,
 *                                   N = pool size,
 *                                   K = avg categories per attraction
 *   Space: O(N + P × D)      pool + accepted plans
 *
 * @param rawPool         Attractions with raw interest scores (output of other developer's scoring)
 * @param destinationCount How many attractions each plan must contain
 * @returns Array of unranked TripPlan objects (rank/planId assigned by rankPlans())
 */
export function generateCandidatePlans(
  rawPool: Array<{
    attraction: ScoredCandidateAttraction['attraction'];
    interestScore: number;
  }>,
  destinationCount: number,
): TripPlan[] {
  // Guard: cannot build any valid plan
  if (rawPool.length < destinationCount || destinationCount < 1) {
    return [];
  }

  // Normalise scores within the pool (O(N))
  const pool = normalisePool(rawPool);

  // Sort descending by interestScore for deterministic greedy ordering
  const sortedPool = [...pool].sort((a, b) => {
    if (b.interestScore !== a.interestScore) {
      return b.interestScore - a.interestScore;
    }
    // Stable tie-break: lower ID sorts first
    return a.attraction.id.localeCompare(b.attraction.id);
  });

  // ID of the second-best attraction — used as Plan 4's forced seed
  const secondBestId =
    sortedPool.length > 1 ? sortedPool[1].attraction.id : undefined;

  const acceptedPlans: TripPlan[] = [];

  // ── Plan 1: Standard greedy ──────────────────────────────────────────────
  const plan1 = attemptGeneratePlan(sortedPool, destinationCount, {
    interestWeight: 0.7,
    diversityWeight: 0.3,
    frequencyPenalties: new Map(),
  }, acceptedPlans);

  if (plan1) acceptedPlans.push(plan1);
  if (acceptedPlans.length >= MAX_CANDIDATE_PLANS) return acceptedPlans;

  // ── Plan 2: Penalise Plan 1 attractions ──────────────────────────────────
  const plan2 = attemptGeneratePlan(sortedPool, destinationCount, {
    interestWeight: 0.7,
    diversityWeight: 0.3,
    frequencyPenalties: buildFrequencyPenaltyMap(acceptedPlans),
  }, acceptedPlans);

  if (plan2) acceptedPlans.push(plan2);
  if (acceptedPlans.length >= MAX_CANDIDATE_PLANS) return acceptedPlans;

  // ── Plan 3: Diversity-first ───────────────────────────────────────────────
  const plan3 = attemptGeneratePlan(sortedPool, destinationCount, {
    interestWeight: 0.5,
    diversityWeight: 0.5,
    frequencyPenalties: new Map(),
  }, acceptedPlans);

  if (plan3) acceptedPlans.push(plan3);
  if (acceptedPlans.length >= MAX_CANDIDATE_PLANS) return acceptedPlans;

  // ── Plan 4: Different seed ────────────────────────────────────────────────
  const plan4 = attemptGeneratePlan(sortedPool, destinationCount, {
    interestWeight: 0.7,
    diversityWeight: 0.3,
    frequencyPenalties: new Map(),
    forcedFirstAttractionId: secondBestId,
  }, acceptedPlans);

  if (plan4) acceptedPlans.push(plan4);
  if (acceptedPlans.length >= MAX_CANDIDATE_PLANS) return acceptedPlans;

  // ── Plan 5: Combined penalty + diversity-first ───────────────────────────
  const plan5 = attemptGeneratePlan(sortedPool, destinationCount, {
    interestWeight: 0.5,
    diversityWeight: 0.5,
    frequencyPenalties: buildFrequencyPenaltyMap(acceptedPlans),
  }, acceptedPlans);

  if (plan5) acceptedPlans.push(plan5);

  return acceptedPlans;
}
