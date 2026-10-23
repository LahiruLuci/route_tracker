"use client";

import dynamic from "next/dynamic";
import { Crosshair, MapPinned, MapPin } from "lucide-react";

import type { PinTarget, SelectedLocation } from "./location-types";
import { MAP_TILE_PROVIDER } from "./map-config";

const LeafletRouteMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-50 p-6 text-center sm:min-h-[520px] lg:min-h-[650px]">
      <div>
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm ring-1 ring-slate-200">
          <MapPinned className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-800">
          Loading OpenStreetMap...
        </p>
      </div>
    </div>
  ),
});

export function OsmMapPanel({
  startingLocation,
  endingLocation,
  destinations,
  pinTarget,
  onMapPin,
  manualPin,
  onManualPinDrag,
  onManualPinClick,
}: {
  startingLocation: SelectedLocation | null;
  endingLocation: SelectedLocation | null;
  destinations: SelectedLocation[];
  pinTarget: PinTarget | null;
  onMapPin: (lat: number, lng: number) => void;
  manualPin: { lat: number; lng: number } | null;
  onManualPinDrag: (lat: number, lng: number) => void;
  onManualPinClick: () => void;
}) {
  return (
    <section className="min-h-[460px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:min-h-[560px] sm:p-5 lg:min-h-[690px]">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              OpenStreetMap Preview
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Tiles provided by {MAP_TILE_PROVIDER.name}. No paid map service is required.
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <MapPinned className="size-5" aria-hidden="true" />
          </div>
        </div>

        {pinTarget ? (
          <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <Crosshair className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Click the map to pin the{" "}
              {pinTarget === "start"
                ? "starting location"
                : pinTarget === "end"
                ? "ending location"
                : "destination draft"}
              .
            </p>
          </div>
        ) : null}

        {manualPin ? (
          <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              Drag the marker to adjust position, then confirm or cancel in the location panel.
            </p>
          </div>
        ) : null}

        <LeafletRouteMap
          startingLocation={startingLocation}
          endingLocation={endingLocation}
          destinations={destinations}
          pinTarget={pinTarget}
          onMapPin={onMapPin}
          manualPin={manualPin}
          onManualPinDrag={onManualPinDrag}
          onManualPinClick={onManualPinClick}
        />
      </div>
    </section>
  );
}
