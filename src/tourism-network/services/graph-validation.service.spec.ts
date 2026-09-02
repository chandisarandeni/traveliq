import { GraphValidationService } from './graph-validation.service';
import { GraphService } from './graph.service';
import { TransportCostService } from './transport-cost.service';
import { NodeType } from '../enums/node-type.enum';
import { NetworkNode } from '../interfaces/network-node.interface';

describe('GraphValidationService', () => {
  let graphService: GraphService;
  let validationService: GraphValidationService;

  beforeEach(() => {
    graphService = new GraphService({
      calculateTravelCost: (distanceKm: number, pricePerKm: number) => distanceKm * pricePerKm,
    } as TransportCostService);
    validationService = new GraphValidationService();
  });

  it('returns connected true for a complete directed graph', () => {
    const nodes = createNodes();
    const graph = graphService.buildGraph(nodes, {
      sources_to_targets: nodes.map(() => nodes.map(() => ({ distance: 1000, time: 300 }))),
    }, 120);

    expect(validationService.validateConnectivity(graph.adjacencyMatrix, nodes).connected).toBe(true);
  });

  it('returns connected false when one node is unreachable', () => {
    const nodes = createNodes();
    const adjacencyMatrix = graphService.createAdjacencyMatrix(nodes.length);
    adjacencyMatrix[0][1] = {
      fromNodeId: 'START',
      toNodeId: 'ATT001',
      distanceKm: 1,
      travelTimeMinutes: 5,
      travelTimeHours: 0.08,
      travelCost: 120,
    };

    const result = validationService.validateConnectivity(adjacencyMatrix, nodes);

    expect(result.connected).toBe(false);
    expect(result.unreachableNodes).toContain('ATT002');
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
  ];
}
