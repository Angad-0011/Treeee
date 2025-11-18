export enum TreeHealth {
  GOOD = 'Good',
  FAIR = 'Fair',
  CRITICAL = 'Critical',
  DEAD = 'Dead',
}

export enum TreeSpecies {
  OAK = 'Oak',
  MAPLE = 'Maple',
  PINE = 'Pine',
  PALM = 'Palm',
  CHERRY = 'Cherry',
  BIRCH = 'Birch',
  OTHER = 'Other',
  UNKNOWN = 'Unknown',
}

export interface TreeRecord {
  id: string;
  lat: number;
  lng: number;
  species: TreeSpecies;
  condition: TreeHealth;
  dateAdded: string;
  notes?: string;
}

export interface MapLocation {
  lat: number;
  lng: number;
}

export interface FilterState {
  species: TreeSpecies | 'All';
  condition: TreeHealth | 'All';
}