/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {SatRec} from "satellite.js";

import {EARTH_RADIUS_KM} from "./visibility.js";

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */

const MU_KM3_S2 = 398600.4418;

const JULIAN_UNIX_EPOCH = 2440587.5;

const MS_PER_DAY = 86_400_000;

// Past this, drag and maneuvers have usually walked a LEO satellite far enough off its TLE that pass
// predictions are suspect.
export const TLE_STALE_DAYS = 14;

/* Derived elements ///////////////////////////////////////////////////////////////////////////////////////////////// */

export interface OrbitElements {
  inclinationDeg: number;
  periodMin: number;
  apogeeKm: number;
  perigeeKm: number;
  eccentricity: number;
  epochMs: number;
}

// Mean elements straight off the satrec: no is rad/min, inclo is radians, jdsatepoch is a Julian date.
export const deriveOrbit = (satrec: SatRec): OrbitElements | null => {
  const {inclo, ecco, no, jdsatepoch} = satrec;

  if (!Number.isFinite(no) || no <= 0 || !Number.isFinite(ecco) || ecco < 0 || ecco >= 1) {
    return null;
  }

  const meanMotionRadS = no / 60;
  const semiMajorKm = Math.cbrt(MU_KM3_S2 / (meanMotionRadS * meanMotionRadS));

  return {
    inclinationDeg: inclo * (180 / Math.PI),
    periodMin: (2 * Math.PI) / no,
    apogeeKm: semiMajorKm * (1 + ecco) - EARTH_RADIUS_KM,
    perigeeKm: semiMajorKm * (1 - ecco) - EARTH_RADIUS_KM,
    eccentricity: ecco,
    epochMs: (jdsatepoch - JULIAN_UNIX_EPOCH) * MS_PER_DAY,
  };
};

export const tleAgeDays = (epochMs: number, nowMs: number): number => (nowMs - epochMs) / MS_PER_DAY;
