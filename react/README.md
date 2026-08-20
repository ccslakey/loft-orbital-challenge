# Fleet Operations

A console for managing a fleet of ride-share satellites: live sub-satellite positions derived from
two-line element sets, the payloads and customers flying on each bus, and the ground stations contracted to talk to
them.

See [`WORK_SUMMARY.md`](../WORK_SUMMARY.md) for what was built and why, and
[`apps/dashboard/README.md`](./apps/dashboard/README.md) for the front-end architecture.

## Running it

1. `make dev` builds the dev image, starts the container and drops you into a shell.
2. `pnpm install` inside the container.
3. `pnpm dev` — dashboard on <http://localhost:8080>, API on <http://localhost:3000/graphql>.

The workspace requires Node `>=20.10.0 <21`, which is why the Docker environment exists; do not expect a host with a
newer Node to work.

Optional: `SEED_PROFILE=large pnpm dev` starts the API with a bigger demo dataset — 62 satellites with
real CelesTrak TLEs and 17 ground stations — to exercise the fleet filters, the map at density, and the
list-truncation notices. See [`apps/server/README.md`](./apps/server/README.md).

## Tech Stack

- [pnpm](https://pnpm.io/)
- [Turbo](https://turbo.build/repo)
- [Vitest](https://vitest.dev/)
- [ESLint](https://eslint.org/)

## Scripts

**Makefile**

- `make help` --> Show a more detailed version of available Makefile commands
- `make dev` --> Start your development environment
- `make clean` --> Remove all temporary files like installed modules and build output, resets the dev environment

**Package.json**

- `pnpm build` --> Runs the `build` script in all workspaces
- `pnpm dev` --> Runs the `dev` script in all workspaces
- `pnpm start` --> Runs the `start` script in all workspaces
- `pnpm test` --> Runs tests
- `pnpm test:watch` --> Runs tests in watch mode
- `pnpm test:coverage` --> Runs tests and collects coverage
- `pnpm type-check` --> `tsc` over every workspace, including dashboard tests and the server
- `pnpm lint` --> Lints every workspace with ESLint (`--max-warnings 0`)
- `pnpm lint:fix` --> Lints and applies fixes
- `pnpm lint:styles` --> Stylelint over the SCSS (`lint:styles:fix` to write)
- `pnpm format:check` --> Prettier check (`pnpm format` to write)

Every one of these (plus a codegen-drift check against a live server) runs as a separate job in CI.
