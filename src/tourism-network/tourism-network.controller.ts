import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
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

  @Post('estimate')
  estimateConnection(@Body() estimateConnectionDto: EstimateConnectionDto) {
    return this.tourismNetworkService.estimateConnection(estimateConnectionDto);
  }
}
