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
