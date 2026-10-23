export const SRI_LANKA_CENTER = {
  lat: 7.8731,
  lng: 80.7718,
};

export const SRI_LANKA_BOUNDS = {
  south: 5.85,
  west: 79.45,
  north: 9.95,
  east: 82.1,
};

export const MAP_TILE_PROVIDER = {
  name: "OpenStreetMap",
  url:
    process.env.NEXT_PUBLIC_MAP_TILE_URL ||
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: Number(process.env.NEXT_PUBLIC_MAP_TILE_MAX_ZOOM || 19),
};

export const NOMINATIM_ENDPOINT =
  process.env.NEXT_PUBLIC_NOMINATIM_ENDPOINT ||
  "https://nominatim.openstreetmap.org/search";

export const NOMINATIM_EMAIL =
  process.env.NEXT_PUBLIC_NOMINATIM_EMAIL || "";

// Search parameters for broader coverage of buildings, businesses, roads, addresses
export const NOMINATIM_SEARCH_PARAMS = {
  format: "jsonv2",
  addressdetails: "1",
  countrycodes: "lk",
  limit: "10",
  // Removed bounded=1 and viewbox to allow Nominatim to return all relevant results
  // including named buildings, businesses, shops, factories, offices, and roads
} as const;

// OSRM (Open Source Routing Machine) configuration
// Public demo server: router.project-osrm.org
// Supports table endpoint for distance matrices up to 100 locations
// Rate limited - use responsibly
export const OSRM_ENDPOINT =
  process.env.NEXT_PUBLIC_OSRM_ENDPOINT || "https://router.project-osrm.org";

export const OSRM_TABLE_ENDPOINT = `${OSRM_ENDPOINT}/table/v1/driving`;

export const OSRM_DEFAULTS = {
  annotations: "distance,duration",
  fallback_speed: 30, // km/h for areas with limited road data
} as const;
