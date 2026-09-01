# Trip Feasibility: Time and Itinerary Scheduling

This module answers one question for now:

Given selected attractions and an already optimized route, how should the route be split into travel days without exceeding the tourist's maximum daily travel time or the system's maximum realistic daily tourism hours?

Budget allocation, food, accommodation, emergency reserve, and ranking are intentionally not implemented in this phase.

## Endpoint

```http
POST /trip-feasibility/itinerary
```

The endpoint receives:

- `tripDuration`: requested trip length in days.
- `maxDailyTravelTime`: tourist's maximum travel hours per day.
- `startingLocation` and `endingLocation`: location names, with optional coordinates.
- `selectedAttractions`: attractions from Attraction Selection.
- `optimizedRoute`: ordered route and route segments from Route Optimization.

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

## Data Structures

- `Queue<T>` preserves the optimized route order with O(1) enqueue, dequeue, and peek.
- `Map` avoids repeatedly searching selected attractions during scheduling.
- Arrays store itinerary days, destinations, route segments, and failure reasons.

## Complexity

Let `n` be the number of route segments.

- Time: O(n)
- Space: O(n)

The route order is never changed. The algorithm only partitions that order into feasible days.
