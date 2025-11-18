import { TreeHealth, TreeSpecies } from './types';

export const DEFAULT_CENTER = {
  lat: 28.6328, // Inner Circle, Connaught Place (Exact point with coverage)
  lng: 77.2197,
};

export const DEFAULT_ZOOM = 16;

export const HEALTH_COLORS: Record<TreeHealth, string> = {
  [TreeHealth.GOOD]: '#22c55e', // Green 500
  [TreeHealth.FAIR]: '#eab308', // Yellow 500
  [TreeHealth.CRITICAL]: '#f97316', // Orange 500
  [TreeHealth.DEAD]: '#ef4444', // Red 500
};

export const SPECIES_OPTIONS = Object.values(TreeSpecies);
export const HEALTH_OPTIONS = Object.values(TreeHealth);

export const STORAGE_KEY = 'canopy_count_data_v1';

export const MAPILLARY_CLIENT_TOKEN = 'MLY|24883643624671444|d1532533f8ee436b9eb5c90d3f7020c2';

// Fallback image for Demo Mode when API key is missing
export const DEMO_STREET_VIEW_IMAGE = "https://images.unsplash.com/photo-1603923407660-227df75338df?q=80&w=2070&auto=format&fit=crop";