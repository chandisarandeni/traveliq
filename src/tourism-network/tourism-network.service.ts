import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CandidatePlanDto, CreateTourismNetworkDto, SelectedAttractionDto } from './dto/create-tourism-network.dto';
import { EstimateConnectionDto } from './dto/estimate-connection.dto';
import { NodeType } from './enums/node-type.enum';
import { TransportationMode } from './enums/transportation-mode.enum';
import { NetworkNode } from './interfaces/network-node.interface';
import { TourismEdge } from './interfaces/tourism-edge.interface';
import { GeoapifyService } from './services/geoapify.service';
import { GraphService } from './services/graph.service';
import { TransportCostService } from './services/transport-cost.service';
import { TourismNetwork, TourismNetworkDocument } from './schemas/tourism-network.schema';

interface RouteOptimizationPlan {
  planId: string;
  startLocation: string;
  endLocation: string;
  locations: string[];
  distanceMatrix: number[][];
  timeMatrix: number[][];
  costMatrix: number[][];
  weights: {
    costWeight: number;
    timeWeight: number;
    distanceWeight: number;
  };
}

export interface RouteOptimizationPlansResponse {
  networkId: string;
  plans: RouteOptimizationPlan[];
}

interface NormalizedTourismNetworkInput {
  candidatePlanId: string;
  selectedAttractions: Required<Pick<SelectedAttractionDto, 'id' | 'name' | 'latitude' | 'longitude'>>[];
  preferredTransportation: TransportationMode;
  startingLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
  endingLocation: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

@Injectable()
export class TourismNetworkService {
  constructor(
    @InjectModel(TourismNetwork.name)
    private readonly tourismNetworkModel: Model<TourismNetworkDocument>,
    private readonly graphService: GraphService,
    private readonly geoapifyService: GeoapifyService,
    private readonly transportCostService: TransportCostService,
  ) {}

  async create(createTourismNetworkDto: CreateTourismNetworkDto): Promise<RouteOptimizationPlansResponse> {
    if (!createTourismNetworkDto.candidatePlans?.length) {
      throw new BadRequestException('candidatePlans are required to generate tourism network matrices');
    }

    return this.createRouteOptimizationPlans(createTourismNetworkDto);
  }

  private async createRouteOptimizationPlans(
    createTourismNetworkDto: CreateTourismNetworkDto,
  ): Promise<RouteOptimizationPlansResponse> {
    // ============= Module 4 To Module 1 Adapter =============
    // Candidate plans are converted into the exact matrix payload consumed by Route Optimization.
    const candidatePlans = createTourismNetworkDto.candidatePlans ?? [];
    const sortedCandidatePlans = [...candidatePlans].sort(
      (leftPlan, rightPlan) => (leftPlan.rank ?? Number.MAX_SAFE_INTEGER) - (rightPlan.rank ?? Number.MAX_SAFE_INTEGER),
    );
    const plans: RouteOptimizationPlan[] = [];

    for (const candidatePlan of sortedCandidatePlans) {
      const normalizedInput = this.normalizeCandidatePlanRequest(createTourismNetworkDto, candidatePlan);

      if (normalizedInput.selectedAttractions.length === 0) {
        continue;
      }

      plans.push(await this.createRouteOptimizationPlan(normalizedInput));
    }

    if (plans.length === 0) {
      throw new BadRequestException('No candidate plan contained usable selected attractions');
    }

    return this.saveRouteOptimizationPlans(createTourismNetworkDto, plans);
  }

  private normalizeCandidatePlanRequest(
    createTourismNetworkDto: CreateTourismNetworkDto,
    candidatePlan: CandidatePlanDto,
  ): NormalizedTourismNetworkInput {
    return {
      candidatePlanId: candidatePlan.planId,
      selectedAttractions: this.normalizeCandidatePlanAttractions(candidatePlan),
      preferredTransportation: createTourismNetworkDto.preferredTransportation,
      startingLocation: createTourismNetworkDto.startingLocation,
      endingLocation: createTourismNetworkDto.endingLocation,
    };
  }

  private async createRouteOptimizationPlan(
    createTourismNetworkDto: NormalizedTourismNetworkInput,
  ): Promise<RouteOptimizationPlan> {
    // ============= Matrix Payload Generation =============
    // A complete graph matrix is built once, then projected into numeric matrices for the next module.
    const transportationConfig = this.transportCostService.getTransportationConfig(
      createTourismNetworkDto.preferredTransportation,
    );
    const nodes = this.graphService.prepareUniqueNodes(createTourismNetworkDto);
    const matrixResult = await this.geoapifyService.getRouteMatrix(nodes, transportationConfig.geoapifyMode);
    const graph = this.graphService.buildGraph(nodes, matrixResult, transportationConfig.pricePerKm);

    return {
      planId: createTourismNetworkDto.candidatePlanId,
      startLocation: createTourismNetworkDto.startingLocation.name,
      endLocation: createTourismNetworkDto.endingLocation.name,
      locations: graph.nodes.map((node) => node.name),
      distanceMatrix: this.createNumericMatrix(graph.nodes, graph.connections, 'distanceKm'),
      timeMatrix: this.createNumericMatrix(graph.nodes, graph.connections, 'travelTimeHours'),
      costMatrix: this.createNumericMatrix(graph.nodes, graph.connections, 'travelCost'),
      weights: {
        costWeight: 0.5,
        timeWeight: 0.3,
        distanceWeight: 0.2,
      },
    };
  }

  private async saveRouteOptimizationPlans(
    createTourismNetworkDto: CreateTourismNetworkDto,
    plans: RouteOptimizationPlan[],
  ): Promise<RouteOptimizationPlansResponse> {
    // ============= Matrix Persistence =============
    // Store the generated Module 1 payload exactly so later debugging can compare API output with DB data.
    const networkId = this.generateMatrixNetworkId();
    const createdNetwork = await this.tourismNetworkModel.create({
      networkId,
      candidatePlanId: 'ROUTE_OPTIMIZATION_PLANS',
      preferredTransportation: createTourismNetworkDto.preferredTransportation,
      nodes: [],
      connections: [],
      connected: true,
      totalNodes: 0,
      reachableNodes: 0,
      unreachableNodes: [],
      routeOptimizationPlans: plans,
    });

    return this.toRouteOptimizationPlansResponse(createdNetwork);
  }

  async findOne(networkId: string): Promise<RouteOptimizationPlansResponse> {
    const network = await this.findNetworkOrThrow(networkId);

    if (!network.routeOptimizationPlans?.length) {
      throw new NotFoundException(`Generated tourism network matrices not found: ${networkId}`);
    }

    return this.toRouteOptimizationPlansResponse(network);
  }

  async estimateConnection(estimateConnectionDto: EstimateConnectionDto) {
    const transportationConfig = this.transportCostService.getTransportationConfig(
      estimateConnectionDto.preferredTransportation,
    );
    const nodes: NetworkNode[] = [
      {
        id: 'FROM',
        name: estimateConnectionDto.from.name,
        type: NodeType.START,
        latitude: estimateConnectionDto.from.latitude,
        longitude: estimateConnectionDto.from.longitude,
      },
      {
        id: 'TO',
        name: estimateConnectionDto.to.name,
        type: NodeType.END,
        latitude: estimateConnectionDto.to.latitude,
        longitude: estimateConnectionDto.to.longitude,
      },
    ];
    const matrixResult = await this.geoapifyService.getRouteMatrix(nodes, transportationConfig.geoapifyMode);
    const graph = this.graphService.buildGraph(nodes, matrixResult, transportationConfig.pricePerKm);
    const connection = this.graphService.getConnection(graph.adjacencyMatrix, graph.nodeIndexMap, 'FROM', 'TO');

    return {
      from: estimateConnectionDto.from.name,
      to: estimateConnectionDto.to.name,
      preferredTransportation: estimateConnectionDto.preferredTransportation,
      distanceKm: connection.distanceKm,
      travelTimeMinutes: connection.travelTimeMinutes,
      travelTimeHours: connection.travelTimeHours,
      pricePerKm: transportationConfig.pricePerKm,
      travelCost: connection.travelCost,
    };
  }

  private async findNetworkOrThrow(networkId: string): Promise<TourismNetworkDocument> {
    const network = await this.tourismNetworkModel.findOne({ networkId }).exec();

    if (!network) {
      throw new NotFoundException(`Tourism network not found: ${networkId}`);
    }

    return network;
  }

  private normalizeCandidatePlanAttractions(
    candidatePlan: CandidatePlanDto,
  ): Required<Pick<SelectedAttractionDto, 'id' | 'name' | 'latitude' | 'longitude'>>[] {
    const selectedAttractions: Required<Pick<SelectedAttractionDto, 'id' | 'name' | 'latitude' | 'longitude'>>[] = [];

    for (const selectedAttraction of candidatePlan.selectedAttractions) {
      if (!this.isObjectRecord(selectedAttraction)) {
        continue;
      }

      const attraction = this.isObjectRecord(selectedAttraction.attraction)
        ? selectedAttraction.attraction
        : selectedAttraction;

      selectedAttractions.push(
        this.resolveAttractionCoordinates(
          {
            id: String(attraction.id ?? ''),
            name: String(attraction.name ?? ''),
            latitude: typeof attraction.latitude === 'number' ? attraction.latitude : undefined,
            longitude: typeof attraction.longitude === 'number' ? attraction.longitude : undefined,
          },
          candidatePlan.planId,
        ),
      );
    }

    return selectedAttractions;
  }

  private resolveAttractionCoordinates(
    attraction: SelectedAttractionDto,
    candidatePlanId: string,
  ): Required<Pick<SelectedAttractionDto, 'id' | 'name' | 'latitude' | 'longitude'>> {
    if (!attraction.id || !attraction.name) {
      throw new BadRequestException(`Invalid attraction data in candidate plan ${candidatePlanId}`);
    }

    const latitude = attraction.latitude;
    const longitude = attraction.longitude;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException(
        `Attraction ${attraction.id} in candidate plan ${candidatePlanId} must include latitude and longitude`,
      );
    }

    return {
      id: attraction.id,
      name: attraction.name,
      latitude,
      longitude,
    };
  }

  private createNumericMatrix(
    nodes: NetworkNode[],
    connections: TourismEdge[],
    metric: keyof Pick<TourismEdge, 'distanceKm' | 'travelTimeHours' | 'travelCost'>,
  ): number[][] {
    // --------------------- Edge Matrix Conversion ------------------
    // Map keeps directed edge lookup stable while the output remains a plain number matrix.
    const connectionMap = new Map<string, TourismEdge>();

    for (const connection of connections) {
      connectionMap.set(this.createConnectionKey(connection.fromNodeId, connection.toNodeId), connection);
    }

    return nodes.map((fromNode) =>
      nodes.map((toNode) => {
        if (fromNode.id === toNode.id) {
          return 0;
        }

        const connection = connectionMap.get(this.createConnectionKey(fromNode.id, toNode.id));

        if (!connection) {
          throw new NotFoundException(`Connection not found for ${fromNode.id} -> ${toNode.id}`);
        }

        return connection[metric];
      }),
    );
  }

  private createConnectionKey(fromNodeId: string, toNodeId: string): string {
    return `${fromNodeId}->${toNodeId}`;
  }

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toRouteOptimizationPlansResponse(network: TourismNetworkDocument): RouteOptimizationPlansResponse {
    // --------------------- Saved Matrix Response ------------------
    // Return the same matrix data that was generated and persisted for this network ID.
    return {
      networkId: network.networkId,
      plans: network.routeOptimizationPlans ?? [],
    };
  }

  private generateMatrixNetworkId(): string {
    return `MATRIX${Date.now()}`;
  }
}
