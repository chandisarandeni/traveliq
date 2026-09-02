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
        connections: [
          {
            fromNodeId: 'START',
            toNodeId: 'A01',
            distanceKm: 1,
            travelTimeMinutes: 5,
            travelTimeHours: 0.08,
            travelCost: 120,
          },
        ],
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

  it('generates one network from the selected top-ranked Task 4 candidate plan', async () => {
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
          selectedAttractions: ['...'],
        },
      ],
    });

    expect(result.candidatePlanId).toBe('PLAN-001');
    expect(result.networkId).toEqual(expect.stringMatching(/^NET/));
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
    expect(tourismNetworkModel.create).toHaveBeenCalledTimes(1);
  });
});
