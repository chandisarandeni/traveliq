import { GraphService } from './graph.service';
import { TransportCostService } from './transport-cost.service';
import { NodeType } from '../enums/node-type.enum';
import { TransportationMode } from '../enums/transportation-mode.enum';
import { NetworkNode } from '../interfaces/network-node.interface';
import { GeoapifyRouteMatrixResponse } from '../interfaces/geoapify-route-matrix.interface';

describe('GraphService', () => {
  let graphService: GraphService;

  beforeEach(() => {
    graphService = new GraphService({
      calculateTravelCost: (distanceKm: number, pricePerKm: number) => distanceKm * pricePerKm,
    } as TransportCostService);
  });

  it('creates a 4 x 4 adjacency matrix with null self-connections and 12 directed edges', () => {
    const nodes = createNodes();
    const graph = graphService.buildGraph(nodes, createMatrixResult(nodes.length), 120);

    expect(graph.adjacencyMatrix).toHaveLength(4);
    expect(graph.adjacencyMatrix[0]).toHaveLength(4);
    expect(graph.adjacencyMatrix[0][0]).toBeNull();
    expect(graph.adjacencyMatrix[1][1]).toBeNull();
    expect(graph.connections).toHaveLength(12);
  });

  it('maps ATT001 to the correct adjacency matrix index', () => {
    const nodeIndexMap = graphService.buildNodeIndexMap(createNodes());

    expect(nodeIndexMap.get('ATT001')).toBe(1);
  });

  it('removes duplicate attraction IDs and duplicate coordinates using Set checks', () => {
    const nodes = graphService.prepareUniqueNodes({
      candidatePlanId: 'PLAN001',
      preferredTransportation: TransportationMode.PRIVATE,
      startingLocation: {
        name: 'Start',
        latitude: 7.1,
        longitude: 80.1,
      },
      selectedAttractions: [
        {
          id: 'ATT001',
          name: 'Attraction',
          latitude: 7.2,
          longitude: 80.2,
        },
        {
          id: 'ATT001',
          name: 'Duplicate Attraction ID',
          latitude: 7.3,
          longitude: 80.3,
        },
        {
          id: 'ATT002',
          name: 'Duplicate Coordinate',
          latitude: 7.1,
          longitude: 80.1,
        },
      ],
      endingLocation: {
        name: 'End',
        latitude: 7.4,
        longitude: 80.4,
      },
    });

    expect(nodes.map((node) => node.id)).toEqual(['START', 'ATT001', 'END']);
  });

  it('uses Map lookup and adjacency matrix lookup to return one directed connection', () => {
    const nodes = createNodes();
    const graph = graphService.buildGraph(nodes, createMatrixResult(nodes.length), 120);
    const connection = graphService.getConnection(graph.adjacencyMatrix, graph.nodeIndexMap, 'ATT001', 'ATT002');

    expect(connection.fromNodeId).toBe('ATT001');
    expect(connection.toNodeId).toBe('ATT002');
    expect(connection.distanceKm).toBe(6.8);
  });
});

function createNodes(): NetworkNode[] {
  return [
    {
      id: 'START',
      name: 'Start',
      type: NodeType.START,
      latitude: 7.1,
      longitude: 80.1,
    },
    {
      id: 'ATT001',
      name: 'Temple of the Tooth',
      type: NodeType.ATTRACTION,
      latitude: 7.2,
      longitude: 80.2,
    },
    {
      id: 'ATT002',
      name: 'Peradeniya Botanical Garden',
      type: NodeType.ATTRACTION,
      latitude: 7.3,
      longitude: 80.3,
    },
    {
      id: 'END',
      name: 'End',
      type: NodeType.END,
      latitude: 7.4,
      longitude: 80.4,
    },
  ];
}

function createMatrixResult(size: number): GeoapifyRouteMatrixResponse {
  return {
    sources_to_targets: Array.from({ length: size }, (_, sourceIndex) =>
      Array.from({ length: size }, (_, targetIndex) => ({
        distance: sourceIndex === 1 && targetIndex === 2 ? 6800 : 1000,
        time: sourceIndex === 1 && targetIndex === 2 ? 1200 : 300,
      })),
    ),
  };
}
