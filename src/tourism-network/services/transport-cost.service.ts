import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransportationMode } from '../enums/transportation-mode.enum';

interface TransportationConfig {
  geoapifyMode: string;
  pricePerKm: number;
}

@Injectable()
export class TransportCostService {
  constructor(private readonly configService: ConfigService) {}

  getTransportationConfig(mode: TransportationMode): TransportationConfig {
    // ============= Transportation Mode Mapping =============
    // Business rates are kept separate from the graph algorithms so they can be changed later.
    const transportationConfigs: Record<TransportationMode, TransportationConfig> = {
      [TransportationMode.PRIVATE]: {
        geoapifyMode: 'drive',
        pricePerKm: this.getRequiredRate('PRIVATE_TRANSPORT_PRICE_PER_KM'),
      },
      [TransportationMode.PUBLIC]: {
        geoapifyMode: 'bus',
        pricePerKm: this.getRequiredRate('PUBLIC_TRANSPORT_PRICE_PER_KM'),
      },
    };

    const transportationConfig = transportationConfigs[mode];

    if (!transportationConfig) {
      throw new BadRequestException(`Unsupported transportation mode: ${mode}`);
    }

    return transportationConfig;
  }

  calculateTravelCost(distanceKm: number, pricePerKm: number): number {
    // ============= Travel Cost Algorithm =============
    // Travel Cost = Distance in KM * Price Per KM. This is O(1) for one edge.
    return this.roundToTwoDecimals(distanceKm * pricePerKm);
  }

  private getRequiredRate(environmentKey: string): number {
    const value = this.configService.get<string>(environmentKey);
    const rate = Number(value);

    if (!value || Number.isNaN(rate) || rate < 0) {
      throw new InternalServerErrorException(`Missing or invalid transportation rate: ${environmentKey}`);
    }

    return rate;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
