import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TourismNetworkService } from './tourism-network.service';
import { TourismNetworkController } from './tourism-network.controller';
import { TourismNetwork, TourismNetworkSchema } from './schemas/tourism-network.schema';
import { GeoapifyService } from './services/geoapify.service';
import { GraphService } from './services/graph.service';
import { GraphValidationService } from './services/graph-validation.service';
import { TransportCostService } from './services/transport-cost.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: TourismNetwork.name, schema: TourismNetworkSchema }])],
  controllers: [TourismNetworkController],
  providers: [TourismNetworkService, GraphService, GeoapifyService, GraphValidationService, TransportCostService],
})
export class TourismNetworkModule {}
