import { Type } from 'class-transformer';
import { IsEnum, ValidateNested } from 'class-validator';
import { NetworkLocationDto } from './create-tourism-network.dto';
import { TransportationMode } from '../enums/transportation-mode.enum';

export class EstimateConnectionDto {
  @ValidateNested()
  @Type(() => NetworkLocationDto)
  from!: NetworkLocationDto;

  @ValidateNested()
  @Type(() => NetworkLocationDto)
  to!: NetworkLocationDto;

  @IsEnum(TransportationMode)
  preferredTransportation!: TransportationMode;
}
