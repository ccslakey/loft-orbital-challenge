/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {SatRec} from "satellite.js";

import {findNextWindow} from "./windows.js";

/* Window recovery ////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface RecoveredWindow {
  losMs: number;
  maxElevationDeg: number;
}

// A contact stores only its scheduled AOS; the LOS is derived physics, recomputed against the current TLE.
// findNextWindow reports aos = from for a pass in progress, so a stored AOS that falls inside a pass under
// the current TLE recovers its window; any other result means the TLE no longer supports the stored time
// (fabricated data, or an element set that has drifted) and null is returned rather than a wrong LOS.
export const recoverContactWindow = (
  satrec: SatRec,
  stationLatitude: number,
  stationLongitude: number,
  aosMs: number,
): RecoveredWindow | null => {
  const window = findNextWindow(satrec, stationLatitude, stationLongitude, new Date(aosMs), {horizonHours: 1});

  if (!window || window.aos.getTime() !== aosMs || window.truncated) {
    return null;
  }

  return {losMs: window.los.getTime(), maxElevationDeg: window.maxElevationDeg};
};
