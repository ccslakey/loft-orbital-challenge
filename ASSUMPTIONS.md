# Assumptions

Core assumptions baked into the code, grouped by area. Each one names where it lives so it can be checked.

## Orbital mechanics

- **TLE + SGP4 is the source of truth for position.** Client and server both propagate with the same
  `satellite.js@5.0.0` recipe, so their positions agree. (`lib/propagation.ts`, `apps/server/src/db.ts`)
- **The Earth is a sphere** of mean radius 6371 km for visibility geometry. Good to a fraction of a degree
  of elevation; no oblateness or terrain. (`lib/visibility.ts`)
- **One fleet-wide 10° elevation mask.** No per-station antenna model or horizon profile.
  (`DEFAULT_ELEVATION_MASK_DEG` in `lib/visibility.ts`)
- **No pass shorter than ~30 s matters.** The window search samples on a 30 s grid, then refines AOS/LOS
  and the peak; a grazing pass that fits between samples is missed. A deliberate accuracy/CPU trade.
  (`lib/windows.ts`)
- **Elevation has one peak per pass**, so a golden-section search around the best sample finds the true
  max. Holds for real passes over a fixed station. (`lib/windows.ts`)
- **A 24 h horizon is enough for planning.** Nothing looks further ahead. (`CONTACT_HORIZON_HOURS`)
- **TLEs older than 14 days are suspect** and get a stale badge, but are still used. (`lib/orbit.ts`)

## Contacts and scheduling

- **A stored contact holds only its AOS time; the window is re-derived from the current TLE.** If the
  stored time no longer falls inside a real pass, the app shows a dash instead of trusting old physics.
  (`lib/contacts.ts`)
- **A station antenna and a satellite link each serve one contact at a time**, with a 2-minute pad between
  contacts. That is the whole conflict model — no link budgets, no multi-antenna sites. (`PASS_PAD_MS`)
- **Conflicts are flagged, not blocked.** The operator is trusted to override a warning. (`/contacts/new`)
- **Planned satellites can be scheduled and shown on the map** if they have a TLE. The seed data's YAM-5
  works this way, so it is treated as intended. (schedule form filters out only decommissioned)

## Data and API

- **The server is the only store.** All screen state is server state (or lives in the URL); no Redux layer.
- **Polling stands in for subscriptions**: 5 s for positions, 30 s for the map, 15 s for the header link
  check. "Live enough" for an operator console.
- **Fetching the first 50 satellites / 50 stations / 100 contacts is enough at seed scale.** Truncation is
  disclosed in the UI ("first 50 of 62 tracked") rather than paginated.
- **Status strings may be anything.** Enums arrive untyped, so every status maps to a small closed set of
  states and unknown values degrade to a neutral colour instead of erroring. (`lib/status.ts`)
- **IDs are stable across server restarts**, so deep links and URL filters can hold them. (seed data uses
  literal ids, not generated ones)
- **The committed `schema.graphql` matches the live server.** CI regenerates it from a running instance
  and fails on drift, so the assumption is checked rather than trusted.

## Operations and environment

- **Operators think in UTC.** Every time on screen is UTC; there is no local-time display. (`lib/format.ts`)
- **Single user, no auth.** Whoever is at the console can schedule contacts and raise reports as any
  employee. Matches the API, which has no notion of identity.
- **The client clock is roughly correct.** Pass phases and countdowns compare server times against
  `Date.now()` with no server-time sync.
- **Desktop first.** Hover interactions (map track highlight) are enhancements; nothing depends on them.
- **Dev-scale performance envelope.** Pass searches cost ~100 ms per in-orbit satellite over ten stations
  and run on the main thread, so the design assumes tens of active satellites, not hundreds. The
  `SEED_PROFILE=large` status mix is sized to this. (measured)
- **One environment owns `node_modules` at a time.** The Docker bind mount shares it between host and
  container, so switching sides means reinstalling. (`docker-compose.yml`)
