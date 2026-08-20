/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {toDegrees, toRadians} from "./math.js";

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Spherical Earth; the data has no per-station mask, so one default applies fleet-wide.

export const EARTH_RADIUS_KM = 6371;
export const DEFAULT_ELEVATION_MASK_DEG = 10;

/* Geometry ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Great-circle central angle between two geodetic points, in degrees.
export const centralAngleDeg = (latA: number, lonA: number, latB: number, lonB: number): number => {
  const phiA = toRadians(latA);
  const phiB = toRadians(latB);
  const dPhi = toRadians(latB - latA);
  const dLambda = toRadians(lonB - lonA);

  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(phiA) * Math.cos(phiB) * Math.sin(dLambda / 2) ** 2;

  return toDegrees(2 * Math.asin(Math.min(1, Math.sqrt(h))));
};

// Ground radius (degrees of arc) around the sub-satellite point inside which the satellite clears the mask:
// lambda = acos((Re / (Re + h)) * cos(mask)) - mask.
export const footprintRadiusDeg = (altitudeKm: number, maskDeg = DEFAULT_ELEVATION_MASK_DEG): number | null => {
  if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) {
    return null;
  }

  const mask = toRadians(maskDeg);
  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);

  return toDegrees(Math.acos(ratio * Math.cos(mask)) - mask);
};

// Elevation of a satellite as seen from a ground point separated by the given central angle.
// Negative below the horizon: tan(el) = (cos(gamma) - Re / (Re + h)) / sin(gamma).
export const elevationDeg = (angleDeg: number, altitudeKm: number): number | null => {
  if (!Number.isFinite(altitudeKm) || altitudeKm <= 0 || !Number.isFinite(angleDeg)) {
    return null;
  }

  const gamma = toRadians(angleDeg);

  if (gamma === 0) {
    return 90;
  }

  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);

  return toDegrees(Math.atan2(Math.cos(gamma) - ratio, Math.sin(gamma)));
};
