# Plan: contact-planning map (`/map`)

Implementation plan for the map feature and its prerequisite, client-side TLE
propagation. This is the working document; DECISIONS.md carries only the
one-line decisions.

## Goal

A top-level `/map` route answering the operator question behind the brief's
contact narrative: which contracted ground stations can reach which satellites,
now and next.

## Prerequisite: client-side TLE propagation

Run SGP4 in the browser with `satellite.js` to animate positions between polls.
The server stays source of truth; polling continues (slower) only to correct
drift.

Rationale: the orbit is deterministic, so smoothness can be decoupled from the
network. Polling at 1s pays more network for still-stepped motion, and
push/subscriptions don't help a continuous firehose. Cost accepted: we own the
math and must reconcile client vs. server positions.

### Spike results (2026-08-19) — de-risked

- The server itself uses satellite.js 5.0.0 (`twoline2satrec → propagate →
  eciToGeodetic`, see `apps/server/src/db.ts`).
- All 7 seed TLEs propagate at wall-clock now: `satrec.error = 0` despite
  2021–22 epochs.
- Client output matches the API within 0.02° / 0.4 km — sub-tick skew only.
- Same library + same recipe = structural agreement between client and server.

## Rendering approach

Equirectangular SVG with d3-geo doing projection, geodesic footprint circles
and antimeridian clipping. Styling stays in SCSS tokens.

Rejected alternatives:

- **Hand-rolled projection** — antimeridian clipping and geodesic circles eat
  the available time; these are exactly the two hard geo problems d3-geo solves.
- **react-simple-maps** — its component layer fights per-frame animation.
- **globe.gl / WebGL globe** — can't be token-styled, and a globe occludes half
  the fleet at any one time.

## Phases

1. **L1 — positions.** Satellites and ground stations plotted on the
   equirectangular map, satellite positions animated via client-side SGP4.
2. **L2 — footprints and links.** Station visibility footprints (geodesic
   circles from the elevation mask) and active line-of-sight links drawn
   between stations and satellites currently in view.
3. **L3 — contact windows.** Next-contact windows (AOS/LOS) computed per
   station–satellite pair and listed alongside the map.

## Scope exclusions

- **No time scrubber or playback** — the map shows "now" only; windows are
  listed, not animated.
- **No antenna, frequency or link-budget modelling** — visibility is purely
  geometric line-of-sight.
- **Default elevation mask assumed** (~5–10°) — the data has no per-station
  mask, so one value is applied fleet-wide.
- **Read-only planner** — the API has no contact-request mutation, so none is
  faked.
- **Degradation, not failure** — a satellite with a missing or unparseable TLE
  renders at its server-polled position with no footprint or track; the map
  never breaks on bad data.
