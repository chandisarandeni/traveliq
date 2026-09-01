// All time values in Trip Feasibility are measured in hours.
export const MAX_DAILY_TOURISM_HOURS = 10;

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
