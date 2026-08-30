import { PartialType } from '@nestjs/mapped-types';
import { CreateTourismNetworkDto } from './create-tourism-network.dto';

export class UpdateTourismNetworkDto extends PartialType(CreateTourismNetworkDto) {}
