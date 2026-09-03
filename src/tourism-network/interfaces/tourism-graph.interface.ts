import { NetworkNode } from './network-node.interface';
import { TourismEdge } from './tourism-edge.interface';
import { TransportationMode } from '../enums/transportation-mode.enum';

export type TourismGraphMatrix = (TourismEdge | null)[][];
export type TourismEdgeWeightMetric = 'distanceKm' | 'travelTimeHours' | 'travelCost';

export interface ShortestPathResult {
  algorithm: 'DIJKSTRA';
  metric: TourismEdgeWeightMetric;
  path: string[];
  totalWeight: number;
}

export interface AllPairsShortestPathResult {
  algorithm: 'FLOYD_WARSHALL';
  metric: TourismEdgeWeightMetric;
  nodeIds: string[];
  matrix: number[][];
}

export interface ConnectivityResult {
  connected: boolean;
  totalNodes: number;
  reachableNodes: number;
  unreachableNodes: string[];
}

export interface TourismGraph {
  nodes: NetworkNode[];
  nodeIndexMap: Map<string, number>;
  adjacencyMatrix: TourismGraphMatrix;
  connections: TourismEdge[];
}

export interface TourismNetworkResponse {
  networkId: string;
  candidatePlanId: string;
  preferredTransportation: TransportationMode;
  numberOfNodes: number;
  numberOfConnections: number;
  nodes: NetworkNode[];
  connections: TourismEdge[];
  connectivity: ConnectivityResult;
  connected: boolean;
}
