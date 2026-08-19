/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {centralAngleDeg, elevationDeg, footprintRadiusDeg} from "@/lib/visibility.js";

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("centralAngleDeg", () => {
  it("is zero between a point and itself", () => {
    expect(centralAngleDeg(45, -120, 45, -120)).toBeCloseTo(0);
  });

  it("is 90 degrees between equator points a quarter turn apart", () => {
    expect(centralAngleDeg(0, 0, 0, 90)).toBeCloseTo(90);
  });

  it("is symmetric", () => {
    expect(centralAngleDeg(10, 20, -30, 140)).toBeCloseTo(centralAngleDeg(-30, 140, 10, 20));
  });
});

describe("footprintRadiusDeg", () => {
  it("matches the closed form for a 550 km orbit and 10 degree mask", () => {
    // acos((6371 / 6921) * cos(10 deg)) - 10 deg
    expect(footprintRadiusDeg(550, 10)).toBeCloseTo(14.97, 1);
  });

  it("grows with altitude", () => {
    expect(footprintRadiusDeg(2000, 10)!).toBeGreaterThan(footprintRadiusDeg(550, 10)!);
  });

  it("returns null for a grounded or invalid altitude", () => {
    expect(footprintRadiusDeg(0)).toBeNull();
    expect(footprintRadiusDeg(-10)).toBeNull();
    expect(footprintRadiusDeg(Number.NaN)).toBeNull();
  });
});

describe("elevationDeg", () => {
  it("is 90 degrees directly under the satellite", () => {
    expect(elevationDeg(0, 550)).toBe(90);
  });

  it("equals the mask exactly at the footprint edge", () => {
    const radius = footprintRadiusDeg(550, 10);

    expect(elevationDeg(radius!, 550)).toBeCloseTo(10);
  });

  it("goes negative beyond the horizon", () => {
    expect(elevationDeg(60, 550)!).toBeLessThan(0);
  });

  it("returns null for an invalid altitude", () => {
    expect(elevationDeg(10, 0)).toBeNull();
  });
});
