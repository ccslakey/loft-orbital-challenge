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

/* Next contact ///////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface FleetStation {
  name: string;
  latitude: number;
  longitude: number;
}

export interface NextContact {
  aosMs: number;
  losMs: number;
  stationName: string;
}

// Earliest AOS over the given stations within the default 24 h horizon.
export const findNextContact = (satrec: SatRec, stations: readonly FleetStation[], from: Date): NextContact | null => {
  let best: NextContact | null = null;

  for (const station of stations) {
    const window = findNextWindow(satrec, station.latitude, station.longitude, from);

    if (window && (!best || window.aos.getTime() < best.aosMs)) {
      best = {aosMs: window.aos.getTime(), losMs: window.los.getTime(), stationName: station.name};
    }
  }

  return best;
};

export interface NextContactCacheEntry {
  computedMs: number;
  contact: NextContact | null;
}

export type NextContactCache = Map<string, NextContactCacheEntry>;

const NEXT_CONTACT_TTL_MS = 60_000;

// The full-fleet window search costs ~100 ms, far too heavy for the 5 s position poll. Entries are keyed by
// TLE + station set and reused until they age out or the cached pass ends.
export const getCachedNextContact = (
  cache: NextContactCache,
  key: string,
  now: Date,
  compute: () => NextContact | null,
  ttlMs: number = NEXT_CONTACT_TTL_MS,
): NextContact | null => {
  const nowMs = now.getTime();
  const hit = cache.get(key);

  if (hit && nowMs - hit.computedMs < ttlMs && (hit.contact === null || hit.contact.losMs > nowMs)) {
    return hit.contact;
  }

  const contact = compute();

  cache.set(key, {computedMs: nowMs, contact});

  return contact;
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
