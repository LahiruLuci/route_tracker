export type SelectedLocationSource = "nominatim" | "manual";

export type SelectedLocation = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  source: SelectedLocationSource;
  osmType?: string;
  osmId?: number;
  // Structured address components from Nominatim (when available)
  addressComponents?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
};

export type PinTarget = "start" | "end" | "destination";

export type ManualPinState = {
  isActive: boolean;
  lat: number;
  lng: number;
  customName: string;
  target: PinTarget;
};

// Distance calculation types for Stage 3
export type DistanceMatrixResult = {
  distances: number[][]; // metres
  durations: number[][]; // seconds
  destinations: { name: string; lat: number; lng: number; id: string }[];
  sources: { name: string; lat: number; lng: number; id: string }[];
};

export type LocationDistance = {
  from: string;
  to: string;
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMin: number;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
};

export type NearestLocations = {
  from: string;
  fromId: string;
  nearest: Array<{
    to: string;
    toId: string;
    distanceKm: number;
    durationMin: number;
  }>;
};

export type DistanceCalculationState = {
  isCalculating: boolean;
  lastCalculatedAt: number | null;
  matrix: DistanceMatrixResult | null;
  error: string | null;
};

/**
 * Extracts a locality identifier from address components.
 * Priority: suburb > city > town > village > county > road > postcode
 */
function extractLocality(components: SelectedLocation["addressComponents"]): string | null {
  if (!components) return null;
  
  return (
    components.suburb ||
    components.city ||
    components.town ||
    components.village ||
    components.county ||
    components.road ||
    components.postcode ||
    null
  );
}

/**
 * Generates a clear display label for a location.
 * Format: "Business Name — Locality" (e.g., "KFC — Maharagama")
 * Falls back to name + short address if no locality found.
 */
export function getLocationDisplayLabel(location: SelectedLocation): string {
  const name = location.name?.trim() || "Unnamed location";
  
  // For manual locations, prefer the custom name with locality if available
  if (location.source === "manual") {
    const locality = extractLocality(location.addressComponents);
    if (locality && !name.toLowerCase().includes(locality.toLowerCase())) {
      return `${name} — ${locality}`;
    }
    return name;
  }
  
  // For Nominatim locations, try to extract a meaningful locality
  const locality = extractLocality(location.addressComponents);
  if (locality && !name.toLowerCase().includes(locality.toLowerCase())) {
    return `${name} — ${locality}`;
  }
  
  // Fallback: use first meaningful part of address
  const addressParts = location.address.split(",").map((p) => p.trim()).filter(Boolean);
  if (addressParts.length > 1) {
    // Use second part (often the suburb/area) as locality
    const fallbackLocality = addressParts[1];
    if (fallbackLocality && !name.toLowerCase().includes(fallbackLocality.toLowerCase())) {
      return `${name} — ${fallbackLocality}`;
    }
  }
  
  return name;
}

/**
 * Generates a short display label for compact spaces (tables, etc.)
 */
export function getLocationShortLabel(location: SelectedLocation): string {
  const fullLabel = getLocationDisplayLabel(location);
  // If label is too long, truncate the locality part
  if (fullLabel.length > 40) {
    const parts = fullLabel.split(" — ");
    if (parts.length === 2) {
      return `${parts[0]} — ${parts[1].slice(0, 20)}…`;
    }
  }
  return fullLabel;
}
