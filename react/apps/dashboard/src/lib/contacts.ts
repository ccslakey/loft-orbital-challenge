/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {SatRec} from "satellite.js";

import {formatSpan} from "./format.js";
import type {State} from "./status.js";
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

/* Conflicts //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// A station's antenna and a satellite's link each serve one contact at a time, so a scheduled contact makes
// both busy for its pass plus a pre/post-pass pad, mirroring commercial reservation buffers.

export const PASS_PAD_MS = 2 * 60_000;

// When a contact's TLE no longer propagates its LOS is unrecoverable; assume a worst-case LEO pass rather
// than silently dropping the contact from conflict checks.
export const FALLBACK_WINDOW_MS = 15 * 60_000;

export type ContactPhase = "upcoming" | "active" | "past";

export const PHASE_PRESENTATION: Record<ContactPhase, {label: string; state: State; rank: number}> = {
  active: {label: "In progress", state: "nominal", rank: 0},
  upcoming: {label: "Upcoming", state: "planned", rank: 1},
  past: {label: "Past", state: "inert", rank: 2},
};

export const contactWindowLabel = (
  phase: ContactPhase,
  window: RecoveredWindow | null,
  dateMs: number,
  nowMs: number,
): string | null =>
  phase === "active" && window
    ? `ends in ${formatSpan(window.losMs - nowMs)}`
    : window
      ? `${formatSpan(window.losMs - dateMs)} · ${Math.round(window.maxElevationDeg)}°`
      : null;

export const compareContactPhase = (
  a: {phase: ContactPhase; dateMs: number},
  b: {phase: ContactPhase; dateMs: number},
): number => {
  const rank = PHASE_PRESENTATION[a.phase].rank - PHASE_PRESENTATION[b.phase].rank;

  return rank !== 0 ? rank : a.phase === "past" ? b.dateMs - a.dateMs : a.dateMs - b.dateMs;
};

// A null losMs means the window could not be recovered; the worst-case pass bounds the active phase instead.
export const contactPhase = (aosMs: number, losMs: number | null, nowMs: number): ContactPhase => {
  if (nowMs < aosMs) {
    return "upcoming";
  }

  return nowMs < (losMs ?? aosMs + FALLBACK_WINDOW_MS) ? "active" : "past";
};

export interface ScheduledUse {
  startMs: number;
  endMs: number;
  satelliteId: string;
  satelliteName: string;
  stationId: string;
  stationName: string;
}

// The padded interval a scheduled contact occupies.
export const busyInterval = (aosMs: number, losMs: number | null): {startMs: number; endMs: number} => ({
  startMs: aosMs - PASS_PAD_MS,
  endMs: (losMs ?? aosMs + FALLBACK_WINDOW_MS) + PASS_PAD_MS,
});

// Scheduled uses that collide with a candidate window: same antenna or same satellite, overlapping in time.
export const conflictsFor = (
  candidate: {aosMs: number; losMs: number; stationId: string; satelliteId: string},
  uses: readonly ScheduledUse[],
): ScheduledUse[] =>
  uses.filter(
    (use) =>
      (use.stationId === candidate.stationId || use.satelliteId === candidate.satelliteId) &&
      candidate.aosMs < use.endMs &&
      candidate.losMs > use.startMs,
  );
