/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {deriveOrbit, tleAgeDays, TLE_STALE_DAYS} from "@/lib/orbit.js";
import {createSatrec} from "@/lib/propagation.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Seed TLE from apps/server/src/db.ts (Starlink-1): i=32.8647°, e=0.1466352, 11.859 rev/day, epoch 2022-02-22.

const TLE = {
  line1: "1    11U 59001A   22053.83197560  .00000847  00000-0  45179-3 0  9996",
  line2: "2    11  32.8647 264.6509 1466352 126.0358 248.5175 11.85932318689790",
};

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("deriveOrbit", () => {
  const satrec = createSatrec(TLE);
  const orbit = deriveOrbit(satrec!);

  it("recovers the TLE's inclination and eccentricity", () => {
    expect(orbit).not.toBeNull();
    expect(orbit!.inclinationDeg).toBeCloseTo(32.8647, 3);
    expect(orbit!.eccentricity).toBeCloseTo(0.1466352, 6);
  });

  it("derives period and apsides from the mean motion", () => {
    // 11.859 rev/day is a ~121 min period; satrec.no is un-Kozai'd, so allow sub-minute slack.
    expect(orbit!.periodMin).toBeGreaterThan(120.5);
    expect(orbit!.periodMin).toBeLessThan(122.5);
    expect(orbit!.apogeeKm).toBeGreaterThan(2800);
    expect(orbit!.apogeeKm).toBeLessThan(3100);
    expect(orbit!.perigeeKm).toBeGreaterThan(450);
    expect(orbit!.perigeeKm).toBeLessThan(700);
    expect(orbit!.apogeeKm).toBeGreaterThan(orbit!.perigeeKm);
  });

  it("converts the epoch to 2022-02-22 UTC", () => {
    const epoch = new Date(orbit!.epochMs);

    expect(epoch.toISOString().slice(0, 10)).toBe("2022-02-22");
  });
});

describe("tleAgeDays", () => {
  it("measures the span from epoch to now in days", () => {
    const epochMs = Date.UTC(2022, 1, 22);

    expect(tleAgeDays(epochMs, epochMs + 86_400_000)).toBeCloseTo(1, 6);
    expect(tleAgeDays(epochMs, epochMs + TLE_STALE_DAYS * 86_400_000)).toBe(TLE_STALE_DAYS);
  });
});
