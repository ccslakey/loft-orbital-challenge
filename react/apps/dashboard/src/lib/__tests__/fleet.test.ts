/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {
  filterRows,
  findNextContact,
  getCachedNextContact,
  hasActiveFilters,
  launchedAtMs,
  NO_FILTERS,
  readFleetParams,
  sortRows,
  type FleetRowValues,
  type NextContactCache,
} from "@/lib/fleet.js";
import {createSatrec} from "@/lib/propagation.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

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

describe("getCachedNextContact", () => {
  const contact = {aosMs: 100_000, losMs: 200_000, stationName: "Guam"};

  it("computes once and serves from cache within the TTL", () => {
    const cache: NextContactCache = new Map();
    let computes = 0;
    const compute = () => {
      computes++;

      return contact;
    };

    expect(getCachedNextContact(cache, "k", new Date(0), compute)).toEqual(contact);
    expect(getCachedNextContact(cache, "k", new Date(30_000), compute)).toEqual(contact);
    expect(computes).toBe(1);
  });

  it("recomputes once the entry ages out", () => {
    const cache: NextContactCache = new Map();
    let computes = 0;
    const compute = () => {
      computes++;

      return contact;
    };

    getCachedNextContact(cache, "k", new Date(0), compute, 60_000);
    getCachedNextContact(cache, "k", new Date(61_000), compute, 60_000);

    expect(computes).toBe(2);
  });

  it("recomputes when the cached pass has already ended", () => {
    const cache: NextContactCache = new Map();
    let computes = 0;
    const compute = () => {
      computes++;

      return contact;
    };

    getCachedNextContact(cache, "k", new Date(190_000), compute, 60_000);
    getCachedNextContact(cache, "k", new Date(201_000), compute, 60_000);

    expect(computes).toBe(2);
  });

  it("caches a null result until the TTL, not forever", () => {
    const cache: NextContactCache = new Map();
    let computes = 0;
    const compute = () => {
      computes++;

      return null;
    };

    expect(getCachedNextContact(cache, "k", new Date(0), compute, 60_000)).toBeNull();
    getCachedNextContact(cache, "k", new Date(30_000), compute, 60_000);
    expect(computes).toBe(1);
    getCachedNextContact(cache, "k", new Date(61_000), compute, 60_000);
    expect(computes).toBe(2);
  });
});

describe("findNextContact", () => {
  // Seed TLE from apps/server/src/db.ts (Starlink-3): ~560 km LEO at 50.3° inclination, epoch 2022-02-22.
  const satrec = createSatrec({
    line1: "1 00022U 59009A   22053.49750630  .00000970  00000-0  93426-4 0  9997",
    line2: "2 00022  50.2831  94.4956 0136813  90.0531 271.6094 14.96180956562418",
  })!;
  const from = new Date("2022-02-23T00:00:00Z");
  const guam = {name: "ATLAS Guam", latitude: 13.4443, longitude: 144.7937};
  const unreachable = {name: "North Pole", latitude: 88, longitude: 0};

  it("returns the earliest window and names its station", () => {
    const contact = findNextContact(satrec, [unreachable, guam], from);

    expect(contact).not.toBeNull();
    expect(contact!.stationName).toBe("ATLAS Guam");
    expect(contact!.aosMs).toBeGreaterThan(from.getTime());
    expect(contact!.losMs).toBeGreaterThan(contact!.aosMs);
  });

  it("returns null when no station can see the satellite", () => {
    expect(findNextContact(satrec, [unreachable], from)).toBeNull();
  });
});
