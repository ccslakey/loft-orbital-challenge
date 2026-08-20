/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {
  activeFleetStations,
  filterRows,
  findContactWindows,
  firstUpcomingWindow,
  getCachedWindows,
  hasActiveFilters,
  launchedAtMs,
  NO_FILTERS,
  readFleetParams,
  sortRows,
  timelineSegments,
  type FleetRowValues,
  type PassWindow,
  type WindowsCache,
} from "@/lib/fleet.js";
import {createSatrec} from "@/lib/propagation.js";
import {findNextWindow} from "@/lib/windows.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

const pass = (aosMs: number, losMs: number, station = "A"): PassWindow => ({
  aosMs,
  losMs,
  stationId: station,
  stationName: station,
  maxElevationDeg: 45,
  truncated: false,
});

const row = (overrides: Partial<FleetRowValues>): FleetRowValues => ({
  name: "SAT",
  status: "In Orbit",
  altitude: 500,
  launchedMs: 0,
  nextAosMs: 0,
  constellationId: null,
  customerIds: [],
  payloadCategories: [],
  ...overrides,
});

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("launchedAtMs", () => {
  it("returns the launch epoch for a completed or active launch", () => {
    expect(launchedAtMs("2021-01-09", "Completed")).toBe(new Date("2021-01-09").getTime());
    expect(launchedAtMs("2021-01-09", "Active")).toBe(new Date("2021-01-09").getTime());
  });

  it("returns null when the satellite has not actually flown", () => {
    expect(launchedAtMs("2024-11-02", "Pending")).toBeNull();
    expect(launchedAtMs("2024-12-25", "Terminated")).toBeNull();
  });

  it("returns null for missing or unparseable dates", () => {
    expect(launchedAtMs(null, "Completed")).toBeNull();
    expect(launchedAtMs("not a date", "Completed")).toBeNull();
  });
});

describe("filterRows", () => {
  const rows = [
    row({
      name: "Starlink-1",
      status: "In Orbit",
      constellationId: "c1",
      customerIds: ["spacex"],
      payloadCategories: ["Communication"],
    }),
    row({
      name: "Starlink-3",
      status: "Decommissioned",
      constellationId: "c1",
      customerIds: ["spacex"],
      payloadCategories: ["Communication"],
    }),
    row({
      name: "YAM-2",
      status: "In Orbit",
      customerIds: ["google", "amazon"],
      payloadCategories: ["Navigation", "Earth Observation"],
    }),
  ];

  it("passes everything through with no filters", () => {
    expect(filterRows(rows, NO_FILTERS)).toEqual(rows);
  });

  it("filters each dimension", () => {
    expect(filterRows(rows, {...NO_FILTERS, status: "In Orbit"}).map((r) => r.name)).toEqual(["Starlink-1", "YAM-2"]);
    expect(filterRows(rows, {...NO_FILTERS, constellation: "c1"})).toHaveLength(2);
    expect(filterRows(rows, {...NO_FILTERS, customer: "google"}).map((r) => r.name)).toEqual(["YAM-2"]);
    expect(filterRows(rows, {...NO_FILTERS, payloadCategory: "Navigation"}).map((r) => r.name)).toEqual(["YAM-2"]);
  });

  it("matches names by case-insensitive substring", () => {
    expect(filterRows(rows, {...NO_FILTERS, search: "  yam "}).map((r) => r.name)).toEqual(["YAM-2"]);
  });

  it("combines filters conjunctively", () => {
    expect(filterRows(rows, {...NO_FILTERS, status: "In Orbit", customer: "spacex"}).map((r) => r.name)).toEqual([
      "Starlink-1",
    ]);
  });
});

describe("hasActiveFilters", () => {
  it("ignores whitespace-only search", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, search: "   "})).toBe(false);
    expect(hasActiveFilters({...NO_FILTERS, status: "In Orbit"})).toBe(true);
  });
});

describe("sortRows", () => {
  const rows = [
    row({name: "B", altitude: 300}),
    row({name: "A", altitude: 700}),
    row({name: "C", altitude: null}),
    row({name: "D", altitude: 300}),
  ];

  it("sorts numerically with name as tiebreaker", () => {
    expect(sortRows(rows, "altitude", "asc").map((r) => r.name)).toEqual(["B", "D", "A", "C"]);
  });

  it("keeps rows without a value last in either direction", () => {
    expect(sortRows(rows, "altitude", "desc").map((r) => r.name)).toEqual(["A", "B", "D", "C"]);
  });

  it("does not mutate its input", () => {
    const before = [...rows];

    sortRows(rows, "name", "desc");

    expect(rows).toEqual(before);
  });
});

describe("readFleetParams", () => {
  it("returns inactive filters and no sort for empty params", () => {
    const {filters, sort, direction} = readFleetParams(new URLSearchParams());

    expect(filters).toEqual(NO_FILTERS);
    expect(sort).toBeNull();
    expect(direction).toBe("asc");
  });

  it("reads every recognised param", () => {
    const params = new URLSearchParams(
      "status=In+Orbit&constellation=c1&customer=x&payload=Navigation&q=yam&sort=launched&dir=desc",
    );
    const {filters, sort, direction} = readFleetParams(params);

    expect(filters).toEqual({
      status: "In Orbit",
      constellation: "c1",
      customer: "x",
      payloadCategory: "Navigation",
      search: "yam",
    });
    expect(sort).toBe("launched");
    expect(direction).toBe("desc");
  });

  it("drops unknown sort fields and directions instead of throwing", () => {
    const {sort, direction} = readFleetParams(new URLSearchParams("sort=bogus&dir=sideways"));

    expect(sort).toBeNull();
    expect(direction).toBe("asc");
  });
});

describe("getCachedWindows", () => {
  const windows = [pass(100_000, 200_000, "Guam")];

  it("computes once and serves from cache within the TTL", () => {
    const cache: WindowsCache = new Map();
    let computes = 0;
    const compute = () => {
      computes++;

      return windows;
    };

    expect(getCachedWindows(cache, "k", new Date(0), compute)).toEqual(windows);
    expect(getCachedWindows(cache, "k", new Date(30_000), compute)).toEqual(windows);
    expect(computes).toBe(1);
  });

  it("recomputes once the entry ages out", () => {
    const cache: WindowsCache = new Map();
    let computes = 0;
    const compute = () => {
      computes++;

      return windows;
    };

    getCachedWindows(cache, "k", new Date(0), compute, 60_000);
    getCachedWindows(cache, "k", new Date(61_000), compute, 60_000);

    expect(computes).toBe(2);
  });
});

describe("findContactWindows", () => {
  // Seed TLE from apps/server/src/db.ts (Starlink-3): ~560 km LEO at 50.3° inclination, epoch 2022-02-22.
  const satrec = createSatrec({
    line1: "1 00022U 59009A   22053.49750630  .00000970  00000-0  93426-4 0  9997",
    line2: "2 00022  50.2831  94.4956 0136813  90.0531 271.6094 14.96180956562418",
  })!;
  const from = new Date("2022-02-23T00:00:00Z");
  const guam = {id: "gs-guam", name: "ATLAS Guam", latitude: 13.4443, longitude: 144.7937};
  const unreachable = {id: "gs-pole", name: "North Pole", latitude: 88, longitude: 0};

  it("enumerates every pass in the horizon, sorted by AOS", () => {
    const windows = findContactWindows(satrec, [unreachable, guam], from);

    // A 50° LEO makes several Guam passes per day, in consecutive-orbit clusters.
    expect(windows.length).toBeGreaterThan(1);

    for (const [index, window] of windows.entries()) {
      expect(window.stationId).toBe("gs-guam");
      expect(window.maxElevationDeg).toBeGreaterThanOrEqual(10);
      expect(window.losMs).toBeGreaterThan(window.aosMs);

      if (index > 0) {
        expect(window.aosMs).toBeGreaterThanOrEqual(windows[index - 1].aosMs);
      }
    }
  });

  it("agrees with the single-window search on the first pass", () => {
    const [first] = findContactWindows(satrec, [guam], from);
    const single = findNextWindow(satrec, guam.latitude, guam.longitude, from)!;

    expect(first.aosMs).toBe(single.aos.getTime());
    expect(first.losMs).toBe(single.los.getTime());
  });

  it("returns an empty list when no station can see the satellite", () => {
    expect(findContactWindows(satrec, [unreachable], from)).toEqual([]);
  });
});

describe("firstUpcomingWindow", () => {
  const windows: PassWindow[] = [pass(100, 200, "A"), pass(300, 400, "B")];

  it("returns an in-progress pass, then the next, then null", () => {
    expect(firstUpcomingWindow(windows, 150)!.stationName).toBe("A");
    expect(firstUpcomingWindow(windows, 250)!.stationName).toBe("B");
    expect(firstUpcomingWindow(windows, 450)).toBeNull();
  });
});

describe("timelineSegments", () => {
  const horizonMs = 1_000;

  it("maps a future window to unit fractions of the axis", () => {
    const [segment] = timelineSegments([pass(250, 500)], 0, horizonMs);

    expect(segment.start).toBeCloseTo(0.25);
    expect(segment.span).toBeCloseTo(0.25);
  });

  it("clamps an in-progress pass to the start and a long pass to the horizon", () => {
    const segments = timelineSegments([pass(-100, 100, "A"), pass(900, 1_500, "B")], 0, horizonMs);

    expect(segments[0].start).toBe(0);
    expect(segments[0].span).toBeCloseTo(0.1);
    expect(segments[1].start).toBeCloseTo(0.9);
    expect(segments[1].span).toBeCloseTo(0.1);
  });

  it("drops fully elapsed windows", () => {
    expect(timelineSegments([pass(-200, -100)], 0, horizonMs)).toEqual([]);
  });
});

describe("activeFleetStations", () => {
  it("keeps only operational, positioned stations", () => {
    const stations = [
      {id: "a", name: "A", status: "Online", coordinates: [10, 20]},
      {id: "b", name: "B", status: "Offline", coordinates: [10, 20]},
      {id: "c", name: "C", status: "Online", coordinates: [null, 20]},
      null,
    ];

    expect(activeFleetStations(stations)).toEqual([{id: "a", name: "A", latitude: 10, longitude: 20}]);
  });

  it("returns an empty list for missing input", () => {
    expect(activeFleetStations(null)).toEqual([]);
    expect(activeFleetStations(undefined)).toEqual([]);
  });
});
