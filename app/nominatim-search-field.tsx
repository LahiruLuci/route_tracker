"use client";

import { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Crosshair, Search, Check, X, MapPin, AlertCircle } from "lucide-react";

import type { PinTarget, SelectedLocation } from "./location-types";

export type NominatimSearchResult = {
  place_id: number;
  osm_type?: string;
  osm_id?: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type?: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
    [key: string]: string | undefined;
  };
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function toLocation(result: NominatimSearchResult): SelectedLocation {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  const name =
    result.name ||
    result.display_name.split(",")[0]?.trim() ||
    "OpenStreetMap location";

  // Extract structured address components if available
  const addressComponents = result.address
    ? {
        road: result.address.road,
        suburb: result.address.suburb,
        city: result.address.city,
        town: result.address.town,
        village: result.address.village,
        county: result.address.county,
        state: result.address.state,
        postcode: result.address.postcode,
      }
    : undefined;

  return {
    id: `osm-${result.osm_type || "place"}-${result.osm_id || result.place_id}`,
    name,
    address: result.display_name,
    lat,
    lng,
    source: "nominatim",
    osmType: result.osm_type,
    osmId: result.osm_id,
    addressComponents,
  };
}

export function NominatimSearchField({
  id,
  label,
  placeholder,
  icon: Icon,
  selectedLocation,
  pinTarget,
  onSearch,
  onSelect,
  onManualPinStart,
  onManualPinConfirm,
  onManualPinCancel,
  manualPinState,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  icon: IconComponent;
  selectedLocation: SelectedLocation | null;
  pinTarget: PinTarget;
  onSearch: (query: string) => Promise<NominatimSearchResult[]>;
  onSelect: (location: SelectedLocation | null) => void;
  onManualPinStart: (target: PinTarget) => void;
  onManualPinConfirm: (name: string) => void;
  onManualPinCancel: () => void;
  manualPinState: { isActive: boolean; customName: string } | null;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function executeSearch() {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setError("Enter a location name before searching.");
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const nextResults = await onSearch(trimmedQuery);
      setResults(nextResults);

      if (nextResults.length === 0) {
        setError("No Sri Lankan locations found. Try a more specific search or pin the location manually.");
      }
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Location search failed. Try again shortly.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSearchClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    executeSearch();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      executeSearch();
    }
  }

  function handleSelect(result: NominatimSearchResult) {
    const location = toLocation(result);
    onSelect(location);
    setQuery(location.name);
    setResults([]);
    setError("");
  }

  function handleManualPinConfirm() {
    if (manualPinState?.customName.trim()) {
      onManualPinConfirm(manualPinState.customName.trim());
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-slate-800">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            id={id}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onSelect(null);
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || manualPinState?.isActive}
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
        </div>
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={disabled || loading || manualPinState?.isActive}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
        >
          <Search className="size-4" aria-hidden="true" />
          {loading ? "Searching" : "Search"}
        </button>
      </div>

      <button
        type="button"
        disabled={disabled || manualPinState?.isActive}
        onClick={() => onManualPinStart(pinTarget)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        <Crosshair className="size-4" aria-hidden="true" />
        Pin on map
      </button>

      {manualPinState?.isActive && (
        <div className="space-y-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span>Manual pin mode active — adjust marker on map, then enter a name below</span>
          </div>

          <div className="space-y-2">
            <label
              htmlFor={`${id}-custom-name`}
              className="text-xs font-semibold uppercase tracking-wide text-amber-800"
            >
              Custom location name
            </label>
            <input
              id={`${id}-custom-name`}
              type="text"
              value={manualPinState.customName}
              onChange={(e) => onManualPinConfirm(e.target.value)}
              placeholder="e.g., My Office, Warehouse Gate, Customer Site"
              className="h-10 w-full rounded-lg border border-amber-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
              autoFocus
            />
            <p className="text-xs text-amber-700">
              Enter a recognizable name for this location. This will appear on the map marker.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleManualPinConfirm}
              disabled={!manualPinState.customName.trim()}
              className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-amber-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-amber-300 disabled:text-amber-100"
            >
              <Check className="size-4" aria-hidden="true" />
              Confirm
            </button>
            <button
              type="button"
              onClick={onManualPinCancel}
              className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-sm font-semibold text-amber-800 shadow-sm transition hover:bg-amber-50 focus:outline-none focus:ring-4 focus:ring-amber-100"
            >
              <X className="size-4" aria-hidden="true" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedLocation ? (
        <p className="text-xs leading-5 text-emerald-700">
          Selected: {selectedLocation.name}
        </p>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 text-xs leading-5 text-red-600">
          <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {results.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {results.map((result) => (
            <li key={`${result.place_id}-${result.osm_type}-${result.osm_id}`}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="block w-full border-b border-slate-100 px-3 py-3 text-left transition last:border-b-0 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {result.name || result.display_name.split(",")[0]}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500">
                  {result.display_name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
