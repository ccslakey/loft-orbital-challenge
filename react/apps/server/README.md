# Server

The template-provided GraphQL API, kept intentionally close to stock: an in-memory
[JSON GraphQL Server](https://github.com/marmelab/json-graphql-server) whose schema is inferred from the
seed data in `db.ts`, with satellite positions recomputed from their TLEs once per second.

You can access the API by sending HTTP `GET` or `POST` requests to `localhost:3000/graphql`. You can view a [GraphiQL](https://www.gatsbyjs.com/docs/how-to/querying-data/running-queries-with-graphiql/) playground by visiting `localhost:3000/graphql` in your browser.

Note that the [JSON GraphQL Server](https://github.com/marmelab/json-graphql-server) middleware uses [graphql-http](https://github.com/graphql/graphql-http) under the hood. Please refer to their documentations for details about passing variables, etc.

## Schema and seed data

The entities and default seed data are defined in `db.ts`; the GraphQL schema is inferred from them at
startup, so a data-shape change is a schema change (CI regenerates the dashboard's `schema.graphql` from a
live instance and fails on drift).

### `SEED_PROFILE=large`

`SEED_PROFILE=large pnpm dev` (from the workspace root) starts the API with the optional demo dataset in
`seedLarge.ts`: ~55 extra satellites carrying real CelesTrak TLEs (Iridium NEXT, Planet Flock, Spire
Lemur, OneWeb) and eight additional real ground-station sites — 62 satellites and 17 stations in total.
The default dataset is untouched without the flag. The status mix is deliberately weighted toward
decommissioned satellites so the dashboard's pass searches stay responsive at demo scale.

## Tech Stack

- [Express](https://expressjs.com/)
- [JSON GraphQL Server](https://github.com/marmelab/json-graphql-server)
- [TypeScript](https://www.typescriptlang.org/)
- [GraphQL](https://graphql.org/)
- [ESBuild](https://esbuild.github.io/api/)
- [Nodemon](https://nodemon.io/)

## Scripts

- `pnpm build` --> Compiles the server using [ESBuild](https://esbuild.github.io/api/)
- `pnpm dev` --> Runs the build in watch mode and monitors the output for changes via [Nodemon](https://nodemon.io/) to automatically refresh the server process.
- `pnpm start` --> Runs the build output directly. Must run the `build` step prior to this.
- `pnpm type-check` --> `tsc` over all of `src/` (esbuild does not type-check); part of the CI matrix.
