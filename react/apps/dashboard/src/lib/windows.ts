/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {SatRec} from "satellite.js";

import {keplerSemiMajorKm} from "./orbit.js";
import {propagateToGeodetic} from "./propagation.js";
import {
  centralAngleDeg,
  DEFAULT_ELEVATION_MASK_DEG,
  EARTH_RADIUS_KM,
  elevationDeg,
  footprintRadiusDeg,
} from "./visibility.js";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface ContactWindow {
  aos: Date;
  los: Date;
  maxElevationDeg: number;
  // The pass was still open at the search horizon, so los is the horizon, not a real loss of signal.
  truncated: boolean;
}

export interface WindowOptions {
  maskDeg?: number;
  horizonHours?: number;
  coarseStepSeconds?: number;
}

/* Search /////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const BISECT_ITERATIONS = 24;
const PEAK_ITERATIONS = 20;
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;
const REACHABILITY_MARGIN_DEG = 1;

// Fast bound that spares a full 24 h scan: a satellite never clears the mask for stations poleward
// of its maximum ground latitude plus the footprint radius at apogee.
const maxReachableLatitudeDeg = (satrec: SatRec, maskDeg: number): number => {
  const inclinationDeg = satrec.inclo * (180 / Math.PI);
  const maxGroundLat = Math.min(inclinationDeg, 180 - inclinationDeg);

  // satrec.no is mean motion in rad/min; Kepler gives the semi-major axis, hence apogee altitude.
  const semiMajorKm = keplerSemiMajorKm(satrec.no);
  const radius = footprintRadiusDeg(semiMajorKm * (1 + satrec.ecco) - EARTH_RADIUS_KM, maskDeg);

  return maxGroundLat + (radius ?? 0) + REACHABILITY_MARGIN_DEG;
};

// Elevation above the mask at a given time; null when propagation fails.
const marginAt = (
  satrec: SatRec,
  stationLat: number,
  stationLon: number,
  maskDeg: number,
  ms: number,
): number | null => {
  const point = propagateToGeodetic(satrec, new Date(ms));

  if (!point) {
    return null;
  }

  const elevation = elevationDeg(
    centralAngleDeg(stationLat, stationLon, point.latitude, point.longitude),
    point.altitude,
  );

  return elevation === null ? null : elevation - maskDeg;
};

// Narrows a sign change to millisecond precision. Returns the boundary on the positive side.
const bisectCrossing = (f: (ms: number) => number | null, loMs: number, hiMs: number, rising: boolean): number => {
  let lo = loMs;
  let hi = hiMs;

  for (let i = 0; i < BISECT_ITERATIONS; i++) {
    const mid = (lo + hi) / 2;
    const value = f(mid);

    if (value === null) {
      break;
    }

    if (value < 0 === rising) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return rising ? hi : lo;
};

// Golden-section maximization around the best coarse sample: elevation is unimodal within one coarse
// step of culmination, so this recovers the true peak the 30 s grid can miss by 10°+ on near-zenith passes.
const refinePeakMargin = (f: (ms: number) => number | null, loMs: number, hiMs: number, seed: number): number => {
  let lo = loMs;
  let hi = hiMs;
  let best = seed;

  for (let i = 0; i < PEAK_ITERATIONS; i++) {
    const a = hi - (hi - lo) * GOLDEN_RATIO;
    const b = lo + (hi - lo) * GOLDEN_RATIO;
    const valueA = f(a);
    const valueB = f(b);

    if (valueA === null || valueB === null) {
      break;
    }

    best = Math.max(best, valueA, valueB);

    if (valueA < valueB) {
      lo = a;
    } else {
      hi = b;
    }
  }

  return best;
};

// Coarse scan for the next pass, refined by bisection. A pass already in progress reports aos = from.
// Returns null when no pass starts within the horizon or the TLE cannot be propagated.
export const findNextWindow = (
  satrec: SatRec,
  stationLat: number,
  stationLon: number,
  from: Date,
  {maskDeg = DEFAULT_ELEVATION_MASK_DEG, horizonHours = 24, coarseStepSeconds = 30}: WindowOptions = {},
): ContactWindow | null => {
  if (Math.abs(stationLat) > maxReachableLatitudeDeg(satrec, maskDeg)) {
    return null;
  }

  const f = (ms: number): number | null => marginAt(satrec, stationLat, stationLon, maskDeg, ms);

  const startMs = from.getTime();
  const endMs = startMs + horizonHours * 3_600_000;
  const stepMs = coarseStepSeconds * 1000;

  let prevMs = startMs;
  let prev = f(startMs);

  if (prev === null) {
    return null;
  }

  let aosMs: number | null = prev >= 0 ? startMs : null;
  let maxMargin = Math.max(0, prev);
  let peakMs = startMs;

  const peakElevationDeg = (losMs: number): number =>
    maskDeg +
    refinePeakMargin(f, Math.max(aosMs ?? startMs, peakMs - stepMs), Math.min(losMs, peakMs + stepMs), maxMargin);

  for (let t = startMs + stepMs; t <= endMs; t += stepMs) {
    const value = f(t);

    if (value === null) {
      return null;
    }

    if (aosMs === null) {
      if (prev < 0 && value >= 0) {
        aosMs = bisectCrossing(f, prevMs, t, true);
        maxMargin = value;
        peakMs = t;
      }
    } else {
      if (value < 0) {
        const losMs = bisectCrossing(f, prevMs, t, false);

        return {
          aos: new Date(aosMs),
          los: new Date(losMs),
          maxElevationDeg: peakElevationDeg(losMs),
          truncated: false,
        };
      }

      if (value > maxMargin) {
        maxMargin = value;
        peakMs = t;
      }
    }

    prev = value;
    prevMs = t;
  }

  return aosMs === null
    ? null
    : {aos: new Date(aosMs), los: new Date(endMs), maxElevationDeg: peakElevationDeg(endMs), truncated: true};
};
