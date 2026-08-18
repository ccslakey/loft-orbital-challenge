# Server

A server that exposes a custom GraphQL API for use in your project. You should **NOT** need to modify this server code in order to complete the given task. However, feel free to update the server, schema definition, or anthing else if you think it will improve the quality of your project.

You can access the API by sending HTTP `GET` or `POST` requests to `localhost:3000/graphql`. You can view a [GraphiQL](https://www.gatsbyjs.com/docs/how-to/querying-data/running-queries-with-graphiql/) playground by visiting `localhost:3000/graphql` in your browser.

Note that the [JSON GraphQL Server](https://github.com/marmelab/json-graphql-server) middleware uses [graphql-http](https://github.com/graphql/graphql-http) under the hood. Please refer to their documentations for details about passing variables, etc.

## Schema

The schema is defined in `db.ts`. Refer to the comments for more info.

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
