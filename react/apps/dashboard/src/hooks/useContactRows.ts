/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useMemo} from "react";
import type {SatRec} from "satellite.js";

import {compareContactPhase, contactPhase, contactWindowLabel, recoverContactWindow} from "@/lib/contacts.js";
import type {ContactPhase} from "@/lib/contacts.js";
import {createSatrec} from "@/lib/propagation.js";
import {parseTle} from "@/lib/tle.js";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface ContactLike {
  date: string;
  Satellite?: {id: string; tle?: Record<string, unknown> | null} | null;
  GroundStation?: {coordinates?: ReadonlyArray<number | null> | null} | null;
}

export interface ContactRow<T extends ContactLike> {
  contact: T;
  dateMs: number;
  phase: ContactPhase;
  // Recovered from the current TLE; null when the stored AOS no longer falls inside a pass.
  windowLabel: string | null;
}

interface ContactRowOptions {
  /** Fixed satrec for pages scoped to one satellite; otherwise derived per contact and cached. */
  satrec?: SatRec | null;
  /** Fixed site for pages scoped to one station; otherwise read from each contact's GroundStation. */
  station?: {latitude: number | null; longitude: number | null};
}

/* Hook ///////////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Recovers each contact's pass window from the current TLE and sorts by phase (active, upcoming, past).
export const useContactRows = <T extends ContactLike>(
  contacts: readonly T[],
  now: Date,
  {satrec: fixedSatrec, station}: ContactRowOptions = {},
): ContactRow<T>[] => {
  const hasFixedSatrec = fixedSatrec !== undefined;
  const stationLatitude = station?.latitude;
  const stationLongitude = station?.longitude;
  const hasFixedStation = station !== undefined;

  return useMemo(() => {
    const nowMs = now.getTime();
    const satrecCache = new Map<string, SatRec | null>();

    const satrecFor = (contact: T): SatRec | null => {
      if (hasFixedSatrec) {
        return fixedSatrec ?? null;
      }

      const satId = contact.Satellite?.id ?? "";

      if (!satrecCache.has(satId)) {
        const tle = parseTle(contact.Satellite?.tle);

        satrecCache.set(satId, tle ? createSatrec(tle) : null);
      }

      return satrecCache.get(satId) ?? null;
    };

    return contacts
      .flatMap((contact): ContactRow<T>[] => {
        const dateMs = new Date(contact.date).getTime();

        if (Number.isNaN(dateMs)) {
          return [];
        }

        const [latitude, longitude] = hasFixedStation
          ? [stationLatitude, stationLongitude]
          : (contact.GroundStation?.coordinates ?? [null, null]);
        const satrec = satrecFor(contact);
        const window =
          satrec && latitude != null && longitude != null
            ? recoverContactWindow(satrec, latitude, longitude, dateMs)
            : null;
        const phase = contactPhase(dateMs, window?.losMs ?? null, nowMs);

        return [{contact, dateMs, phase, windowLabel: contactWindowLabel(phase, window, dateMs, nowMs)}];
      })
      .sort(compareContactPhase);
  }, [contacts, now, hasFixedSatrec, fixedSatrec, hasFixedStation, stationLatitude, stationLongitude]);
};
