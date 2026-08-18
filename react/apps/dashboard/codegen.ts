/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {CodegenConfig} from "@graphql-codegen/cli";

/* Configuration //////////////////////////////////////////////////////////////////////////////////////////////////// */
// Generated from the committed schema.graphql so codegen and type-checking work with no server running.

const config: CodegenConfig = {
  schema: "./schema.graphql",

  documents: ["./src/**/*.{ts,tsx}", "!./src/gql/**/*"],

  ignoreNoDocuments: true,

  generates: {
    "./src/gql/": {
      preset: "client",

      presetConfig: {
        // Off: adds indirection not worth it at this size.
        fragmentMasking: false,
      },

      config: {
        // JSON is unstructured (tle, specs); typed as unknown values to force narrowing at the call site.
        scalars: {
          Date: "string",
          JSON: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;

