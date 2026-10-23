"use client";

import { FormEvent, useRef, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  ArrowDownUp,
  Calculator,
  Download,
  Flag,
  Layers3,
  ListOrdered,
  LocateFixed,
  MapPinned,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Trash2,
  X,
} from "lucide-react";

import {
  DistanceCalculationState,
  DistanceMatrixResult,
  LocationDistance,
  NearestLocations,
  PinTarget,
  SelectedLocation,
  getLocationDisplayLabel,
} from "./location-types";
import {
  NOMINATIM_EMAIL,
  NOMINATIM_ENDPOINT,
  NOMINATIM_SEARCH_PARAMS,
  SRI_LANKA_CENTER,
} from "./map-config";
import {
  NominatimSearchField,
  type NominatimSearchResult,
} from "./nominatim-search-field";
import { OsmMapPanel } from "./osm-map-panel";

const MAX_DESTINATIONS = 20;
const GROUPING_OPTIONS = [5, 10, 20] as const;
const NOMINATIM_MIN_INTERVAL_MS = 1000;

type GroupingDistance = (typeof GROUPING_OPTIONS)[number];
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function locationsMatch(first: SelectedLocation, second: SelectedLocation) {
  if (first.osmType && first.osmId && second.osmType && second.osmId) {
    return first.osmType === second.osmType && first.osmId === second.osmId;
  }

  return (
    first.name.toLowerCase() === second.name.toLowerCase() &&
    Math.abs(first.lat - second.lat) < 0.000001 &&
    Math.abs(first.lng - second.lng) < 0.000001
  );
}

function createManualLocation(lat: number, lng: number, name: string): SelectedLocation {
  return {
    id: `manual-${Date.now()}-${lat.toFixed(6)}-${lng.toFixed(6)}`,
    name,
    address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    lat,
    lng,
    source: "manual",
  };
}

function processDistanceMatrix(matrix: DistanceMatrixResult): {
  pairs: LocationDistance[];
  nearest: NearestLocations[];
} {
  const pairs: LocationDistance[] = [];
  const nearestMap = new Map<string, NearestLocations["nearest"]>();

  const { distances, durations, sources, destinations } = matrix;

  for (let i = 0; i < sources.length; i++) {
    const fromId = sources[i].id;
    const fromName = sources[i].name;
    const fromLat = sources[i].lat;
    const fromLng = sources[i].lng;
    const fromDisplayName = getLocationDisplayLabel({ 
      id: fromId, 
      name: fromName, 
      address: "", 
      lat: fromLat, 
      lng: fromLng, 
      source: "nominatim" 
    });
    const nearestForSource: NearestLocations["nearest"] = [];

    for (let j = 0; j < destinations.length; j++) {
      if (i === j) continue;

      const distance = distances[i]?.[j];
      const duration = durations[i]?.[j];

      if (distance === null || distance === undefined || duration === null || duration === undefined) {
        continue;
      }

      const distanceKm = Number((distance / 1000).toFixed(2));
      const durationMin = Math.round(duration / 60);

      const toId = destinations[j].id;
      const toName = destinations[j].name;
      const toLat = destinations[j].lat;
      const toLng = destinations[j].lng;
      const toDisplayName = getLocationDisplayLabel({ 
        id: toId, 
        name: toName, 
        address: "", 
        lat: toLat, 
        lng: toLng, 
        source: "nominatim" 
      });

      pairs.push({
        from: fromDisplayName,
        to: toDisplayName,
        fromId,
        toId,
        distanceKm,
        durationMin,
        fromLat,
        fromLng,
        toLat,
        toLng,
      });

      nearestForSource.push({
        to: toDisplayName,
        toId,
        distanceKm,
        durationMin,
      });
    }

    nearestForSource.sort((a, b) => a.distanceKm - b.distanceKm);
    nearestMap.set(fromId, nearestForSource);
  }

  const nearest: NearestLocations[] = Array.from(nearestMap.entries()).map(([fromId, nearest]) => {
    const source = sources.find((s) => s.id === fromId);
    const fromDisplayName = source ? getLocationDisplayLabel({ 
      id: source.id, 
      name: source.name, 
      address: "", 
      lat: source.lat, 
      lng: source.lng, 
      source: "nominatim" 
    }) : fromId;
    return {
      from: fromDisplayName,
      fromId,
      nearest,
    };
  });

  return { pairs, nearest };
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

function formatDuration(min: number): string {
  if (min < 60) {
    return `${min} min`;
  }
  const hours = Math.floor(min / 60);
  const minutes = min % 60;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: IconComponent;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function DisabledActionButton({
  icon: Icon,
  children,
}: {
  icon: IconComponent;
  children: ReactNode;
}) {
  const message = "Available in a future stage.";

  return (
    <button
      type="button"
      disabled
      title={message}
      aria-label={`${children} - ${message}`}
      className="flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-400"
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </button>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for future stages
function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: IconComponent;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className="size-4 text-blue-600" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

function DistanceResultsPanel({
  matrix,
  pairs,
  nearest,
}: {
  matrix: DistanceMatrixResult;
  pairs: LocationDistance[];
  nearest: NearestLocations[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Distance Matrix</h3>
        <p className="mt-1 text-xs text-slate-500">
          All pairwise road distances and driving durations
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm" role="table">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-3 py-2 font-semibold text-slate-700">From</th>
                <th className="text-left px-3 py-2 font-semibold text-slate-700">To</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700">Distance</th>
                <th className="text-right px-3 py-2 font-semibold text-slate-700">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pairs.length > 0 ? (
                pairs.map((pair, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-800">{pair.from}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{pair.to}</td>
                    <td className="text-right px-3 py-2 font-mono text-slate-700">{formatDistance(pair.distanceKm)}</td>
                    <td className="text-right px-3 py-2 font-mono text-slate-700">{formatDuration(pair.durationMin)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No distance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Nearest Locations by Road Distance</h3>
        <p className="mt-1 text-xs text-slate-500">
          For each location, destinations sorted by driving distance
        </p>
        <div className="mt-4 space-y-3">
          {nearest.length > 0 ? (
            nearest.map((item) => (
              <div key={item.fromId} className="space-y-2">
                <p className="text-sm font-semibold text-slate-950">{item.from}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {item.nearest.slice(0, 5).map((n, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                    >
                      <p className="font-medium text-slate-800 truncate">{n.to}</p>
                      <p className="flex items-center gap-1 text-slate-600">
                        <span className="font-mono">{formatDistance(n.distanceKm)}</span>
                        <span className="text-slate-400">·</span>
                        <span className="font-mono">{formatDuration(n.durationMin)}</span>
                      </p>
                    </div>
                  ))}
                  {item.nearest.length > 5 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      +{item.nearest.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-500 py-8">No nearest location data available</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Summary</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Total pairs calculated</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{pairs.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Locations in matrix</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{matrix.sources.length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-medium text-slate-500">Calculation method</p>
            <p className="mt-1 text-sm font-semibold text-blue-700">OSRM (OpenStreetMap)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDistanceState({ onCalculate }: { onCalculate: () => void }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <Calculator className="mx-auto size-12 text-slate-300" aria-hidden="true" />
      <h3 className="mt-4 text-base font-semibold text-slate-950">Calculate Road Distances</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
        Add at least two locations (starting point, ending point, or destinations), then click
        Calculate Distances to get real driving distances and durations via OSRM.
      </p>
      <button
        type="button"
        onClick={onCalculate}
        className="mt-6 flex h-11 w-full max-w-xs mx-auto items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
      >
        <Calculator className="size-4" aria-hidden="true" />
        Calculate Distances
      </button>
    </div>
  );
}

function SelectedLocationSummary({
  label,
  location,
  onClear,
}: {
  label: string;
  location: SelectedLocation | null;
  onClear: () => void;
}) {
  if (!location) {
    return null;
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-950">
          {getLocationDisplayLabel(location)}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
          {location.address}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-emerald-100 transition hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100"
        aria-label={`Clear ${label.toLowerCase()}`}
        title={`Clear ${label.toLowerCase()}`}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function RoutePlannerDashboard() {
  const [startingLocation, setStartingLocation] =
    useState<SelectedLocation | null>(null);
  const [endingLocation, setEndingLocation] = useState<SelectedLocation | null>(
    null,
  );
  const [destinationDraft, setDestinationDraft] =
    useState<SelectedLocation | null>(null);
  const [destinations, setDestinations] = useState<SelectedLocation[]>([]);
  const [groupingDistance, setGroupingDistance] =
    useState<GroupingDistance>(10);
  const [message, setMessage] = useState("");
  const [pinTarget, setPinTarget] = useState<PinTarget | null>(null);
  const [manualPin, setManualPin] = useState<{
    isActive: boolean;
    lat: number;
    lng: number;
    customName: string;
    target: PinTarget;
  } | null>(null);
  const [distanceState, setDistanceState] = useState<DistanceCalculationState>({
    isCalculating: false,
    lastCalculatedAt: null,
    matrix: null,
    error: null,
  });
  const lastNominatimRequestAt = useRef(0);

  const destinationsRemaining = MAX_DESTINATIONS - destinations.length;
  const hasAnyLocation =
    Boolean(startingLocation) || Boolean(endingLocation) || destinations.length > 0;

  const allLocations = [
    ...(startingLocation ? [startingLocation] : []),
    ...destinations,
    ...(endingLocation ? [endingLocation] : []),
  ];

  const canCalculateDistances = allLocations.length >= 2;

  function invalidateDistances() {
    setDistanceState({
      isCalculating: false,
      lastCalculatedAt: null,
      matrix: null,
      error: null,
    });
  }

  async function searchNominatim(query: string): Promise<NominatimSearchResult[]> {
    const now = Date.now();
    const elapsed = now - lastNominatimRequestAt.current;

    if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
      const waitMs = Math.ceil((NOMINATIM_MIN_INTERVAL_MS - elapsed) / 100) / 10;
      throw new Error(`Please wait ${waitMs.toFixed(1)}s before searching again.`);
    }

    lastNominatimRequestAt.current = now;

    const params = new URLSearchParams({
      q: query,
      ...NOMINATIM_SEARCH_PARAMS,
    });

    if (NOMINATIM_EMAIL) {
      params.set("email", NOMINATIM_EMAIL);
    }

    const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Nominatim search is unavailable. Try again later.");
    }

    return (await response.json()) as NominatimSearchResult[];
  }

  async function calculateDistances() {
    if (!canCalculateDistances) {
      setDistanceState((prev) => ({
        ...prev,
        error: "At least two locations are required to calculate distances.",
      }));
      return;
    }

    setDistanceState((prev) => ({ ...prev, isCalculating: true, error: null }));

    try {
      const locations = allLocations.map((loc) => ({
        lat: loc.lat,
        lng: loc.lng,
        name: loc.name,
        id: loc.id,
      }));

      const response = await fetch("/api/route-matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const matrix = (await response.json()) as DistanceMatrixResult;
      const { pairs } = processDistanceMatrix(matrix);

      setDistanceState({
        isCalculating: false,
        lastCalculatedAt: Date.now(),
        matrix,
        error: null,
      });

      setMessage(`Calculated ${pairs.length} distance pairs for ${matrix.sources.length} locations.`);
    } catch (error) {
      setDistanceState((prev) => ({
        ...prev,
        isCalculating: false,
        error: error instanceof Error ? error.message : "Failed to calculate distances",
      }));
      setMessage("Distance calculation failed. Check console for details.");
    }
  }

  function addDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!destinationDraft) {
      setMessage("Search and select a result, or pin a destination on the map.");
      return;
    }

    if (destinations.length >= MAX_DESTINATIONS) {
      setMessage("You can add up to 20 destinations.");
      return;
    }

    if (destinations.some((destination) => locationsMatch(destination, destinationDraft))) {
      setMessage("That destination is already in your list.");
      return;
    }

    setDestinations((currentDestinations) => [
      ...currentDestinations,
      destinationDraft,
    ]);
    setDestinationDraft(null);
    setPinTarget(null);
    setMessage("Destination added to the map.");
  }

  function removeDestination(location: SelectedLocation) {
    setDestinations((currentDestinations) =>
      currentDestinations.filter(
        (destination) => !locationsMatch(destination, location),
      ),
    );
    invalidateDistances();
    setMessage("Destination removed.");
  }

  function clearAllLocations() {
    if (!hasAnyLocation && !destinationDraft) {
      return;
    }

    const confirmed = window.confirm(
      "Clear all selected locations, including starting point, ending point, destinations, and draft pin?",
    );

    if (confirmed) {
      setStartingLocation(null);
      setEndingLocation(null);
      setDestinationDraft(null);
      setDestinations([]);
      setPinTarget(null);
      setManualPin(null);
      invalidateDistances();
      setMessage("All locations cleared.");
    }
  }

  function handleManualPinStart(target: PinTarget) {
    setPinTarget(null);
    setManualPin({
      isActive: true,
      lat: SRI_LANKA_CENTER.lat,
      lng: SRI_LANKA_CENTER.lng,
      customName: "",
      target,
    });
    setMessage("Click the map to set the location, then drag to adjust and confirm.");
  }

  function handleMapPin(lat: number, lng: number) {
    // Handle regular pin target (legacy simple pin)
    if (pinTarget === "start") {
      setStartingLocation(createManualLocation(lat, lng, "Starting location"));
      setMessage("Starting location pinned on the map.");
    }

    if (pinTarget === "end") {
      setEndingLocation(createManualLocation(lat, lng, "Ending location"));
      setMessage("Ending location pinned on the map.");
    }

    if (pinTarget === "destination") {
      setDestinationDraft(createManualLocation(lat, lng, "Pinned destination"));
      setMessage("Destination pinned. Add it when ready.");
    }

    invalidateDistances();
    setPinTarget(null);
  }

  function handleManualPinDrag(lat: number, lng: number) {
    setManualPin((prev) => (prev ? { ...prev, lat, lng } : null));
  }

  function handleManualPinClick() {
    // Marker clicked - focus the name input (handled by autoFocus in UI)
    // This function exists for future enhancements like showing a popup
  }

  function handleManualPinConfirm(name: string) {
    if (!manualPin || !name.trim()) return;

    const location = createManualLocation(manualPin.lat, manualPin.lng, name.trim());

    if (manualPin.target === "start") {
      setStartingLocation(location);
      setMessage("Starting location set.");
    } else if (manualPin.target === "end") {
      setEndingLocation(location);
      setMessage("Ending location set.");
    } else if (manualPin.target === "destination") {
      setDestinationDraft(location);
      setMessage("Destination pinned. Add it when ready.");
    }

    invalidateDistances();
    setManualPin(null);
  }

  function handleManualPinCancel() {
    setManualPin(null);
    setMessage("Manual pin cancelled.");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[#081a33] text-white shadow-sm">
                <Route className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  Smart Route Planner
                </h1>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  Plan smarter. Travel efficiently.
                </p>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
              <MapPinned className="size-4" aria-hidden="true" />
              Sri Lanka routing workspace
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(340px,35%)_minmax(0,65%)] lg:items-start">
          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <PanelHeader
              icon={LocateFixed}
              title="Location Management"
              description="Search OpenStreetMap manually or pin locations on the map."
            />

            <div className="mt-6 space-y-5">
              <NominatimSearchField
                id="starting-location"
                label="Starting location"
                selectedLocation={startingLocation}
                onSearch={searchNominatim}
                onSelect={(location) => {
                  setStartingLocation(location);
                  setMessage(location ? "Starting location selected." : "");
                }}
                onManualPinStart={handleManualPinStart}
                onManualPinConfirm={handleManualPinConfirm}
                onManualPinCancel={handleManualPinCancel}
                manualPinState={manualPin?.target === "start" ? { isActive: manualPin.isActive, customName: manualPin.customName } : null}
                pinTarget="start"
                placeholder="Search Colombo Fort, roads, hotels, or addresses"
                icon={Navigation}
              />
              <SelectedLocationSummary
                label="Starting location"
                location={startingLocation}
                onClear={() => {
                  setStartingLocation(null);
                  setMessage("Starting location cleared.");
                }}
              />

              <NominatimSearchField
                id="ending-location"
                label="Ending location (optional)"
                selectedLocation={endingLocation}
                onSearch={searchNominatim}
                onSelect={(location) => {
                  setEndingLocation(location);
                  setMessage(location ? "Ending location selected." : "");
                }}
                onManualPinStart={handleManualPinStart}
                onManualPinConfirm={handleManualPinConfirm}
                onManualPinCancel={handleManualPinCancel}
                manualPinState={manualPin?.target === "end" ? { isActive: manualPin.isActive, customName: manualPin.customName } : null}
                pinTarget="end"
                placeholder="Search Bandaranaike Airport or another endpoint"
                icon={Flag}
              />
              <SelectedLocationSummary
                label="Ending location"
                location={endingLocation}
                onClear={() => {
                  setEndingLocation(null);
                  setMessage("Ending location cleared.");
                }}
              />

              <form className="space-y-3" onSubmit={addDestination}>
                <NominatimSearchField
                  id="destination"
                  label="Add destination"
                  selectedLocation={destinationDraft}
                  onSearch={searchNominatim}
                  onSelect={(location) => {
                    setDestinationDraft(location);
                    setMessage(location ? "Destination selected. Add it when ready." : "");
                  }}
                  onManualPinStart={handleManualPinStart}
                  onManualPinConfirm={handleManualPinConfirm}
                  onManualPinCancel={handleManualPinCancel}
                  manualPinState={manualPin?.target === "destination" ? { isActive: manualPin.isActive, customName: manualPin.customName } : null}
                  pinTarget="destination"
                  placeholder="Search Galle Face Green, roads, businesses..."
                  icon={MapPinned}
                  disabled={destinations.length >= MAX_DESTINATIONS}
                />
                <button
                  type="submit"
                  disabled={!destinationDraft || destinations.length >= MAX_DESTINATIONS}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Location
                </button>
              </form>

              <div
                className="min-h-6 text-sm font-medium text-blue-800"
                role="status"
                aria-live="polite"
              >
                {message}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">
                      Added destinations
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      {destinationsRemaining} slots remaining
                    </p>
                  </div>
                  <span className="rounded-lg bg-white px-3 py-1 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                    {destinations.length}/{MAX_DESTINATIONS}
                  </span>
                </div>

                {destinations.length > 0 ? (
                  <ul className="max-h-72 divide-y divide-slate-200 overflow-y-auto">
                    {destinations.map((destination, index) => (
                      <li
                        key={destination.id}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-blue-700 ring-1 ring-slate-200">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {getLocationDisplayLabel(destination)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {destination.address}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDestination(destination)}
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100"
                          aria-label={`Remove ${destination.name}`}
                          title="Remove destination"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <MapPinned
                      className="mx-auto size-8 text-slate-300"
                      aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-medium text-slate-500">
                      No destinations added yet.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={clearAllLocations}
                disabled={!hasAnyLocation && !destinationDraft}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <X className="size-4" aria-hidden="true" />
                Clear All
              </button>

              <div className="space-y-2">
                <label
                  htmlFor="grouping-distance"
                  className="text-sm font-medium text-slate-800"
                >
                  Nearby grouping distance
                </label>
                <select
                  id="grouping-distance"
                  value={groupingDistance}
                  onChange={(event) =>
                    setGroupingDistance(Number(event.target.value) as GroupingDistance)
                  }
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {GROUPING_OPTIONS.map((distance) => (
                    <option key={distance} value={distance}>
                      {distance} km
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                <DisabledActionButton icon={Layers3}>
                  Group Nearby
                </DisabledActionButton>
                <DisabledActionButton icon={ArrowDownUp}>
                  Optimize Route
                </DisabledActionButton>
                <DisabledActionButton icon={Download}>
                  Download PDF
                </DisabledActionButton>
              </div>
              <p className="text-xs leading-5 text-slate-500">
                Grouping, route optimization, distance calculation, and PDF export
                remain disabled until later stages.
              </p>
              <p className="text-xs leading-5 text-slate-500">
                Search uses the public Nominatim service manually and is limited to
                one request per second. For production volume, configure a dedicated
                geocoder or self-hosted Nominatim instance.
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <OsmMapPanel
              startingLocation={startingLocation}
              endingLocation={endingLocation}
              destinations={destinations}
              pinTarget={pinTarget}
              onMapPin={handleMapPin}
              manualPin={manualPin ? { lat: manualPin.lat, lng: manualPin.lng } : null}
              onManualPinDrag={handleManualPinDrag}
              onManualPinClick={handleManualPinClick}
            />

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <PanelHeader
                  icon={ListOrdered}
                  title="Distance Calculation"
                  description="Calculate real road distances and driving times between selected locations using OSRM."
                />
                <button
                  type="button"
                  onClick={calculateDistances}
                  disabled={!canCalculateDistances || distanceState.isCalculating}
                  className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {distanceState.isCalculating ? (
                    <>
                      <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                      Calculating
                    </>
                  ) : (
                    <>
                      <Calculator className="size-4" aria-hidden="true" />
                      Calculate Distances
                    </>
                  )}
                </button>
              </div>

              {distanceState.error ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                      <X className="size-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-red-800">Distance Calculation Failed</h3>
                      <p className="mt-1 text-sm text-red-700">{distanceState.error}</p>
                      <button
                        type="button"
                        onClick={calculateDistances}
                        disabled={distanceState.isCalculating}
                        className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-red-50"
                      >
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {distanceState.matrix ? (
                <DistanceResultsPanel
                  matrix={distanceState.matrix}
                  pairs={processDistanceMatrix(distanceState.matrix).pairs}
                  nearest={processDistanceMatrix(distanceState.matrix).nearest}
                />
              ) : (
                <EmptyDistanceState onCalculate={calculateDistances} />
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
