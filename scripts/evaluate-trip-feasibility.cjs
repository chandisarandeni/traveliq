const { performance } = require('node:perf_hooks');

let TripFeasibilityService;

try {
  TripFeasibilityService =
    require('../dist/trip-feasibility/trip-feasibility.service.js').TripFeasibilityService;
} catch (error) {
  console.error(
    'Build output not found. Run "npm.cmd run build" before this evaluation script.',
  );
  process.exit(1);
}

const service = new TripFeasibilityService();
const scenarioSizes = [10, 50, 100, 500, 1000, 2500];

console.log('Trip Feasibility Experimental Evaluation');
console.log('Algorithm path: greedy itinerary scheduling + greedy sequential resource allocation');
console.log('');
console.log(
  '| Attractions | Route segments | Avg time (ms) | Days required | Affordable days | First unaffordable day |',
);
console.log(
  '| ---: | ---: | ---: | ---: | ---: | ---: |',
);

for (const size of scenarioSizes) {
  const request = buildFeasibilityRequest(size);
  const repetitions = getRepetitions(size);

  service.calculateFeasibility(request);

  const startedAt = performance.now();

  let result;
  for (let index = 0; index < repetitions; index += 1) {
    result = service.calculateFeasibility(request);
  }

  const averageMs = (performance.now() - startedAt) / repetitions;

  console.log(
    `| ${size} | ${request.optimizedRoute.routeSegments.length} | ${averageMs.toFixed(3)} | ${result.time.daysRequired} | ${result.budget.budgetBreakdown.affordableDays} | ${result.budget.budgetBreakdown.firstUnaffordableDay ?? '-'} |`,
  );
}

function getRepetitions(size) {
  if (size <= 100) {
    return 100;
  }

  if (size <= 1000) {
    return 30;
  }

  return 10;
}

function buildFeasibilityRequest(attractionCount) {
  const selectedAttractions = [];
  const destinations = ['Colombo'];
  const routeSegments = [];

  for (let index = 1; index <= attractionCount; index += 1) {
    const attractionId = `A${String(index).padStart(5, '0')}`;
    const attractionName = `Attraction ${index}`;
    const travelTime = round(0.5 + (index % 5) * 0.25);
    const travelDistance = round(travelTime * 35);
    const travelCost = round(1000 + (index % 4) * 250);
    const from = destinations[destinations.length - 1];

    selectedAttractions.push({
      attractionId,
      attractionName,
      activityCost: 1500 + (index % 3) * 500,
      visitDuration: 1 + (index % 2) * 0.5,
      interestScore: 3 + (index % 3),
    });

    destinations.push(attractionId);
    routeSegments.push({
      from,
      to: attractionId,
      travelTime,
      travelDistance,
      travelCost,
    });
  }

  return {
    tripDuration: Math.ceil(attractionCount / 4) + 5,
    maxDailyTravelTime: 6,
    startingLocation: {
      name: 'Colombo',
    },
    endingLocation: {
      name: `Attraction ${attractionCount}`,
    },
    selectedAttractions,
    optimizedRoute: {
      destinations,
      routeSegments,
      totalTravelTime: round(sum(routeSegments, 'travelTime')),
      totalTravelDistance: round(sum(routeSegments, 'travelDistance')),
      totalTravelCost: round(sum(routeSegments, 'travelCost')),
    },
    totalBudget: attractionCount * 12000,
    minEmergencyReserve: attractionCount * 1000,
    travelStyle: 'balanced',
    transportationStyle: 'private transport',
  };
}

function sum(items, field) {
  return items.reduce((total, item) => total + item[field], 0);
}

function round(value) {
  return Number(value.toFixed(3));
}
