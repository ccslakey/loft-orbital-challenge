/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {createSatrec, propagateToGeodetic} from "@/lib/propagation.js";

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
