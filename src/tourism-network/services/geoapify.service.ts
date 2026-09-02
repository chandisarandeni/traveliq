import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NetworkNode } from '../interfaces/network-node.interface';
import { GeoapifyRouteMatrixResponse } from '../interfaces/geoapify-route-matrix.interface';

interface GeoapifyWaypoint {
  location: [number, number];
}

@Injectable()
export class GeoapifyService {
  constructor(private readonly configService: ConfigService) {}

  async getRouteMatrix(nodes: NetworkNode[], geoapifyMode: string): Promise<GeoapifyRouteMatrixResponse> {
    // ============= Geoapify Route Matrix =============
    // Geoapify expects [longitude, latitude], while our internal nodes store latitude then longitude.
    const waypoints = nodes.map((node) => this.toGeoapifyWaypoint(node));
    const apiKey = this.getRequiredApiKey();
    const url = new URL('https://api.geoapify.com/v1/routematrix');
    url.searchParams.set('apiKey', apiKey);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: geoapifyMode,
          sources: waypoints,
          targets: waypoints,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${responseText}`);
      }

      const matrixResult = (await response.json()) as GeoapifyRouteMatrixResponse;

      if (!Array.isArray(matrixResult.sources_to_targets)) {
        throw new Error('Geoapify response did not include sources_to_targets');
      }

      return matrixResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Geoapify failure';
      throw new ServiceUnavailableException(`Geoapify Route Matrix API request failed: ${message}`);
    }
  }

  private getRequiredApiKey(): string {
    const apiKey = this.configService.get<string>('GEOAPIFY_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('GEOAPIFY_API_KEY is missing in the environment file');
    }

    return apiKey;
  }

  private toGeoapifyWaypoint(node: NetworkNode): GeoapifyWaypoint {
    return {
      location: [node.longitude, node.latitude],
    };
  }
}
