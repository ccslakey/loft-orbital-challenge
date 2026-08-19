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
Run SGP4 in the browser (`satellite.js`) to animate position between polls;
poll slowly only to correct drift. Server stays source-of-truth.
**Why:** _TODO — orbit is deterministic, so decouple smoothness from network.
1s polling pays more network for still-stepped motion; push/subscriptions
don't help a continuous firehose. Cost: own the math, reconcile client vs. server._
**Spike (2026-08-19):** de-risked. The server itself uses satellite.js 5.0.0
(`twoline2satrec → propagate → eciToGeodetic`, `apps/server/src/db.ts`); all
7 seed TLEs propagate at wall-clock now (`satrec.error=0` despite 2021–22
epochs) and client output matches the API within 0.02° / 0.4 km — sub-tick
skew only. Same library + same recipe = structural agreement.

### Map (planned): contact-planning view at `/map`, d3-geo over SVG
Top-level route; equirectangular SVG with d3-geo doing projection, geodesic
footprint circles and antimeridian clipping — styling stays in SCSS tokens.
Phased L1 positions → L2 footprints/links → L3 contact windows (AOS/LOS).
Scope exclusions recorded in WORK_SUMMARY's *Planned* section.
**Why:** _TODO — footprints/links are the point (contact narrative), and the
two hard geo problems are exactly what d3-geo solves; a WebGL globe can't be
token-styled and occludes half the fleet. Rejected: hand-rolled projection
(antimeridian + geodesic circles eat the time), react-simple-maps (component
layer fights per-frame animation), globe.gl._

### Reports page: the deliberate place to demonstrate writes
Read-only everywhere else; `/reports` adds `createComment` with an optimistic
cache update (patch `Report.Comments` via `cache.modify`, roll back on error).
**Why:** _TODO — one honest write path beats faking many._

### Comment author: explicit employee picker, no faked auth
API has no current-user concept, so a `<select>` of `allEmployees` sets
`employee_id` rather than hardcoding a stand-in user.
**Why:** _TODO — honest about the missing auth instead of hiding it._

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
