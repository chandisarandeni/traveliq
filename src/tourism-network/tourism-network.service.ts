import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CandidatePlanDto, CreateTourismNetworkDto, SelectedAttractionDto } from './dto/create-tourism-network.dto';
import { EstimateConnectionDto } from './dto/estimate-connection.dto';
import { NodeType } from './enums/node-type.enum';
import { TransportationMode } from './enums/transportation-mode.enum';
import { NetworkNode } from './interfaces/network-node.interface';
import { TourismEdge } from './interfaces/tourism-edge.interface';
import { ConnectivityResult, TourismNetworkResponse } from './interfaces/tourism-graph.interface';
import { GeoapifyService } from './services/geoapify.service';
import { GraphService } from './services/graph.service';
import { GraphValidationService } from './services/graph-validation.service';
import { TransportCostService } from './services/transport-cost.service';
import { TourismNetwork, TourismNetworkDocument } from './schemas/tourism-network.schema';

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
    private readonly graphValidationService: GraphValidationService,
    private readonly transportCostService: TransportCostService,
  ) {}

  async create(createTourismNetworkDto: CreateTourismNetworkDto): Promise<TourismNetworkResponse> {
    if (createTourismNetworkDto.candidatePlans?.length) {
      return this.createSingleNetwork(this.normalizeSelectedCandidatePlanRequest(createTourismNetworkDto));
    }

    return this.createSingleNetwork(this.normalizeSinglePlanRequest(createTourismNetworkDto));
  }

  private normalizeSelectedCandidatePlanRequest(createTourismNetworkDto: CreateTourismNetworkDto): NormalizedTourismNetworkInput {
    // ============= Module 4 Selected Plan =============
    // Task 4 sends candidate plans, but Module 3 processes only the selected top-ranked usable plan.
    const candidatePlans = createTourismNetworkDto.candidatePlans ?? [];
    const sortedCandidatePlans = [...candidatePlans].sort(
      (leftPlan, rightPlan) => (leftPlan.rank ?? Number.MAX_SAFE_INTEGER) - (rightPlan.rank ?? Number.MAX_SAFE_INTEGER),
    );

    for (const candidatePlan of sortedCandidatePlans) {
      const selectedAttractions = this.normalizeCandidatePlanAttractions(candidatePlan);

      if (selectedAttractions.length === 0) {
        continue;
      }

      return {
        candidatePlanId: candidatePlan.planId,
        selectedAttractions,
        preferredTransportation: createTourismNetworkDto.preferredTransportation,
        startingLocation: createTourismNetworkDto.startingLocation,
        endingLocation: createTourismNetworkDto.endingLocation,
      };
    }

    throw new BadRequestException('No candidate plan contained usable selected attractions');
  }

  private async createSingleNetwork(createTourismNetworkDto: NormalizedTourismNetworkInput): Promise<TourismNetworkResponse> {
    // ============= Tourism Network Flow =============
    // Module 3 creates and analyses the graph only; final route optimization stays in Module 1.
    const transportationConfig = this.transportCostService.getTransportationConfig(
      createTourismNetworkDto.preferredTransportation,
    );
    const nodes = this.graphService.prepareUniqueNodes(createTourismNetworkDto);
    const matrixResult = await this.geoapifyService.getRouteMatrix(nodes, transportationConfig.geoapifyMode);
    const graph = this.graphService.buildGraph(nodes, matrixResult, transportationConfig.pricePerKm);
    const connectivity = this.graphValidationService.validateConnectivity(graph.adjacencyMatrix, graph.nodes);
    const networkId = this.generateNetworkId();

    const createdNetwork = await this.tourismNetworkModel.create({
      networkId,
      candidatePlanId: createTourismNetworkDto.candidatePlanId,
      preferredTransportation: createTourismNetworkDto.preferredTransportation,
      nodes: graph.nodes,
      connections: graph.connections,
      connected: connectivity.connected,
      totalNodes: connectivity.totalNodes,
      reachableNodes: connectivity.reachableNodes,
      unreachableNodes: connectivity.unreachableNodes,
    });

    return this.toResponse(createdNetwork);
  }

  async findOne(networkId: string): Promise<TourismNetworkResponse> {
    const network = await this.findNetworkOrThrow(networkId);
    return this.toResponse(network);
  }

  async getConnections(networkId: string): Promise<{ networkId: string; connections: TourismEdge[] }> {
    const network = await this.findNetworkOrThrow(networkId);

    return {
      networkId: network.networkId,
      connections: network.connections,
    };
  }

  async getConnection(networkId: string, fromNodeId: string, toNodeId: string) {
    const network = await this.findNetworkOrThrow(networkId);
    const graph = this.graphService.rebuildGraphFromConnections(network.nodes, network.connections);
    const connection = this.graphService.getConnection(graph.adjacencyMatrix, graph.nodeIndexMap, fromNodeId, toNodeId);
    const fromNode = network.nodes.find((node) => node.id === fromNodeId);
    const toNode = network.nodes.find((node) => node.id === toNodeId);

    return {
      networkId,
      from: {
        id: fromNode?.id,
        name: fromNode?.name,
      },
      to: {
        id: toNode?.id,
        name: toNode?.name,
      },
      ...connection,
    };
  }

  async validate(networkId: string): Promise<{ networkId: string } & ConnectivityResult> {
    const network = await this.findNetworkOrThrow(networkId);
    const graph = this.graphService.rebuildGraphFromConnections(network.nodes, network.connections);
    const connectivity = this.graphValidationService.validateConnectivity(graph.adjacencyMatrix, graph.nodes);

    network.connected = connectivity.connected;
    network.totalNodes = connectivity.totalNodes;
    network.reachableNodes = connectivity.reachableNodes;
    network.unreachableNodes = connectivity.unreachableNodes;
    await network.save();

    return {
      networkId,
      ...connectivity,
    };
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

  private normalizeSinglePlanRequest(createTourismNetworkDto: CreateTourismNetworkDto): NormalizedTourismNetworkInput {
    if (!createTourismNetworkDto.candidatePlanId) {
      throw new BadRequestException('candidatePlanId is required when candidatePlans are not provided');
    }

    if (!createTourismNetworkDto.selectedAttractions?.length) {
      throw new BadRequestException('selectedAttractions is required when candidatePlans are not provided');
    }

    const candidatePlanId = createTourismNetworkDto.candidatePlanId;

    return {
      candidatePlanId,
      selectedAttractions: createTourismNetworkDto.selectedAttractions.map((attraction) =>
        this.resolveAttractionCoordinates(attraction, candidatePlanId),
      ),
      preferredTransportation: createTourismNetworkDto.preferredTransportation,
      startingLocation: createTourismNetworkDto.startingLocation,
      endingLocation: createTourismNetworkDto.endingLocation,
    };
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

  private isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private toResponse(network: TourismNetworkDocument): TourismNetworkResponse {
    const connectivity: ConnectivityResult = {
      connected: network.connected,
      totalNodes: network.totalNodes,
      reachableNodes: network.reachableNodes,
      unreachableNodes: network.unreachableNodes,
    };

    return {
      networkId: network.networkId,
      candidatePlanId: network.candidatePlanId,
      preferredTransportation: network.preferredTransportation,
      numberOfNodes: network.nodes.length,
      numberOfConnections: network.connections.length,
      nodes: network.nodes,
      connections: network.connections,
      connectivity,
      connected: connectivity.connected,
    };
  }

  private generateNetworkId(): string {
    return `NET${Date.now()}`;
  }
}
