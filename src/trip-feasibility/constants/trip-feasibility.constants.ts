// All time values in Trip Feasibility are measured in hours.
export const MAX_DAILY_TOURISM_HOURS = 10;

// Default Nest Mongoose injection token for the TripFeasibility model.
export const TRIP_FEASIBILITY_MODEL = 'TripFeasibilityModel';

// Decimal travel times such as 2.5 can create tiny floating point differences.
export const FLOAT_COMPARISON_EPSILON = 0.001;

// Travel style controls estimated daily living costs for the budget phase.
export const TRAVEL_STYLES = ['budget', 'balanced', 'comfort'] as const;

// Transportation style is validated here, but route transport cost still comes from Route Optimization.
export const TRANSPORTATION_STYLES = [
  'private transport',
  'public transport',
] as const;

// Initial LKR estimates. These can later move to database/config when real rates are available.
export const TRAVEL_STYLE_COST_PROFILE = {
  budget: {
    dailyFoodCost: 2000,
    nightlyAccommodationCost: 5000,
  },
  balanced: {
    dailyFoodCost: 3500,
    nightlyAccommodationCost: 9000,
  },
  comfort: {
    dailyFoodCost: 6000,
    nightlyAccommodationCost: 18000,
  },
} as const;

// Optional destination province.
export const PROVINCES = [
  'Western',
  'Southern',
  'Central',
  'Eastern',
  'Uva',
  'Northern',
  'North Central',
  'North Western',
  'Sabaragamuwa',
] as const;

// Multiplier applied to dailyFoodCost and nightlyAccommodationCost when a province is given.
export const PROVINCE_COST_MULTIPLIER = {
  Western: 1.15,
  Southern: 1.12,
  Central: 1.05,
  Eastern: 0.95,
  Uva: 0.95,
  Northern: 0.92,
  'North Central': 0.92,
  'North Western': 0.9,
  Sabaragamuwa: 0.9,
} as const;
