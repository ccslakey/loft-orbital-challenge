/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {eciToGeodetic, gstime, propagate, twoline2satrec, type SatRec} from "satellite.js";

import type {TwoLineElement} from "./tle.js";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface GeodeticPoint {
  latitude: number; // degrees, -90..90
  longitude: number; // degrees, -180..180
  altitude: number; // km
}

/* Conversion /////////////////////////////////////////////////////////////////////////////////////////////////////// */

const toDegrees = (radians: number): number => radians * (180 / Math.PI);

// eciToGeodetic longitude is not guaranteed to be in range; wraps rather than clamps.
const wrapLongitude = (degrees: number): number => {
  const wrapped = (((degrees + 180) % 360) + 360) % 360;

  return wrapped - 180;
};

/* Propagation ////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Same recipe as the server (apps/server/src/db.ts), so client and server positions agree structurally.

// Returns null rather than throwing: a bad TLE degrades one satellite, not the map.
// Garbage lines can parse with error still 0, so mean motion is checked as well.
export const createSatrec = (tle: TwoLineElement): SatRec | null => {
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);

    return satrec.error === 0 && Number.isFinite(satrec.no) ? satrec : null;
  } catch {
    return null;
  }
};

export const propagateToGeodetic = (satrec: SatRec, time: Date): GeodeticPoint | null => {
  try {
    const {position} = propagate(satrec, time);

    // satellite.js signals a failed propagation (e.g. decayed orbit) with position: false.
    if (typeof position === "boolean") {
      return null;
    }

    const {latitude, longitude, height} = eciToGeodetic(position, gstime(time));
    const point = {
      latitude: toDegrees(latitude),
      longitude: wrapLongitude(toDegrees(longitude)),
      altitude: height,
    };

    // A corrupt satrec can propagate to null/NaN components without signalling an error.
    return Number.isFinite(point.latitude) && Number.isFinite(point.longitude) && Number.isFinite(point.altitude)
      ? point
      : null;
  } catch {
    return null;
  }
};
