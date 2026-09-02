import { NodeType } from '../enums/node-type.enum';

export interface NetworkNode {
  id: string;
  name: string;
  type: NodeType;
  latitude: number;
  longitude: number;
}
