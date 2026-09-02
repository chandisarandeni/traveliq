export class LocationDto {
  // Human-readable place name, such as "Colombo" or "Kandy".
  name: string;

  // Optional latitude kept for future integrations; scheduling only needs the name.
  latitude?: number;

  // Optional longitude kept for future integrations; scheduling only needs the name.
  longitude?: number;
}
