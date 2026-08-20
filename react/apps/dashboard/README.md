# Dashboard

The Fleet Operations console: live satellite positions propagated client-side from TLEs, a contact map
with ground tracks and visibility footprints, pass prediction and contact scheduling with double-booking
detection, and incident reports with threaded comments.

You can access the dashboard client by visiting `localhost:8080` in your browser (started via `pnpm dev`
at the workspace root — see [`../../README.md`](../../README.md)).

## Tech Stack

- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Sass](https://sass-lang.com/)
- [GraphQL](https://graphql.org/)
- [Vite](https://vitejs.dev/guide/)
- [Apollo Client](https://www.apollographql.com/docs/react/) for requesting and caching GraphQL data
- [GraphQL Codegen](https://the-guild.dev/graphql/codegen) for typed operations
- [React Router](https://reactrouter.com/) for client-side routing
- SCSS Modules for styling (no utility-class framework)

## Scripts

- `pnpm build` --> Type-checks `src/` and compiles the web app using [Vite](https://vitejs.dev/guide/), in parallel
- `pnpm dev` --> Vite dev server with HMR on `localhost:8080`
- `pnpm start` --> Serves the production build (`vite preview`)
- `pnpm type-check` --> `tsc` over the app **including tests** plus `vite.config.ts`; part of the CI matrix
- `pnpm codegen` --> Regenerates typed documents in `src/gql/` from the committed `schema.graphql`. Run after adding or editing a GraphQL operation.
- `pnpm codegen:schema` --> Re-introspects the running API and rewrites `schema.graphql`. Requires the server to be up; only needed when the API schema itself changes.
- `pnpm codegen:refresh` --> Both of the above in sequence; CI runs this against a live server and fails on drift.

## Data layer

The Apollo client lives in `src/api/client.ts`. It points at `http://localhost:3000/graphql` by default and can be
redirected with the `VITE_GRAPHQL_URL` environment variable.

Types are generated from the **committed `schema.graphql` snapshot** rather than from the live API, so `pnpm build`,
type-checking and CI all work without a running server. The generated `src/gql/` directory is committed for the same
reason — a fresh clone type-checks before anything is started.

### Notes on the generated schema

- `json-graphql-server` flattens the server's TypeScript enums (`SatelliteStatus`, `LaunchProvider`, …) into plain
  `String!` fields, so enum values are not type-safe on the client. Narrow them yourself where it matters.
- `tle` and `specs` are the opaque `JSON` scalar, mapped to `Record<string, unknown>` so that reading them forces an
  explicit narrowing step. See `src/lib/tle.ts` for the pattern.
- `perPage` is ignored unless `page` is also supplied — always send both.
- Satellite positions are recomputed from TLEs server-side once per second. There are no subscriptions, so keeping
  coordinates live means polling.

## Routing

`src/router.tsx` defines a single layout route that owns the shell, so the header and navigation persist across
navigations and only the outlet re-renders.

| Route                         | View                                                                        |
| ----------------------------- | --------------------------------------------------------------------------- |
| `/`                           | Redirects to `/fleet`                                                       |
| `/fleet`                      | Satellite list: live positions, filters/sort/search in the URL, pass strips |
| `/fleet/:satelliteId`         | Satellite detail: position poll, orbit, upcoming passes, contacts, reports  |
| `/ground-stations`            | Contracted antenna sites                                                    |
| `/ground-stations/:stationId` | Station detail: upcoming passes across the fleet, contact history           |
| `/map`                        | Contact map (lazy chunk): 1 Hz markers, ground tracks, footprints, links    |
| `/contacts`                   | Scheduled contacts grouped by phase, windows recovered from current TLEs    |
| `/contacts/new`               | Schedule a contact: computed pass windows with conflict flagging            |
| `/reports`                    | Raise and read reports, with optimistic threaded comments                   |
| `*`                           | Not found                                                                   |

## Styling

SCSS Modules, no utility-class framework. Shared material lives in `src/styles/`:

- `_tokens.scss` — design tokens as CSS custom properties
- `_mixins.scss` — shared type, panel and breakpoint mixins
- `global.scss` — reset and base element styles

`vite.config.ts` adds `src/styles` to the Sass include path, so any module can reach the mixins with
`@use "mixins" as *;` rather than counting `../`s. Note that Vite 5.3 still drives Sass through its **legacy** API,
which reads `includePaths`; `loadPaths` is set alongside it for when the modern compiler becomes the default.

### Design direction: "colour is state"

The interface is ink and graphite on a cool ground. Saturated colour is reserved exclusively for encoding the state of
a real thing — a satellite's status, a launch outcome, a dropped link — and is never used decoratively. An operator can
therefore trust that anything coloured means something.

That rule is enforced in code rather than by convention. `src/lib/status.ts` maps every raw status string the API can
return onto a small closed set of operational states (`nominal`, `planned`, `caution`, `critical`, `inert`), and only
that state reaches the stylesheets. Unrecognised values degrade to `inert` instead of throwing, so a status the client
has never seen renders in a neutral colour rather than blanking the list.

The list view's ground-track column is the one deliberately bold element: a per-row equirectangular longitude strip
whose marker is positioned from live coordinates, so the column drifts each time the poll returns.

## Accessibility and motion

The floor is deliberately modest, per the challenge brief: visible keyboard focus, semantic table and list markup,
`prefers-reduced-motion` respected, and no page-level horizontal scrolling — wide tables scroll inside their own
container.
