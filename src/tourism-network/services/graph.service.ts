import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { NodeType } from '../enums/node-type.enum';
import { NetworkNode } from '../interfaces/network-node.interface';
import { TourismEdge } from '../interfaces/tourism-edge.interface';
import { GeoapifyRouteMatrixResponse } from '../interfaces/geoapify-route-matrix.interface';
import { TourismGraph, TourismGraphMatrix } from '../interfaces/tourism-graph.interface';
import { TransportCostService } from './transport-cost.service';

export interface GraphNodePreparationInput {
  selectedAttractions: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }[];
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
export class GraphService {
  constructor(private readonly transportCostService: TransportCostService) {}

  prepareUniqueNodes(createTourismNetworkDto: GraphNodePreparationInput): NetworkNode[] {
    // ============= Unique Node Preparation =============
    // Array stores ordered graph vertices. Set prevents duplicate vertices in O(1) average checks.
    const nodes: NetworkNode[] = [];
    const uniqueLocationKeys = new Set<string>();
    const uniqueAttractionIds = new Set<string>();

    this.addNodeIfUnique(nodes, uniqueLocationKeys, uniqueAttractionIds, {
      id: 'START',
      name: createTourismNetworkDto.startingLocation.name,
      type: NodeType.START,
      latitude: createTourismNetworkDto.startingLocation.latitude,
      longitude: createTourismNetworkDto.startingLocation.longitude,
    });

    for (const attraction of createTourismNetworkDto.selectedAttractions) {
      this.addNodeIfUnique(nodes, uniqueLocationKeys, uniqueAttractionIds, {
        id: attraction.id,
        name: attraction.name,
        type: NodeType.ATTRACTION,
        latitude: attraction.latitude,
        longitude: attraction.longitude,
      });
    }

    this.addNodeIfUnique(nodes, uniqueLocationKeys, uniqueAttractionIds, {
      id: 'END',
      name: createTourismNetworkDto.endingLocation.name,
      type: NodeType.END,
      latitude: createTourismNetworkDto.endingLocation.latitude,
      longitude: createTourismNetworkDto.endingLocation.longitude,
    });

    if (nodes.length < 2) {
      throw new BadRequestException('At least two unique locations are required to build a tourism network');
    }

    return nodes;
  }

  buildNodeIndexMap(nodes: NetworkNode[]): Map<string, number> {
    // ============= HashMap Index Mapping =============
    // Map stores node ID -> adjacency-matrix index. Average lookup time is approximately O(1).
    const nodeIndexMap = new Map<string, number>();

    nodes.forEach((node, index) => {
      nodeIndexMap.set(node.id, index);
    });

    return nodeIndexMap;
  }

  createAdjacencyMatrix(size: number): TourismGraphMatrix {
    // ============= Adjacency Matrix =============
    // Matrix storage is O(V^2). Direct graph[fromIndex][toIndex] lookup is O(1).
    return Array.from({ length: size }, () => Array<TourismEdge | null>(size).fill(null));
  }

  buildGraph(nodes: NetworkNode[], matrixResult: GeoapifyRouteMatrixResponse, pricePerKm: number): TourismGraph {
    const nodeIndexMap = this.buildNodeIndexMap(nodes);
    const adjacencyMatrix = this.createAdjacencyMatrix(nodes.length);
    const connections: TourismEdge[] = [];

    // ============= Nested Graph Construction Algorithm =============
    // Nested loops process every directed source-destination pair. Time complexity is O(V^2).
    for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
      for (let targetIndex = 0; targetIndex < nodes.length; targetIndex += 1) {
        if (sourceIndex === targetIndex) {
          adjacencyMatrix[sourceIndex][targetIndex] = null;
          continue;
        }

        const matrixValue = matrixResult.sources_to_targets?.[sourceIndex]?.[targetIndex];

        if (!matrixValue) {
          throw new InternalServerErrorException(
            `Missing Geoapify matrix result for ${nodes[sourceIndex].id} -> ${nodes[targetIndex].id}`,
          );
        }

        const distanceKm = this.roundToTwoDecimals(matrixValue.distance / 1000);
        const travelTimeMinutes = this.roundToTwoDecimals(matrixValue.time / 60);
        const travelTimeHours = this.roundToTwoDecimals(matrixValue.time / 3600);
        const travelCost = this.transportCostService.calculateTravelCost(distanceKm, pricePerKm);

        const edge: TourismEdge = {
          fromNodeId: nodes[sourceIndex].id,
          toNodeId: nodes[targetIndex].id,
          distanceKm,
          travelTimeMinutes,
          travelTimeHours,
          travelCost,
        };

        adjacencyMatrix[sourceIndex][targetIndex] = edge;
        connections.push(edge);
      }
    }

    return {
      nodes,
      nodeIndexMap,
      adjacencyMatrix,
      connections,
    };
  }

  rebuildGraphFromConnections(nodes: NetworkNode[], connections: TourismEdge[]): TourismGraph {
    const nodeIndexMap = this.buildNodeIndexMap(nodes);
    const adjacencyMatrix = this.createAdjacencyMatrix(nodes.length);

    for (const connection of connections) {
      const fromIndex = nodeIndexMap.get(connection.fromNodeId);
      const toIndex = nodeIndexMap.get(connection.toNodeId);

      if (fromIndex !== undefined && toIndex !== undefined) {
        adjacencyMatrix[fromIndex][toIndex] = connection;
      }
    }

    return {
      nodes,
      nodeIndexMap,
      adjacencyMatrix,
      connections,
    };
  }

  getConnection(
    graph: TourismGraphMatrix,
    nodeIndexMap: Map<string, number>,
    fromNodeId: string,
    toNodeId: string,
  ): TourismEdge {
    // ============= Matrix Connection Lookup =============
    // Map lookup gives indexes, then adjacency matrix lookup returns the directed edge in O(1).
    const fromIndex = nodeIndexMap.get(fromNodeId);
    const toIndex = nodeIndexMap.get(toNodeId);

    if (fromIndex === undefined) {
      throw new NotFoundException(`Invalid from node ID: ${fromNodeId}`);
    }

    if (toIndex === undefined) {
      throw new NotFoundException(`Invalid to node ID: ${toNodeId}`);
    }

    const connection = graph[fromIndex][toIndex];

    if (!connection) {
      throw new NotFoundException(`Connection not found for ${fromNodeId} -> ${toNodeId}`);
    }

    return connection;
  }

  private addNodeIfUnique(
    nodes: NetworkNode[],
    uniqueLocationKeys: Set<string>,
    uniqueAttractionIds: Set<string>,
    node: NetworkNode,
  ): void {
    const uniqueKey = this.createUniqueLocationKey(node);

    if (node.type === NodeType.ATTRACTION && uniqueAttractionIds.has(node.id)) {
      return;
    }

    if (uniqueLocationKeys.has(uniqueKey)) {
      return;
    }

    if (node.type === NodeType.ATTRACTION) {
      uniqueAttractionIds.add(node.id);
    }

    uniqueLocationKeys.add(uniqueKey);
    nodes.push(node);
  }

  private createUniqueLocationKey(node: NetworkNode): string {
    return `COORDINATE:${node.latitude.toFixed(6)},${node.longitude.toFixed(6)}`;
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
