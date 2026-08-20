/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {createSatrec, groundTrack, orbitalPeriodMinutes, propagateToGeodetic} from "@/lib/propagation.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Seed TLE from apps/server/src/db.ts (Starlink-1), epoch 2022-02-22.

const TLE = {
  line1: "1    11U 59001A   22053.83197560  .00000847  00000-0  45179-3 0  9996",
  line2: "2    11  32.8647 264.6509 1466352 126.0358 248.5175 11.85932318689790",
};

const TIME = new Date("2022-02-23T00:00:00Z");

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("createSatrec", () => {
  it("builds a satrec from a valid TLE", () => {
    expect(createSatrec(TLE)).not.toBeNull();
  });

  it("returns null for garbage lines instead of throwing", () => {
    expect(createSatrec({line1: "not a tle", line2: "also not a tle"})).toBeNull();
  });
});

describe("propagateToGeodetic", () => {
  it("propagates to a geodetic point in degrees and kilometers", () => {
    const satrec = createSatrec(TLE);
    expect(satrec).not.toBeNull();

    const point = propagateToGeodetic(satrec!, TIME);
    expect(point).not.toBeNull();

    // Inclination 32.86° bounds latitude; longitude must be wrapped; this orbit stays well above the surface.
    expect(Math.abs(point!.latitude)).toBeLessThanOrEqual(32.87);
    expect(point!.longitude).toBeGreaterThanOrEqual(-180);
    expect(point!.longitude).toBeLessThanOrEqual(180);
    expect(point!.altitude).toBeGreaterThan(100);
  });

  it("is deterministic for a fixed time", () => {
    const satrec = createSatrec(TLE);

    expect(propagateToGeodetic(satrec!, TIME)).toEqual(propagateToGeodetic(satrec!, TIME));
  });
});

describe("orbitalPeriodMinutes", () => {
  it("derives the period from the mean motion", () => {
    const satrec = createSatrec(TLE);

    // 11.86 rev/day is a ~121 min period; satrec.no is un-Kozai'd, so allow slack.
    expect(orbitalPeriodMinutes(satrec!)).toBeGreaterThan(120);
    expect(orbitalPeriodMinutes(satrec!)).toBeLessThan(123);
  });
});

describe("groundTrack", () => {
  it("samples one orbit of in-range coordinates starting at the current position", () => {
    const satrec = createSatrec(TLE);
    const period = orbitalPeriodMinutes(satrec!);
    const track = groundTrack(satrec!, TIME, period!, 64);

    expect(track).toHaveLength(65);

    const start = propagateToGeodetic(satrec!, TIME);
    expect(track[0][0]).toBeCloseTo(start!.longitude, 6);
    expect(track[0][1]).toBeCloseTo(start!.latitude, 6);

    for (const [longitude, latitude] of track) {
      expect(longitude).toBeGreaterThanOrEqual(-180);
      expect(longitude).toBeLessThanOrEqual(180);
      // Geodetic latitude can exceed the 32.86° inclination by Earth-oblateness (~0.2°).
      expect(Math.abs(latitude)).toBeLessThanOrEqual(33.1);
    }
  });

  it("is deterministic for a fixed start", () => {
    const satrec = createSatrec(TLE);

    expect(groundTrack(satrec!, TIME, 120, 16)).toEqual(groundTrack(satrec!, TIME, 120, 16));
  });
});
