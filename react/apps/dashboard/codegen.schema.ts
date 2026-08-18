/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {CodegenConfig} from "@graphql-codegen/cli";

/* Configuration //////////////////////////////////////////////////////////////////////////////////////////////////// */

const config: CodegenConfig = {
  schema: process.env.VITE_GRAPHQL_URL ?? "http://localhost:3000/graphql",

  generates: {
    "./schema.graphql": {
      plugins: ["schema-ast"],
    },
  },
};

export default config;

