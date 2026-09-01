import { CalculateTripItineraryDto } from './calculate-trip-itinerary.dto';

export class CalculateTripFeasibilityDto extends CalculateTripItineraryDto {
  // Tourist's full trip budget in LKR.
  totalBudget: number;

  // Minimum reserve that should remain untouched after trip spending.
  minEmergencyReserve: number;

  // One of: budget, balanced, comfort.
  travelStyle: string;

  // One of: private transport, public transport.
  transportationStyle: string;
}
