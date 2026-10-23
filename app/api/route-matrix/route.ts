import { NextRequest, NextResponse } from "next/server";

import { OSRM_TABLE_ENDPOINT, OSRM_DEFAULTS } from "@/app/map-config";

const REQUEST_TIMEOUT_MS = 15000;
const MAX_LOCATIONS = 20;

type Coordinate = { lat: number; lng: number; name: string; id: string };

type OSRMTableResponse = {
  code: string;
  distances: number[][];
  durations: number[][];
  destinations: Array<{ hint: string; distance: number; name: string; location: [number, number] }>;
  sources: Array<{ hint: string; distance: number; name: string; location: [number, number] }>;
  fallback_speed_cells?: number[][];
};

function validateCoordinates(locations: unknown): locations is Coordinate[] {
  if (!Array.isArray(locations) || locations.length < 2 || locations.length > MAX_LOCATIONS) {
    return false;
  }
  return locations.every(
    (loc) =>
      typeof loc === "object" &&
      loc !== null &&
      "lat" in loc &&
      "lng" in loc &&
      "name" in loc &&
      "id" in loc &&
      typeof (loc as Coordinate).lat === "number" &&
      typeof (loc as Coordinate).lng === "number" &&
      typeof (loc as Coordinate).name === "string" &&
      typeof (loc as Coordinate).id === "string" &&
      (loc as Coordinate).lat >= -90 &&
      (loc as Coordinate).lat <= 90 &&
      (loc as Coordinate).lng >= -180 &&
      (loc as Coordinate).lng <= 180 &&
      isFinite((loc as Coordinate).lat) &&
      isFinite((loc as Coordinate).lng),
  );
}

function buildOSRMUrl(locations: Coordinate[]): string {
  const coords = locations.map((loc) => `${loc.lng},${loc.lat}`).join(";");
  const params = new URLSearchParams({
    annotations: OSRM_DEFAULTS.annotations,
    fallback_speed: String(OSRM_DEFAULTS.fallback_speed),
  });
  return `${OSRM_TABLE_ENDPOINT}/${coords}?${params.toString()}`;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locations = body.locations as unknown;

    if (!validateCoordinates(locations)) {
      return NextResponse.json(
        { error: `Invalid coordinates. Provide 2-${MAX_LOCATIONS} locations with valid lat/lng/name.` },
        { status: 400 },
      );
    }

    const url = buildOSRMUrl(locations);
    const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: `Routing service error: ${response.status} ${errorText}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as OSRMTableResponse;

    if (data.code !== "Ok") {
      return NextResponse.json(
        { error: `Routing service returned: ${data.code}` },
        { status: 502 },
      );
    }

    const result = {
      distances: data.distances,
      durations: data.durations,
      destinations: locations.map((loc) => ({ name: loc.name, lat: loc.lat, lng: loc.lng, id: loc.id })),
      sources: locations.map((loc) => ({ name: loc.name, lat: loc.lat, lng: loc.lng, id: loc.id })),
    };

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Routing request timed out" }, { status: 504 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}