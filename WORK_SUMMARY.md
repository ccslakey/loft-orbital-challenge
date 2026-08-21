# Work summary

## Submission

The submission is the **React** variant, in [`react/`](./react).

## Running it

```sh
cd react
make dev          # builds the dev image, starts the container, drops you into a shell
pnpm install      # inside the container
pnpm dev          # dashboard on :8080, API on :3000/graphql
```

Everything runs inside Docker because the workspace pins Node `>=20.10.0 <21`.

Optional: `SEED_PROFILE=large pnpm dev` starts the API with ~60 satellites (real CelesTrak TLEs for Iridium
NEXT, Planet, Spire, and OneWeb) and 17 ground stations instead of the default seven and nine. It exercises
the fleet filters, the map at density, and the list-truncation notices ("first 50 of 62 tracked"). The
status mix is deliberately weighted toward decommissioned satellites: pass searches cost ~100 ms per
in-orbit satellite over ten stations, and the in-orbit share is sized to keep the fleet page responsive —
the same accuracy/CPU trade-off documented under Testing.

| Command | Result |
| --- | --- |
| `pnpm build` | Type-check and production build, both exit 0 |
| `pnpm test` | 92 tests across 9 files |
| `pnpm type-check` | `tsc` over the dashboard (tests included) and the server |
| `pnpm lint` | ESLint with `--max-warnings 0`, clean |
| `pnpm lint:styles` | Stylelint over the SCSS, clean |
| `pnpm format:check` | Prettier, clean (`pnpm format` to write) |
| `pnpm codegen` | Regenerates typed documents; works with no server running |
| `pnpm codegen:schema` | Re-introspects the live API into `schema.graphql`; needs the server up |

## What was built

A fleet operations console with eight routes under a persistent shell:

| Route | View |
| --- | --- |
| `/fleet` | Satellite list with live positions, pass timelines, and filter/sort/search kept in the URL |
| `/fleet/:satelliteId` | Satellite detail: position, orbit, spacecraft, launch, payloads, upcoming passes, contacts, reports |
| `/ground-stations` | Contracted antenna sites |
| `/ground-stations/:stationId` | Station detail: upcoming passes across the fleet and its contact history |
| `/map` | Contact-planning map: live client-propagated positions, ground tracks, footprints, links and next-contact windows |
| `/contacts` | Scheduled contacts grouped into in-progress, upcoming and past |
| `/contacts/new` | Schedule a contact: computed pass windows with double-booking warnings |
| `/reports` | Raise reports and comment on them, with an optimistic `createComment` write |

## Architecture

**Data layer.** Apollo Client with GraphQL Codegen (client preset). Types are generated from a committed
`schema.graphql` snapshot rather than the live API, so type-checking and CI work without a running server.

**State management.** Apollo's normalized cache is the only store; Redux/Zustand would be overkill for the current lightweight feature set. Positions, contacts, reports, employees are all a copy of server state so having a cheap copy in memory is sufficient. Sort, search and filtering live in URL state at this point. There simply aren't any components that need to share state with distant components, and there is no long lived state.


**Styling.** SCSS Modules, no utility-class framework. Tokens, mixins and global base live in
`react/apps/dashboard/src/styles/`.

**Design direction — "colour is state".** The interface is ink and graphite on a cool ground. Saturated colour is
reserved exclusively for state color in status pips, text, map elements, and other UI indicators.

**Live positions.** The server recomputes satellite coordinates from TLEs every second and exposes no subscriptions,
so the client polls every 5s. The fleet list's ground-track column plots each satellite's longitude on an
equirectangular strip, which drifts as the poll returns.

## Notes on the provided API

Quirks of `json-graphql-server` that shaped the client, found by probing the running server:

- `perPage` is silently ignored unless `page` is also supplied — both are always sent.
- The server's TypeScript enums arrive as plain `String!`, so `lib/status.ts` maps every status string
  onto a closed set of states, and unknown values degrade to a neutral colour instead of erroring.
- List fields are nullable lists of nullable elements, so results are null-filtered before use.
- `tle` and `specs` are the opaque `JSON` scalar, narrowed explicitly on read.
- The bundled GraphiQL page was broken out of the box: 3.1.1 loads its browser assets from an unpinned
  CDN link that rotted. Upgrading to 3.3.1 fixed it with no server code changes.

## Changes made to the project template

The challenge asks for these to be called out.

| Change | Reason |
| --- | --- |
| `main.tsx` mounts on a `#root` div instead of `document.body` | React warns about owning `body`; extensions inject siblings there and can break reconciliation |
| `apps/server/src/db.ts`: `Object` → `object` (3 fields) | `Object` is the wrapper type; `object` is correct. Type-level only, no behaviour change |
| `vite.config.ts`: added Sass `includePaths` | Lets modules `@use "mixins"`. Vite 5.3 drives Sass through its legacy API, which reads `includePaths`, not `loadPaths` |
| `docker-compose.yml`: commented out `version: "3.8"` | Obsolete key; Compose warns on every command |
| Added ESLint, Prettier and Stylelint | The template README references lint configs that don't exist |
| Upgraded `json-graphql-server` 3.1.1 → 3.3.1 | The bundled GraphiQL page never loads on 3.1.1. No server code changed |
| `db.ts`: seed ids are stable literals instead of boot-time `uuid()` | URLs that reference ids (fleet filters, scheduler deep-links) survive server restarts |
| Added a `type-check` task and fixed the tsconfigs behind it | Nothing type-checked tests, `vite.config.ts`, or the server before; the server also gained `@types/node` |
| `turbo.json`: `passThroughEnv: ["SEED_PROFILE"]` on `dev` | Turbo 2 strips undeclared env vars, so the seed flag never reached the server |
| `db.ts` exports its enums/types; added `seedLarge.ts` | Powers the optional `SEED_PROFILE=large` dataset; default data unchanged |
| Removed the two Vite folder-convention READMEs | Upstream boilerplate; the `public/` one shipped into `dist/` |

## Testing

92 tests covering the business logic, not the components:

- `lib/status.ts` — status→state mapping, including every value in the server's enums and the unknown-value fallback
- `lib/tle.ts` — TLE validation and NORAD catalog number extraction
- `lib/format.ts` — every exported formatter, including non-finite input guards
- `lib/propagation.ts` — TLE→satrec guards (including satellite.js accepting garbage with `error` still 0) and geodetic output sanity
- `lib/visibility.ts` — footprint radius, elevation geometry, and the mask/footprint-edge roundtrip
- `lib/windows.ts` — AOS/LOS search: a bounded LEO pass, a pass in progress, an unreachable latitude, and max-elevation refinement on an exact-zenith pass
- `lib/orbit.ts` — orbital elements derived from the satrec, TLE age
- `lib/fleet.ts` — window enumeration, timeline segments, filter/sort and URL-param round-trips
- `lib/contacts.ts` — contact phases, window recovery from a stored AOS, conflict detection

## Not implemented

Being explicit about the edges:

- **No production Docker image.** CI runs unit tests, lint, stylelint, format and build on every PR, but there is no
  built prod image or deploy step.
- **Accessibility** is at the "reasonably accessible" floor the brief asks for: visible focus, semantic tables and
  lists, `prefers-reduced-motion` respected. Not screen-reader audited.
- **Default seed data is small** (7 satellites, 9 ground stations), so views are designed for sparse data;
  `SEED_PROFILE=large` exists for scale.

## AI usage

See [AI usage](./README.md#ai-usage) in the root README.

## Decisions

### Seed ids: stable literals instead of boot-time `uuid()`
`db.ts` generated every id fresh per server start, so all URLs referencing
ids (fleet filters, scheduler deep-links) died on restart. 

**Why** Kind of annoying to deal with over long sessions in dev, would be irrelevant in production.

### Report creation is only in the /reports page
**Why** There's already a lot of details in the fleet and satellite detail pages. and the main goal of those detail pages is to make contact with the satellite fleet and ground control. I did allow users to comment on reports from a detail page so ongoing comms can be had.

### CI: GitHub Actions
**Why** Seven gates run on every push and PR: `test`, `type-check`, `lint`, `lint:styles`,
`format:check`, `build`, and a codegen-drift check against a live server. Ensures code quality and
consistency without relying on local discipline.

### Comment and contact author: explicit employee picker, no faked auth
**Why:** API has no current-user concept, so keeping it simple. Kept in to satisfy API contract and so we can play around with different users talking to each other

### Satellite detail: activity split from the position poll
**Why:** Contacts and reports come in from a non-polling query and merge into the same cache entity


## Concerns with larger datasets
1. findContactWindows walks a 24-hour horizon in 30-second steps, ~2,880 SGP4 calculations per satellite–station pair, on the main thread. On a larger fleet, I would consider moving scans to a background thread or lazy computing each row (or both)
2. No pagination currently. When testing with a larger dataset, there is no way to paginate through the results. I left this out because of the nature of the data and the time it takes to compute. A more mature app would have more detailed pagination and filtering capabilities.
