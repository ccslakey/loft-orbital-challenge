/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {SatRec} from "satellite.js";

import {getLaunchState} from "./status.js";
import {findNextWindow} from "./windows.js";

/* Row model //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// The derived values the fleet table filters and sorts on; the component builds these from the query result.

export interface FleetRowValues {
  name: string;
  status: string;
  altitude: number | null;
  launchedMs: number | null;
  nextAosMs: number | null;
  constellationId: string | null;
  customerIds: readonly string[];
  payloadCategories: readonly string[];
}

/* Launch age /////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Epoch ms of the launch, or null when the satellite has not actually flown (pending/terminated launch) or the
// date is missing or unparseable.
export const launchedAtMs = (date: string | null | undefined, status: string | null | undefined): number | null => {
  if (!date || getLaunchState(status) !== "nominal") {
    return null;
  }

  const ms = new Date(date).getTime();

  return Number.isNaN(ms) ? null : ms;
};

/* Contact windows ////////////////////////////////////////////////////////////////////////////////////////////////// */

export const CONTACT_HORIZON_HOURS = 24;

export interface FleetStation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface PassWindow {
  aosMs: number;
  losMs: number;
  stationName: string;
  // The pass was still open at the horizon, so losMs is the horizon, not a real loss of signal.
  truncated: boolean;
}

// Every window over the given stations within the horizon, sorted by AOS. Windows from different stations
// may overlap when one orbit crosses several footprints.
export const findContactWindows = (
  satrec: SatRec,
  stations: readonly FleetStation[],
  from: Date,
  horizonHours: number = CONTACT_HORIZON_HOURS,
): PassWindow[] => {
  const horizonEndMs = from.getTime() + horizonHours * 3_600_000;
  const windows: PassWindow[] = [];

  for (const station of stations) {
    let cursorMs = from.getTime();

    while (cursorMs < horizonEndMs) {
      const window = findNextWindow(satrec, station.latitude, station.longitude, new Date(cursorMs), {
        horizonHours: (horizonEndMs - cursorMs) / 3_600_000,
      });

      if (!window) {
        break;
      }

      windows.push({
        aosMs: window.aos.getTime(),
        losMs: window.los.getTime(),
        stationName: station.name,
        truncated: window.truncated,
      });

      if (window.truncated) {
        break;
      }

      // Step past LOS so the scan resumes after this pass instead of refinding it.
      cursorMs = window.los.getTime() + 60_000;
    }
  }

  return windows.sort((a, b) => a.aosMs - b.aosMs);
};

// The next contact: earliest window that has not ended yet (an in-progress pass counts).
export const firstUpcomingWindow = (windows: readonly PassWindow[], nowMs: number): PassWindow | null =>
  windows.find((window) => window.losMs > nowMs) ?? null;

export interface WindowsCacheEntry {
  computedMs: number;
  windows: PassWindow[];
}

export type WindowsCache = Map<string, WindowsCacheEntry>;

const WINDOWS_TTL_MS = 60_000;

// The full-fleet enumeration costs ~200 ms, far too heavy for the 5 s position poll. Entries are keyed by
// TLE + station set; rendering clamps against the current time, so a stale list only misses windows newly
// entering the far end of the horizon until the TTL refreshes it.
export const getCachedWindows = (
  cache: WindowsCache,
  key: string,
  now: Date,
  compute: () => PassWindow[],
  ttlMs: number = WINDOWS_TTL_MS,
): PassWindow[] => {
  const hit = cache.get(key);

  if (hit && now.getTime() - hit.computedMs < ttlMs) {
    return hit.windows;
  }

  const windows = compute();

  cache.set(key, {computedMs: now.getTime(), windows});

  return windows;
};

/* Pass timeline //////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface TimelineSegment {
  // Unit fractions of the now -> horizon axis.
  start: number;
  span: number;
  window: PassWindow;
}

// Windows clamped onto a now -> now+horizon axis; fully elapsed windows drop out.
export const timelineSegments = (
  windows: readonly PassWindow[],
  nowMs: number,
  horizonMs: number,
): TimelineSegment[] => {
  const segments: TimelineSegment[] = [];

  for (const window of windows) {
    const startMs = Math.max(window.aosMs, nowMs);
    const endMs = Math.min(window.losMs, nowMs + horizonMs);

    if (endMs > startMs) {
      segments.push({start: (startMs - nowMs) / horizonMs, span: (endMs - startMs) / horizonMs, window});
    }
  }

  return segments;
};

/* Filtering //////////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface FleetFilters {
  status: string | null;
  constellation: string | null;
  customer: string | null;
  payloadCategory: string | null;
  search: string;
}

export const NO_FILTERS: FleetFilters = {
  status: null,
  constellation: null,
  customer: null,
  payloadCategory: null,
  search: "",
};

export const hasActiveFilters = (filters: FleetFilters): boolean =>
  filters.status !== null ||
  filters.constellation !== null ||
  filters.customer !== null ||
  filters.payloadCategory !== null ||
  filters.search.trim() !== "";

export const filterRows = <T extends FleetRowValues>(rows: readonly T[], filters: FleetFilters): T[] => {
  const search = filters.search.trim().toLowerCase();

  return rows.filter(
    (row) =>
      (filters.status === null || row.status === filters.status) &&
      (filters.constellation === null || row.constellationId === filters.constellation) &&
      (filters.customer === null || row.customerIds.includes(filters.customer)) &&
      (filters.payloadCategory === null || row.payloadCategories.includes(filters.payloadCategory)) &&
      (search === "" || row.name.toLowerCase().includes(search)),
  );
};

/* Sorting ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const FLEET_SORT_FIELDS = ["name", "status", "altitude", "launched", "contact"] as const;

export type FleetSortField = (typeof FLEET_SORT_FIELDS)[number];

export type SortDirection = "asc" | "desc";

const sortValue = (row: FleetRowValues, field: FleetSortField): string | number | null => {
  switch (field) {
    case "name":
      return row.name;
    case "status":
      return row.status;
    case "altitude":
      return row.altitude;
    case "launched":
      return row.launchedMs;
    case "contact":
      return row.nextAosMs;
  }
};

// Rows without a value (no launch, no upcoming contact) sort last in either direction; name breaks ties.
export const sortRows = <T extends FleetRowValues>(
  rows: readonly T[],
  field: FleetSortField,
  direction: SortDirection,
): T[] => {
  const sign = direction === "desc" ? -1 : 1;

  return [...rows].sort((a, b) => {
    const left = sortValue(a, field);
    const right = sortValue(b, field);

    if (left !== right) {
      if (left === null) {
        return 1;
      }

      if (right === null) {
        return -1;
      }

      if (left < right) {
        return -sign;
      }

      if (left > right) {
        return sign;
      }
    }

    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
};

/* URL state //////////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface FleetParams {
  filters: FleetFilters;
  sort: FleetSortField | null;
  direction: SortDirection;
}

const isSortField = (value: string | null): value is FleetSortField =>
  value !== null && (FLEET_SORT_FIELDS as readonly string[]).includes(value);

// Unknown or malformed values are dropped, never thrown on: a stale link degrades to the unfiltered view.
export const readFleetParams = (params: URLSearchParams): FleetParams => {
  const sort = params.get("sort");

  return {
    filters: {
      status: params.get("status"),
      constellation: params.get("constellation"),
      customer: params.get("customer"),
      payloadCategory: params.get("payload"),
      search: params.get("q") ?? "",
    },
    sort: isSortField(sort) ? sort : null,
    direction: params.get("dir") === "desc" ? "desc" : "asc",
  };
};
