import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { NodeType } from '../enums/node-type.enum';
import { NetworkNode } from '../interfaces/network-node.interface';
import { TourismEdge } from '../interfaces/tourism-edge.interface';
import { GeoapifyRouteMatrixResponse } from '../interfaces/geoapify-route-matrix.interface';
import {
  AllPairsShortestPathResult,
  ShortestPathResult,
  TourismEdgeWeightMetric,
  TourismGraph,
  TourismGraphMatrix,
} from '../interfaces/tourism-graph.interface';
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

    // ============= HashSet Data Structure =============
    // Set stores only unique keys, so duplicate location and attraction checks are fast.
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
    // ============= Weighted Directed Graph =============
    // The tourism network is modeled as graph nodes connected by weighted route edges.
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

    // ============= Adjacency Matrix Rebuild =============
    // Existing weighted edges are placed back into their matrix row-column positions.
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
    const fromIndex = this.getRequiredNodeIndex(nodeIndexMap, fromNodeId, 'from');
    const toIndex = this.getRequiredNodeIndex(nodeIndexMap, toNodeId, 'to');
    const connection = graph[fromIndex][toIndex];

    if (!connection) {
      throw new NotFoundException(`Connection not found for ${fromNodeId} -> ${toNodeId}`);
    }

    return connection;
  }

  findShortestPathWithDijkstra(
    graph: TourismGraphMatrix,
    nodeIndexMap: Map<string, number>,
    nodes: NetworkNode[],
    fromNodeId: string,
    toNodeId: string,
    metric: TourismEdgeWeightMetric,
  ): ShortestPathResult {
    // ============= Dijkstra's Algorithm =============
    // Finds the minimum-weight path from one source node to one destination node.
    const sourceIndex = this.getRequiredNodeIndex(nodeIndexMap, fromNodeId, 'from');
    const targetIndex = this.getRequiredNodeIndex(nodeIndexMap, toNodeId, 'to');

    // --------------------- Array Data Structure ------------------
    // These arrays store Dijkstra distances, visited state, and previous-node path links.
    const distances = nodes.map(() => Number.POSITIVE_INFINITY);
    const visited = nodes.map(() => false);
    const previousNodeIndexes = Array<number | null>(nodes.length).fill(null);
    distances[sourceIndex] = 0;

    for (let count = 0; count < nodes.length; count += 1) {
      // --------------------- Dijkstra Minimum Selection ------------------
      // Selects the unvisited node with the smallest known weight.
      const currentIndex = distances.reduce<number | null>(
        (nearestIndex, distance, index) =>
          !visited[index] && (nearestIndex === null || distance < distances[nearestIndex]) ? index : nearestIndex,
        null,
      );

      if (currentIndex === null || !Number.isFinite(distances[currentIndex])) {
        break;
      }

      visited[currentIndex] = true;

      if (currentIndex === targetIndex) {
        break;
      }

      // --------------------- Adjacency Matrix Row Scan ------------------
      // The matrix row gives all outgoing weighted edges for the current node.
      for (let neighborIndex = 0; neighborIndex < graph[currentIndex].length; neighborIndex += 1) {
        const edge = graph[currentIndex][neighborIndex];

        if (!edge || visited[neighborIndex]) {
          continue;
        }

        const candidateDistance = distances[currentIndex] + edge[metric];

        if (candidateDistance < distances[neighborIndex]) {
          distances[neighborIndex] = candidateDistance;
          previousNodeIndexes[neighborIndex] = currentIndex;
        }
      }
    }

    const path = this.rebuildShortestPath(nodes, previousNodeIndexes, targetIndex);

    return {
      algorithm: 'DIJKSTRA',
      metric,
      path,
      totalWeight: this.roundToTwoDecimals(distances[targetIndex]),
    };
  }

  findAllPairsShortestPathsWithFloydWarshall(
    graph: TourismGraphMatrix,
    nodes: NetworkNode[],
    metric: TourismEdgeWeightMetric,
  ): AllPairsShortestPathResult {
    // ============= Floyd-Warshall Algorithm =============
    // Computes the shortest path weight between every pair of tourism locations.
    const shortestPathMatrix = graph.map((row, sourceIndex) =>
      row.map((edge, targetIndex) => {
        if (sourceIndex === targetIndex) {
          return 0;
        }

        return edge ? edge[metric] : Number.POSITIVE_INFINITY;
      }),
    );

    // --------------------- Dynamic Programming ------------------
    // Every node is tested as an intermediate stop between each source and destination.
    for (let intermediateIndex = 0; intermediateIndex < nodes.length; intermediateIndex += 1) {
      for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
        for (let targetIndex = 0; targetIndex < nodes.length; targetIndex += 1) {
          const candidateDistance =
            shortestPathMatrix[sourceIndex][intermediateIndex] +
            shortestPathMatrix[intermediateIndex][targetIndex];

          if (candidateDistance < shortestPathMatrix[sourceIndex][targetIndex]) {
            shortestPathMatrix[sourceIndex][targetIndex] = this.roundToTwoDecimals(candidateDistance);
          }
        }
      }
    }

    return {
      algorithm: 'FLOYD_WARSHALL',
      metric,
      nodeIds: nodes.map((node) => node.id),
      matrix: shortestPathMatrix,
    };
  }

  private addNodeIfUnique(
    nodes: NetworkNode[],
    uniqueLocationKeys: Set<string>,
    uniqueAttractionIds: Set<string>,
    node: NetworkNode,
  ): void {
    const uniqueKey = this.createUniqueLocationKey(node);

    // --------------------- HashSet Duplicate Check ------------------
    // Set.has prevents the same attraction ID from being inserted twice.
    if (node.type === NodeType.ATTRACTION && uniqueAttractionIds.has(node.id)) {
      return;
    }

    // --------------------- HashSet Coordinate Check ------------------
    // Set.has prevents two nodes with the same coordinates from being inserted.
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

  private getRequiredNodeIndex(nodeIndexMap: Map<string, number>, nodeId: string, label: 'from' | 'to'): number {
    // --------------------- HashMap Lookup ------------------
    // Map gives direct access to the adjacency-matrix row or column index.
    const nodeIndex = nodeIndexMap.get(nodeId);

    if (nodeIndex === undefined) {
      throw new NotFoundException(`Invalid ${label} node ID: ${nodeId}`);
    }

    return nodeIndex;
  }

  private rebuildShortestPath(
    nodes: NetworkNode[],
    previousNodeIndexes: (number | null)[],
    targetIndex: number,
  ): string[] {
    // --------------------- Stack-Like Path Rebuild ------------------
    // The path is collected backwards and reversed to produce source -> destination order.
    const path: string[] = [];
    let currentIndex: number | null = targetIndex;

    while (currentIndex !== null) {
      path.push(nodes[currentIndex].name);
      currentIndex = previousNodeIndexes[currentIndex];
    }

    if (path.length === 1 && previousNodeIndexes[targetIndex] === null) {
      throw new NotFoundException(`Path not found to ${nodes[targetIndex].id}`);
    }

    return path.reverse();
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
