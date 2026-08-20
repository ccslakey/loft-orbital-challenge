# Decisions

A running log of the calls I made and why. One line of fact per entry; the **Why**
is mine to fill in as I go. Keep it terse — fuller narrative lives in
[`WORK_SUMMARY.md`](./WORK_SUMMARY.md).

---

### Data layer: Apollo Client + GraphQL Codegen (client preset)
Types generated from a committed `schema.graphql` snapshot, not the live API.
**Why:** _TODO — so codegen / type-check / CI run with no server up._

### State: Apollo cache only, no Redux/Zustand
Everything on screen is server state; the normalized cache is the single store.
**Why:** _TODO — threshold for adding a client store hasn't been hit._

### Styling: SCSS Modules, no utility framework
Tokens, mixins and global base in `src/styles/`.
**Why:** _TODO_

### Design: "colour is state"
Ink/graphite ground; saturated colour only encodes a real thing's state.
Enforced by `src/lib/status.ts` mapping raw statuses to a closed state set.
**Why:** _TODO — why this over a conventional dark dashboard._

### Live positions: 5s polling
Server recomputes from TLEs every second and exposes no subscriptions.
**Why:** _TODO_

### Live positions (planned): client-side TLE propagation
SGP4 in the browser (`satellite.js`); poll slowly only to correct drift.
Spiked 2026-08-19, de-risked — see [`plans/contact-planning-map.md`](./plans/contact-planning-map.md).
**Why:** _TODO_

### Map (planned): contact-planning view at `/map`, d3-geo over SVG
Equirectangular SVG, d3-geo for projection/footprints/antimeridian clipping.
Plan and rejected alternatives in [`plans/contact-planning-map.md`](./plans/contact-planning-map.md).
**Why:** _TODO_

### Map L3: contact windows via coarse scan + bisection
30 s steps over a 24 h horizon, crossings refined by bisection; an
inclination/apogee reachability bound skips pairs that can never see each other.
**Why:** _TODO_

### Map L2: 10° elevation mask; footprints/links skip inert assets
Geometric LOS only, per the plan's scope; decommissioned satellites and
offline stations keep their marker but cast no footprint or link.
**Why:** _TODO_

### Map L1: satellite.js pinned to server's 5.0.0; `/map` is a lazy chunk
Same version rules out client/server skew; the route carries ~100 KB of world
geometry, so it code-splits instead of joining the vendor bundle.
**Why:** _TODO_

### Map: ground tracks, one orbit ahead, minute-bucketed
Each serviceable satellite draws its next full orbit as a dashed muted line
(`groundTrack` in `lib/propagation.ts`, ~128 samples, d3-geo antimeridian
clipping free). Track shape drifts only with Earth rotation, so it recomputes
per minute, not on the 1 Hz clock. Inert satellites keep only their marker.
**Why:** _TODO — the planning half of a contact map is where satellites are
going, not just where they are._

### Fleet: client-side filter/sort, state in URL search params
Filtering/sorting over the polled set (derived sort fields, join-through-payload
customer filter); the URL is the store, so views are shareable links. Stale
param values deactivate the filter rather than matching nothing.
Plan in [`plans/fleet-filter-sort.md`](./plans/fleet-filter-sort.md).
**Why:** _TODO_

### Fleet: next-contact column cached 60 s, keyed by TLE + station set
The full-fleet window search costs ~100 ms (measured), too heavy for the 5 s
position poll; entries also refresh when their cached pass ends.
**Why:** _TODO_

### Fleet: ground-track strip replaced by a 24 h pass timeline
The strip was a 1-D longitude gauge — right model for GEO slots, noise for a
LEO fleet, and outclassed by `/map`. The timeline draws every contact window
(full-horizon enumeration, ~200 ms measured, same 60 s cache) as
state-coloured segments; rendering clamps against the current time, so a
stale cache only misses windows entering the far end of the horizon.
**Why:** _TODO — dead pixels vs. the window-picking surface scheduling needs._

### Fleet: search input owns its value, URL written debounced
React Router applies `setSearchParams` in a transition, so a controlled input
bound straight to the URL drops fast keystrokes (hit during testing); a ref
distinguishes our writes flushing back from external changes (back/forward).
**Why:** _TODO_

### Contacts: scheduling at `/contacts`, request intake out of scope
Schedule list + a three-section form ending in `createContact`; fleet pass
timeline deep-links in via URL params. `Contact.date` stores the window's AOS;
LOS is derived physics, recomputed against the current TLE (a stored LOS
freezes at scheduling-day accuracy). Double-booking (same station or same
satellite) warns via interval checks over recomputed busy windows plus a
fixed pre/post-pass pad — warn, never block.
Plan in [`plans/contact-scheduling.md`](./plans/contact-scheduling.md).
**Why:** _TODO_

### Writes are ephemeral: persistence consciously out of scope
json-graphql-server holds the db in memory; a restart re-seeds it, discarding
created contacts and comments. Left as-is: the schema is the evaluated
contract, storage is template design, and within one review session writes
hold. If it mattered: a JSON snapshot on the server (~40 lines, dates revived
on load) — rejected alternatives were client-side cache persistence (an
illusion the first refetch clobbers) and a real DB (reimplements the entire
generated schema surface).
**Why:** _TODO — the evaluated surface is the client; effort goes there._

### Seed ids: stable literals instead of boot-time `uuid()`
`db.ts` generated every id fresh per server start, so all URLs referencing
ids (fleet filters, scheduler deep-links) died on restart. Ids are now
readable slugs (`satellite-yam-3`, `customer-google`); `uuid` dependency
dropped.
**Why:** _TODO — URL-as-store is only shareable if ids survive restarts._

### Reports page: the deliberate place to demonstrate writes
Read-only everywhere else; `/reports` adds `createComment` with an optimistic
cache update (patch `Report.Comments` via `cache.modify`, roll back on error).
**Why:** _TODO — one honest write path beats faking many._

### Comment author: explicit employee picker, no faked auth
API has no current-user concept, so a `<select>` of `allEmployees` sets
`employee_id` rather than hardcoding a stand-in user.
**Why:** _TODO — honest about the missing auth instead of hiding it._

### Satellite detail: activity split from the position poll
Contacts and reports arrive via a second, non-polling query using the
`Satellite.Contacts` / `Satellite.Reports` reverse relations; both queries
normalize into the same `Satellite` cache entity. Plan in
[`plans/satellite-detail.md`](./plans/satellite-detail.md).
**Why:** _TODO — report threads shouldn't re-fetch on every 5 s position tick._

### Satellite detail: flat contact list, not `/contacts`' three groups
One table sorted in-progress → upcoming → past, phase as a chip per row.
**Why:** _TODO — per-satellite counts are small; grouped sections would be
mostly empty states._

### Satellite detail: TLE staleness flagged at 14 days
`lib/orbit.ts` derives elements + epoch from the satrec; an epoch older than
14 d gets a caution chip beside the orbit readout.
**Why:** _TODO — stale elements quietly corrupt the pass predictions shown
above them._

### Station detail: the satellite page inverted, one unpolled query
`/ground-stations/:id` shows passes of every serviceable satellite over the
one station, the station's contacts and reports. No polling/static split —
stations don't move. `/contacts` filter generalized to `?station=`. Plan in
[`plans/station-detail.md`](./plans/station-detail.md).
**Why:** _TODO — the ground segment deserved the same treatment; a station is
half of every contact._

### Comments: terse, business-logic only
Design-rationale prose stripped from source; it lives in the README/PR instead.
**Why:** Rationale in source goes stale and can be wrong. _(expand if needed)_

### Testing: pure logic, not components
27 Vitest tests over `lib/status`, `lib/tle`, `lib/format`.
**Why:** _TODO — deliberate scope, or add component tests._

### Template change: mount on `#root`, not `document.body`
Added `<div id="root">`; React warns about owning body and extensions break it.
**Why:** _(self-explanatory)_

### Dependency: upgraded `json-graphql-server` 3.1.1 → 3.3.1
Bundled GraphiQL never loaded on 3.1.1 (unpinned unpkg CDN 404s on v5).
**Why:** _TODO — rot bug vs. deliberate gotcha; worth raising on the call._

### Tooling: added ESLint (flat config, not strict)
Template README claims configs exist; none did.
**Why:** _TODO_

### CI: GitHub Actions, five parallel gates
`test`, `lint`, `lint:styles`, `format:check`, `build` on every PR + push to
`main`. Matrix with `fail-fast: false` so a PR shows all failures at once.
**Why:** _TODO — GitHub-hosted, so Actions; build gate catches the codegen /
prettier string desync that unit tests can't._

### Formatting: added Prettier + Stylelint, pinned to existing style
Prettier `printWidth 120` / `bracketSpacing false` to match the hand-written
style (near-zero restyle). Stylelint `standard-scss`, relaxed for SCSS-Module
camelCase class names. Both gated in CI.
**Why:** _TODO — README claimed Prettier existed; now it does. Stylelint
already caught a real bug (deprecated `clip` → `clip-path`)._

---

### Open / not decided
- Component tests?
