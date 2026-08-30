import { Module } from '@nestjs/common';
import { TourismNetworkService } from './tourism-network.service';
import { TourismNetworkController } from './tourism-network.controller';

@Module({
  controllers: [TourismNetworkController],
  providers: [TourismNetworkService],
})
export class TourismNetworkModule {}
