"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";

import { MAP_TILE_PROVIDER, SRI_LANKA_CENTER } from "./map-config";
import type { PinTarget, SelectedLocation } from "./location-types";
import { getLocationDisplayLabel } from "./location-types";

type MarkerLocation = {
  role: "start" | "end" | "destination";
  label: string;
  place: SelectedLocation;
};

function createMarkerIcon(role: MarkerLocation["role"], label: string) {
  const color =
    role === "start" ? "#0f766e" : role === "end" ? "#be123c" : "#1d4ed8";

  return L.divIcon({
    className: "route-marker",
    html: `<span style="background:${color}"><b>${label}</b></span>`,
    iconAnchor: [16, 38],
    iconSize: [32, 38],
    popupAnchor: [0, -36],
  });
}

function createTemporaryMarkerIcon() {
  return L.divIcon({
    className: "temporary-marker",
    html: `
      <div style="
        background: #f59e0b;
        border: 3px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        width: 36px;
        height: 36px;
        transform: rotate(-45deg);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" style="transform: rotate(45deg);">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `,
    iconAnchor: [18, 36],
    iconSize: [36, 36],
    popupAnchor: [0, -36],
  });
}

function FitBounds({ locations }: { locations: MarkerLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      map.setView([SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng], 7);
      return;
    }

    const bounds = L.latLngBounds(
      locations.map((location) => [
        location.place.lat,
        location.place.lng,
      ] as LatLngExpression),
    );

    if (locations.length === 1) {
      map.setView(bounds.getCenter(), 14);
    } else {
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 14 });
    }
  }, [locations, map]);

  return null;
}

function MapClickHandler({
  pinTarget,
  onMapPin,
}: {
  pinTarget: PinTarget | null;
  onMapPin: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      if (pinTarget) {
        onMapPin(event.latlng.lat, event.latlng.lng);
      }
    },
  });

  return null;
}

function TemporaryMarker({
  position,
  onDragEnd,
  onClick,
}: {
  position: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
  onClick: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    const icon = createTemporaryMarkerIcon();
    const marker = L.marker(position, {
      icon,
      draggable: true,
      zIndexOffset: 1000,
    }).addTo(map);

    marker.on("dragend", (e) => {
      const latlng = e.target.getLatLng();
      onDragEnd(latlng.lat, latlng.lng);
    });

    marker.on("click", onClick);

    markerRef.current = marker;

    return () => {
      marker.off("dragend");
      marker.off("click");
      map.removeLayer(marker);
      markerRef.current = null;
    };
  }, [map, position, onDragEnd, onClick]);

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    }
  }, [position]);

  return null;
}

export default function LeafletRouteMap({
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
  const markerLocations: MarkerLocation[] = [
    ...(startingLocation
      ? [{ role: "start" as const, label: "S", place: startingLocation }]
      : []),
    ...destinations.map((place, index) => ({
      role: "destination" as const,
      label: String(index + 1),
      place,
    })),
    ...(endingLocation
      ? [{ role: "end" as const, label: "E", place: endingLocation }]
      : []),
  ];

  return (
    <MapContainer
      center={[SRI_LANKA_CENTER.lat, SRI_LANKA_CENTER.lng]}
      zoom={7}
      scrollWheelZoom
      className={`h-full min-h-[420px] w-full sm:min-h-[520px] lg:min-h-[650px] ${
        pinTarget ? "leaflet-crosshair" : ""
      }`}
    >
      <TileLayer
        attribution={MAP_TILE_PROVIDER.attribution}
        maxZoom={MAP_TILE_PROVIDER.maxZoom}
        url={MAP_TILE_PROVIDER.url}
      />
      <MapClickHandler pinTarget={pinTarget} onMapPin={onMapPin} />
      <FitBounds locations={markerLocations} />

      {markerLocations.map((location) => (
        <Marker
          key={`${location.role}-${location.place.id}`}
          icon={createMarkerIcon(location.role, location.label)}
          position={[location.place.lat, location.place.lng]}
        >
          <Popup>
            <div className="max-w-56">
              <p className="font-semibold text-slate-950">
                {location.role === "start"
                  ? "Starting location"
                  : location.role === "end"
                  ? "Ending location"
                  : `Destination ${location.label}`}
              </p>
              <p className="mt-1 font-medium text-slate-800">
                {getLocationDisplayLabel(location.place)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {location.place.address}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {manualPin ? (
        <TemporaryMarker
          position={[manualPin.lat, manualPin.lng]}
          onDragEnd={onManualPinDrag}
          onClick={onManualPinClick}
        />
      ) : null}
    </MapContainer>
  );
}
