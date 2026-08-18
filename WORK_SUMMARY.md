# Work summary

> **This is a skeleton, not a finished document.** Sections marked `TODO` need to be written in your own words before
> submitting. The factual sections below are accurate as of this commit and can be edited freely.

## Submission

The submission is the **React** variant, in [`react/`](./react).

> TODO: delete the `vue/` directory before submitting, or say explicitly here why both are present.

## Running it

```sh
cd react
make dev          # builds the dev image, starts the container, drops you into a shell
pnpm install      # inside the container
pnpm dev          # dashboard on :8080, API on :3000/graphql
```

Everything runs inside Docker because the workspace pins Node `>=20.10.0 <21`.

| Command | Result |
| --- | --- |
| `pnpm build` | Type-check and production build, both exit 0 |
| `pnpm test` | 27 tests across 3 files |
| `pnpm lint` | Clean |
| `pnpm codegen` | Regenerates typed documents; works with no server running |
| `pnpm codegen:schema` | Re-introspects the live API into `schema.graphql`; needs the server up |

## What was built

A fleet operations console with four routes under a persistent shell:

| Route | View |
| --- | --- |
| `/fleet` | Satellite list with live sub-satellite positions |
| `/fleet/:satelliteId` | Position, spacecraft, launch, TLE, payloads and their customers |
| `/ground-stations` | Contracted antenna sites |
| `/reports` | Routed, **not implemented** |

## Architecture

**Data layer.** Apollo Client with GraphQL Codegen (client preset). Types are generated from a committed
`schema.graphql` snapshot rather than the live API, so type-checking and CI work without a running server.

**State management.** Apollo's normalized cache is the only store; there is no Redux/Zustand layer. Every piece of
state on screen is server state, and adding a second store would mean keeping two copies of it in sync.

> TODO: this is the "discuss your approach to state management" bonus item. Expand it — say what you would reach for
> if genuinely client-only state appeared (filters, selections, draft forms), and why that threshold has not been hit
> yet.

**Styling.** SCSS Modules, no utility-class framework. Tokens, mixins and global base live in
`react/apps/dashboard/src/styles/`.

**Design direction — "colour is state".** The interface is ink and graphite on a cool ground. Saturated colour is
reserved exclusively for encoding the state of a real thing and is never decorative. The rule is enforced in code:
`src/lib/status.ts` maps every raw status string the API can return onto a closed set of operational states, and only
that state reaches the stylesheets.

> TODO: add your own reasoning here. Why this direction over a conventional dark dashboard?

**Live positions.** The server recomputes satellite coordinates from TLEs every second and exposes no subscriptions,
so the client polls every 5s. The fleet list's ground-track column plots each satellite's longitude on an
equirectangular strip, which drifts as the poll returns.

## Notes on the provided API

Things worth knowing about `json-graphql-server` that shaped the client:

- **`perPage` is silently ignored unless `page` is also supplied.** Both are always sent. This looks exactly like
  broken pagination if you hit it cold.
- **Enums do not survive.** The server's TypeScript enums (`SatelliteStatus`, `LaunchStatus`, …) are exposed as plain
  `String!`, so status values arrive unvalidated. `src/lib/status.ts` exists because of this.
- **Nullability is loose.** List fields are typed `[Satellite]`, a nullable list of nullable elements, so results need
  a null filter to be usable in TypeScript.
- `tle` and `specs` are the opaque `JSON` scalar, mapped to `Record<string, unknown>` to force explicit narrowing.
- **The built-in GraphiQL page is broken out of the box.** See below.

### The GraphiQL page

Opening <http://localhost:3000/graphql> in a browser showed `Loading...` forever. The API itself was fine the whole
time — `POST /graphql` returned 200 throughout.

`json-graphql-server@3.1.1` serves a GraphiQL page that loads its assets from **unpinned** unpkg URLs:

```html
<script src="https://unpkg.com/graphiql/graphiql.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
```

Unpinned resolves to whatever is latest, which is now GraphiQL v5. v5 no longer ships a UMD bundle at that path, so
both requests 404 while React itself loads fine, leaving the page stuck on its static placeholder:

```
react.production.min.js   HTTP 200
graphiql.min.js           HTTP 404  ->  unpkg.com/graphiql@5.2.4/graphiql.min.js
graphiql.min.css          HTTP 404  ->  unpkg.com/graphiql@5.2.4/graphiql.min.css
```

Nothing in this repo caused it. The HTML was written when latest was v2; the breakage arrived on its own as the CDN
moved on.

**Fix:** `apps/server/src/index.ts` now serves its own GraphiQL page with pinned versions (`graphiql@3.8.3`,
`react@18.3.1`), registered ahead of the library's handler. It only intercepts requests that accept HTML, so
programmatic GETs and every POST still fall through to `json-graphql-server` untouched.

> TODO: worth raising on the walkthrough call. This is either an unnoticed rot bug in the template or a deliberate
> gotcha to see whether candidates investigate rather than assume their own API is broken. Either way, say which you
> think it is and how you traced it.

## Changes made to the project template

The challenge asks for these to be called out.

| Change | Reason |
| --- | --- |
| `main.tsx` mounts on a `#root` div instead of `document.body` | React warns about owning `body`; extensions inject siblings there and can break reconciliation |
| Added `<div id="root">` to `index.html` | Required by the above |
| `apps/server/src/db.ts`: `Object` → `object` (3 fields) | `Object` is the wrapper type; `object` is correct. Type-level only, no behaviour change |
| `vite.config.ts`: added Sass `includePaths` | Lets modules `@use "mixins"`. Vite 5.3 drives Sass through its legacy API, which reads `includePaths`, not `loadPaths` |
| `docker-compose.yml`: commented out `version: "3.8"` | Obsolete key; Compose warns on every command |
| Added ESLint | The template README claims ESLint and Prettier configs are provided, but no config exists anywhere in the template |
| `apps/server/src/index.ts`: serve a pinned GraphiQL page | The bundled one 404s against current unpkg and never loads (see above) |

## Testing

27 tests covering the business logic, not the components:

- `lib/status.ts` — status→state mapping, including every value in the server's enums and the unknown-value fallback
- `lib/tle.ts` — TLE validation and NORAD catalog number extraction
- `lib/format.ts` — coordinate/altitude formatting and longitude→track-position wrapping

> TODO: component tests are not present. Either add a couple (React Testing Library is not installed yet) or state
> here that you scoped testing to pure logic deliberately.

## Not implemented

Being explicit about the edges:

- **`/reports`** is routed and styled but not built. `allReports` exposes threaded comments and a `createComment`
  mutation, which is the obvious place to demonstrate writes and optimistic cache updates.
- **No mutations anywhere.** The app is read-only.
- **No CI pipeline** and no production Docker image.
- **Accessibility** is at the "reasonably accessible" floor the brief asks for: visible focus, semantic tables and
  lists, `prefers-reduced-motion` respected. Not screen-reader audited.
- **Seed data is small** (7 satellites, 9 ground stations, 1 constellation, 1 report), so views are designed for
  sparse data.

## AI usage

> TODO: **This section must be accurate and in your own words — the challenge asks for it explicitly, and it is the
> one section you should not delegate.** A factual account of what actually happened is below; edit it into your own
> voice and correct anything you disagree with.

Claude Code was used substantially throughout. Concretely:

- **Environment and verification** — bringing up the Docker environment, and running the build, type-check, tests and
  browser checks after each change.
- **Scaffolding** — the Apollo client and codegen configuration, the router, the SCSS token system, and the route
  components were largely AI-written under direction.
- **Investigation** — the API quirks documented above (the `perPage`/`page` behaviour, the flattened enums, the loose
  nullability) were found by probing the running server rather than assumed.
- **Review and correction** — several defects were caught this way, including a clipped TLE display, satellite names
  wrapping at narrow widths, and a TypeScript directive being deleted during a comment cleanup.

> TODO: state which parts you directed, changed, or rejected, and which decisions were yours. The policy asks that
> core logic, architecture and key design decisions be your own work — describe honestly where that line fell.

## Remaining TODOs before submitting

- [ ] Delete `vue/`
- [ ] Write the AI usage section in your own words
- [ ] Fill in the state management and design rationale sections
- [ ] Decide whether `/reports` ships unbuilt or gets implemented
- [ ] Consider adding Prettier (the template README claims it exists; it does not)
- [ ] `make clean` before packaging, to strip `node_modules` and build output
