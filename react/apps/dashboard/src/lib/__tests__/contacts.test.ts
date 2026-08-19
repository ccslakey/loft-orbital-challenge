/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {
  busyInterval,
  conflictsFor,
  FALLBACK_WINDOW_MS,
  PASS_PAD_MS,
  recoverContactWindow,
  type ScheduledUse,
} from "@/lib/contacts.js";
import {createSatrec} from "@/lib/propagation.js";
import {findNextWindow} from "@/lib/windows.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Seed TLE from apps/server/src/db.ts (Starlink-3): ~560 km LEO at 50.3° inclination, epoch 2022-02-22.

const satrec = createSatrec({
  line1: "1 00022U 59009A   22053.49750630  .00000970  00000-0  93426-4 0  9997",
  line2: "2 00022  50.2831  94.4956 0136813  90.0531 271.6094 14.96180956562418",
})!;

const GUAM = {latitude: 13.4443, longitude: 144.7937};

const realWindow = findNextWindow(satrec, GUAM.latitude, GUAM.longitude, new Date("2022-02-23T00:00:00Z"))!;

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("recoverContactWindow", () => {
  it("recovers the LOS for an AOS that falls inside a real pass", () => {
    const recovered = recoverContactWindow(satrec, GUAM.latitude, GUAM.longitude, realWindow.aos.getTime());

    expect(recovered).not.toBeNull();
    expect(recovered!.losMs).toBeCloseTo(realWindow.los.getTime(), -4);
    expect(recovered!.maxElevationDeg).toBeGreaterThanOrEqual(10);
  });

  it("recovers from mid-pass times as well", () => {
    const midMs = Math.round((realWindow.aos.getTime() + realWindow.los.getTime()) / 2);
    const recovered = recoverContactWindow(satrec, GUAM.latitude, GUAM.longitude, midMs);

    expect(recovered).not.toBeNull();
    expect(recovered!.losMs).toBeCloseTo(realWindow.los.getTime(), -4);
  });

  it("returns null when the stored time is not inside a pass under the current TLE", () => {
    // One hour before the real pass the satellite is below the mask, so the next window starts later.
    const recovered = recoverContactWindow(satrec, GUAM.latitude, GUAM.longitude, realWindow.aos.getTime() - 3_600_000);

    expect(recovered).toBeNull();
  });

  it("returns null for an unreachable station", () => {
    expect(recoverContactWindow(satrec, 88, 0, realWindow.aos.getTime())).toBeNull();
  });
});

describe("busyInterval", () => {
  it("pads a recovered pass on both sides", () => {
    expect(busyInterval(1_000_000, 1_600_000)).toEqual({
      startMs: 1_000_000 - PASS_PAD_MS,
      endMs: 1_600_000 + PASS_PAD_MS,
    });
  });

  it("assumes a worst-case pass when the LOS is unrecoverable", () => {
    expect(busyInterval(1_000_000, null).endMs).toBe(1_000_000 + FALLBACK_WINDOW_MS + PASS_PAD_MS);
  });
});

describe("conflictsFor", () => {
  const use: ScheduledUse = {
    startMs: 1_000,
    endMs: 2_000,
    satelliteId: "sat-a",
    satelliteName: "SAT-A",
    stationId: "gs-1",
    stationName: "Station 1",
  };

  it("flags an overlapping window at the same station", () => {
    const hits = conflictsFor({aosMs: 1_500, losMs: 3_000, stationId: "gs-1", satelliteId: "sat-b"}, [use]);

    expect(hits).toEqual([use]);
  });

  it("flags an overlapping window for the same satellite at another station", () => {
    const hits = conflictsFor({aosMs: 1_500, losMs: 3_000, stationId: "gs-2", satelliteId: "sat-a"}, [use]);

    expect(hits).toEqual([use]);
  });

  it("ignores overlaps that share neither station nor satellite", () => {
    expect(conflictsFor({aosMs: 1_500, losMs: 3_000, stationId: "gs-2", satelliteId: "sat-b"}, [use])).toEqual([]);
  });

  it("ignores same-resource windows that do not overlap in time", () => {
    expect(conflictsFor({aosMs: 2_000, losMs: 3_000, stationId: "gs-1", satelliteId: "sat-a"}, [use])).toEqual([]);
    expect(conflictsFor({aosMs: 0, losMs: 1_000, stationId: "gs-1", satelliteId: "sat-a"}, [use])).toEqual([]);
  });
});
