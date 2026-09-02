import {
  PROVINCES,
  TRANSPORTATION_STYLES,
  TRAVEL_STYLES,
} from '../constants/trip-feasibility.constants';

// Tourist spending style used to estimate food and accommodation.
export type TravelStyle = (typeof TRAVEL_STYLES)[number];

// Tourist transport preference. Transport cost itself is already supplied in route segments.
export type TransportationStyle = (typeof TRANSPORTATION_STYLES)[number];

// Destination province used to adjust food and accommodation rates.
export type Province = (typeof PROVINCES)[number];
