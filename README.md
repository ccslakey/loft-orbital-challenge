# Fleet Operations

A fleet operations console for a ride-share satellite operator: live sub-satellite positions propagated
from TLEs, a contact-planning map with ground tracks and visibility footprints, pass prediction and
contact scheduling with double-booking detection, and incident reports with threaded comments.

Built with React, TypeScript, Apollo Client and GraphQL Codegen, SCSS Modules, satellite.js for SGP4
propagation, and Vitest. The app lives in [`react/`](./react). The mock GraphQL API in
[`react/apps/server`](./react/apps/server) and the Docker dev environment started from a starter template;
[`WORK_SUMMARY.md`](./WORK_SUMMARY.md) lists every change made to them.

## Running it

```sh
cd react
make dev          # builds the dev image, starts the container, drops you into a shell
pnpm install      # inside the container
pnpm dev          # dashboard on :8080, API on :3000/graphql
```

Everything runs inside Docker because the workspace pins Node `>=20.10.0 <21`.

## Where to look

| Document | What it covers |
| --- | --- |
| [`WORK_SUMMARY.md`](./WORK_SUMMARY.md) | What was built, architecture, changes to the template, testing, decisions |
| [`ASSUMPTIONS.md`](./ASSUMPTIONS.md) | Assumptions baked into the code, each pointing at where it lives |
| [`react/README.md`](./react/README.md) | Workspace layout and every available script |
| [`react/apps/dashboard/README.md`](./react/apps/dashboard/README.md) | Front-end architecture: data layer, routing, styling, design direction |

## AI usage

Claude Code was used substantially throughout. Specifically:

- **Environment and verification** — bringing up the Docker environment, and running the build, type-check, tests and
  browser checks after each change. (side by side testing)
- **Scaffolding** — the Apollo client and codegen configuration, the router, the SCSS token system, and the route
  components were largely AI-written under direction.
- **Investigation** — API quirks, SGP4 math and satellite.js interface
- **Review and correction** — several defects were caught this way, including various clipped displays, and a TypeScript directive being deleted during a comment cleanup.
