import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TourismNetworkService } from './tourism-network.service';
import { TourismNetwork } from './schemas/tourism-network.schema';
import { GraphService } from './services/graph.service';
import { GeoapifyService } from './services/geoapify.service';
import { GraphValidationService } from './services/graph-validation.service';
import { TransportCostService } from './services/transport-cost.service';
import { TransportationMode } from './enums/transportation-mode.enum';
import { NodeType } from './enums/node-type.enum';

describe('TourismNetworkService', () => {
  let service: TourismNetworkService;
  let tourismNetworkModel: { create: jest.Mock };
  let graphService: { prepareUniqueNodes: jest.Mock; buildGraph: jest.Mock };

  beforeEach(async () => {
    tourismNetworkModel = {
      create: jest.fn(async (network) => network),
    };
    graphService = {
      prepareUniqueNodes: jest.fn((input) => [
        {
          id: 'START',
          name: input.startingLocation.name,
          type: NodeType.START,
          latitude: input.startingLocation.latitude,
          longitude: input.startingLocation.longitude,
        },
        ...input.selectedAttractions.map((attraction) => ({
          ...attraction,
          type: NodeType.ATTRACTION,
        })),
        {
          id: 'END',
          name: input.endingLocation.name,
          type: NodeType.END,
          latitude: input.endingLocation.latitude,
          longitude: input.endingLocation.longitude,
        },
      ]),
      buildGraph: jest.fn((nodes) => ({
        nodes,
        nodeIndexMap: new Map(),
        adjacencyMatrix: [],
        connections: nodes.flatMap((fromNode, fromIndex) =>
          nodes
            .filter((toNode) => toNode.id !== fromNode.id)
            .map((toNode, toIndex) => ({
              fromNodeId: fromNode.id,
              toNodeId: toNode.id,
              distanceKm: fromIndex + toIndex + 1,
              travelTimeMinutes: (fromIndex + toIndex + 1) * 10,
              travelTimeHours: fromIndex + toIndex + 1,
              travelCost: (fromIndex + toIndex + 1) * 120,
            })),
        ),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TourismNetworkService,
        {
          provide: getModelToken(TourismNetwork.name),
          useValue: tourismNetworkModel,
        },
        {
          provide: GraphService,
          useValue: graphService,
        },
        {
          provide: GeoapifyService,
          useValue: {
            getRouteMatrix: jest.fn(async () => ({ sources_to_targets: [] })),
          },
        },
        {
          provide: GraphValidationService,
          useValue: {
            validateConnectivity: jest.fn(() => ({
              connected: true,
              totalNodes: 6,
              reachableNodes: 6,
              unreachableNodes: [],
            })),
          },
        },
        {
          provide: TransportCostService,
          useValue: {
            getTransportationConfig: jest.fn(() => ({
              geoapifyMode: 'drive',
              pricePerKm: 120,
            })),
          },
        },
      ],
    }).compile();

    service = module.get<TourismNetworkService>(TourismNetworkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates route optimization matrices from every Task 4 candidate plan', async () => {
    const result = await service.create({
      destinationCount: 4,
      preferredTransportation: TransportationMode.PRIVATE,
      startingLocation: {
        name: 'Kandy Railway Station',
        latitude: 7.2906,
        longitude: 80.6337,
      },
      endingLocation: {
        name: 'Kandy City Centre',
        latitude: 7.2921,
        longitude: 80.6378,
      },
      candidatePlans: [
        {
          planId: 'PLAN-001',
          rank: 1,
          planInterestScore: 8,
          diversityScore: 7,
          planScore: 7.7,
          selectedAttractions: [
            {
              attraction: {
                id: 'A01',
                name: 'Sigiriya Rock Fortress',
                categories: ['HISTORY', 'CULTURE', 'NATURE'],
                latitude: 7.957,
                longitude: 80.7603,
              },
              interestScore: 10,
              normalizedScore: 10,
            },
            {
              attraction: {
                id: 'A02',
                name: 'Yala National Park',
                categories: ['WILDLIFE', 'NATURE'],
                latitude: 6.3725,
                longitude: 81.5218,
              },
              interestScore: 9,
              normalizedScore: 9,
            },
            {
              attraction: {
                id: 'A04',
                name: 'Ella Rock',
                categories: ['NATURE', 'SCENIC', 'ADVENTURE'],
                latitude: 6.8562,
                longitude: 81.0466,
              },
              interestScore: 8,
              normalizedScore: 8,
            },
            {
              attraction: {
                id: 'A08',
                name: 'Arugam Bay',
                categories: ['BEACH', 'ADVENTURE'],
                latitude: 6.8415,
                longitude: 81.8344,
              },
              interestScore: 5,
              normalizedScore: 5,
            },
          ],
        },
        {
          planId: 'PLAN-002',
          rank: 2,
          selectedAttractions: [
            {
              attraction: {
                id: 'A03',
                name: 'Temple of the Tooth',
                categories: ['RELIGIOUS', 'CULTURE'],
                latitude: 7.2936,
                longitude: 80.6413,
              },
              interestScore: 3,
              normalizedScore: 3,
            },
          ],
        },
      ],
    });

    expect(result).toEqual(
      expect.objectContaining({
        networkId: expect.stringMatching(/^MATRIX/),
        plans: expect.arrayContaining([
          expect.objectContaining({
            planId: 'PLAN-001',
            startLocation: 'Kandy Railway Station',
            endLocation: 'Kandy City Centre',
            locations: expect.arrayContaining(['Kandy Railway Station', 'Sigiriya Rock Fortress', 'Kandy City Centre']),
            distanceMatrix: expect.any(Array),
            timeMatrix: expect.any(Array),
            costMatrix: expect.any(Array),
            weights: {
              costWeight: 0.5,
              timeWeight: 0.3,
              distanceWeight: 0.2,
            },
          }),
          expect.objectContaining({
            planId: 'PLAN-002',
          }),
        ]),
      }),
    );
    expect(graphService.prepareUniqueNodes).toHaveBeenCalledWith(
      expect.objectContaining({
        candidatePlanId: 'PLAN-001',
        selectedAttractions: expect.arrayContaining([
          expect.objectContaining({
            id: 'A01',
            name: 'Sigiriya Rock Fortress',
            latitude: 7.957,
            longitude: 80.7603,
          }),
        ]),
      }),
    );
    expect(tourismNetworkModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        networkId: expect.stringMatching(/^MATRIX/),
        routeOptimizationPlans: expect.arrayContaining([
          expect.objectContaining({
            planId: 'PLAN-001',
            distanceMatrix: expect.any(Array),
            timeMatrix: expect.any(Array),
            costMatrix: expect.any(Array),
          }),
          expect.objectContaining({
            planId: 'PLAN-002',
          }),
        ]),
      }),
    );
    expect(tourismNetworkModel.create).toHaveBeenCalledWith(
      expect.not.objectContaining({
        candidatePlanId: expect.anything(),
        preferredTransportation: expect.anything(),
        nodes: expect.anything(),
        connections: expect.anything(),
        connected: expect.anything(),
        totalNodes: expect.anything(),
        reachableNodes: expect.anything(),
        unreachableNodes: expect.anything(),
      }),
    );
  });
});
