/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {CodegenConfig} from "@graphql-codegen/cli";

/* Configuration //////////////////////////////////////////////////////////////////////////////////////////////////// */
// Introspects the running API and writes the SDL snapshot that `codegen.ts` consumes. Requires the server to be up
// (`pnpm dev`). Run this only when the API schema changes, then commit the regenerated `schema.graphql`.

const config: CodegenConfig = {
  schema: process.env.VITE_GRAPHQL_URL ?? "http://localhost:3000/graphql",

  generates: {
    "./schema.graphql": {
      plugins: ["schema-ast"],
    },
  },
};

export default config;
