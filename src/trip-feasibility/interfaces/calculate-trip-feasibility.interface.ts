import { CalculateTripItineraryInput } from './calculate-trip-itinerary.interface';
import { TransportationStyle, TravelStyle } from './travel-style.interface';

export interface CalculateTripFeasibilityInput extends CalculateTripItineraryInput {
  // Tourist's full trip budget in LKR.
  totalBudget: number;

  // Amount that must remain available for emergencies.
  minEmergencyReserve: number;

  // Determines food and accommodation cost estimates.
  travelStyle: TravelStyle;

  // Retained because transport cost assumptions may later vary by style.
  transportationStyle: TransportationStyle;
}
