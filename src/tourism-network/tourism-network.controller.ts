import { Body, Controller, Get, Param, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { CreateTourismNetworkDto } from './dto/create-tourism-network.dto';
import { EstimateConnectionDto } from './dto/estimate-connection.dto';
import { TourismNetworkService } from './tourism-network.service';

@Controller('api/tourism-network')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    transform: true,
  }),
)
export class TourismNetworkController {
  constructor(private readonly tourismNetworkService: TourismNetworkService) {}

  @Post()
  create(@Body() createTourismNetworkDto: CreateTourismNetworkDto) {
    return this.tourismNetworkService.create(createTourismNetworkDto);
  }

  @Get(':networkId')
  findOne(@Param('networkId') networkId: string) {
    return this.tourismNetworkService.findOne(networkId);
  }

  @Get(':networkId/connections')
  getConnections(@Param('networkId') networkId: string) {
    return this.tourismNetworkService.getConnections(networkId);
  }

  @Get(':networkId/connection')
  getConnection(@Param('networkId') networkId: string, @Query('from') from: string, @Query('to') to: string) {
    return this.tourismNetworkService.getConnection(networkId, from, to);
  }

  @Post(':networkId/validate')
  validate(@Param('networkId') networkId: string) {
    return this.tourismNetworkService.validate(networkId);
  }

  @Post('estimate')
  estimateConnection(@Body() estimateConnectionDto: EstimateConnectionDto) {
    return this.tourismNetworkService.estimateConnection(estimateConnectionDto);
  }
}
