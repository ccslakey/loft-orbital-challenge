/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {createSatrec, propagateToGeodetic} from "@/lib/propagation.js";
import {centralAngleDeg, elevationDeg} from "@/lib/visibility.js";
import {findNextWindow} from "@/lib/windows.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Seed TLE from apps/server/src/db.ts (Starlink-3): ~560 km LEO at 50.3° inclination, epoch 2022-02-22.

const TLE = {
  line1: "1 00022U 59009A   22053.49750630  .00000970  00000-0  93426-4 0  9997",
  line2: "2 00022  50.2831  94.4956 0136813  90.0531 271.6094 14.96180956562418",
};

const FROM = new Date("2022-02-23T00:00:00Z");

// ATLAS Guam: low latitude, well inside the satellite's ground-track band.
const GUAM = {lat: 13.4443, lon: 144.7937};

const satrec = createSatrec(TLE)!;

const elevationAt = (time: Date, station: {lat: number; lon: number}): number => {
  const point = propagateToGeodetic(satrec, time)!;

  return elevationDeg(centralAngleDeg(station.lat, station.lon, point.latitude, point.longitude), point.altitude)!;
};

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("findNextWindow", () => {
  it("finds a bounded LEO pass and refines AOS to the mask", () => {
    const window = findNextWindow(satrec, GUAM.lat, GUAM.lon, FROM);

    expect(window).not.toBeNull();
    expect(window!.truncated).toBe(false);
    expect(window!.aos.getTime()).toBeGreaterThan(FROM.getTime());
    expect(window!.los.getTime()).toBeGreaterThan(window!.aos.getTime());

    // LEO passes run minutes, not hours.
    const durationMinutes = (window!.los.getTime() - window!.aos.getTime()) / 60000;
    expect(durationMinutes).toBeGreaterThan(0.5);
    expect(durationMinutes).toBeLessThan(20);

    expect(window!.maxElevationDeg).toBeGreaterThanOrEqual(10);
    expect(elevationAt(window!.aos, GUAM)).toBeCloseTo(10, 1);
  });

  it("reports a pass already in progress from the given start time", () => {
    const first = findNextWindow(satrec, GUAM.lat, GUAM.lon, FROM)!;
    const during = new Date((first.aos.getTime() + first.los.getTime()) / 2);
    const window = findNextWindow(satrec, GUAM.lat, GUAM.lon, during);

    expect(window!.aos.getTime()).toBe(during.getTime());
    expect(window!.los.getTime()).toBeCloseTo(first.los.getTime(), -4);
  });

  it("returns null when the station latitude is out of reach", () => {
    // 50.3° inclination never rises above the mask at 88°N within the horizon.
    expect(findNextWindow(satrec, 88, 0, FROM)).toBeNull();
  });
});
