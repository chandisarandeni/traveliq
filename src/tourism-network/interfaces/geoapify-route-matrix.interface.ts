export interface GeoapifyMatrixValue {
  distance: number;
  time: number;
}

export interface GeoapifyRouteMatrixResponse {
  sources_to_targets: GeoapifyMatrixValue[][];
}
