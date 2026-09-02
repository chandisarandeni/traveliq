# Trip Feasibility: Time, Itinerary, and Budget Feasibility

This module answers two questions:

1. Given selected attractions and an already optimized route, how should the route be split into travel days without exceeding the tourist's maximum daily travel time or the system's maximum realistic daily tourism hours?
2. Can the tourist afford the generated plan while keeping the required emergency reserve untouched?

Ranking and MongoDB persistence are intentionally not implemented in this phase.

## Endpoint

```http
POST /trip-feasibility/itinerary
```

This endpoint receives:

- `tripDuration`: requested trip length in days.
- `maxDailyTravelTime`: tourist's maximum travel hours per day.
- `startingLocation` and `endingLocation`: location names, with optional coordinates.
- `selectedAttractions`: attractions from Attraction Selection.
- `optimizedRoute`: ordered route and route segments from Route Optimization.

```http
POST /trip-feasibility/feasibility
```

This endpoint receives the same itinerary fields plus:

- `totalBudget`: tourist's full available budget in LKR.
- `minEmergencyReserve`: amount that must remain unused.
- `travelStyle`: `budget`, `balanced`, or `comfort`.
- `transportationStyle`: `private transport` or `public transport`.

## Scheduling Flow

1. Validate numeric fields, route continuity, and route totals.
2. Build a `Map` for fast attraction lookup by ID, falling back to name only when names are unique.
3. Put route segments into a `Queue`.
4. Use greedy scheduling:
   - peek at the next route step
   - check whether it fits today
   - dequeue only after it has been scheduled
   - otherwise start a new day and retry the same step
5. Return the generated itinerary even when it needs more days than requested.

`daysRequired` and `minimumDaysRequired` currently mean the same thing: the minimum number of days required by the greedy scheduler under the given limits. The duplicate field keeps the old response compatible while making the meaning clearer for presentations.

## Resource Feasibility Flow

1. Run the time scheduler first.
2. Build a day-cost array using transport, activity, food, and accommodation costs.
3. Protect `minEmergencyReserve` by subtracting it from `totalBudget`.
4. Use a greedy sequential resource allocation algorithm:
   - allocate the spendable budget to day 1 first
   - continue day by day in itinerary order
   - track cumulative cost and remaining budget after each day
   - record the first day where the budget cannot fully cover the required cost
5. Return `budgetFeasible`, `affordableDays`, `firstUnaffordableDay`, and the daily allocation timeline.

This algorithm fits the problem because trip days are mandatory and chronological. If day 2 cannot be funded, later days cannot make the full trip feasible unless more budget is added or the route/style changes.

Current LKR estimates:

- `budget`: 2,000 food per day, 5,000 accommodation per night.
- `balanced`: 3,500 food per day, 9,000 accommodation per night.
- `comfort`: 6,000 food per day, 18,000 accommodation per night.

Accommodation is estimated as `plannedBudgetDays - 1` nights. If the itinerary uses fewer days than the tourist requested, budget is calculated for the full requested duration. If the itinerary requires more days than requested, budget is calculated for the minimum required duration.

## Data Structures

- `Queue<T>` preserves the optimized route order with O(1) enqueue, dequeue, and peek.
- `Map` avoids repeatedly searching selected attractions during scheduling.
- Arrays store itinerary days, destinations, route segments, and failure reasons.
- Resource allocation uses a daily cost array and a greedy chronological pass to show affordability day by day.

## Complexity

Let `n` be the number of route segments.
Let `d` be the number of planned budget days.

- Time scheduling: O(n) time and O(n) space.
- Resource feasibility: O(d) time and O(d) space.

The route order is never changed. The algorithm only partitions that order into feasible days.
