/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {CodegenConfig} from "@graphql-codegen/cli";

/* Configuration //////////////////////////////////////////////////////////////////////////////////////////////////// */
// Types are generated from the committed `schema.graphql` snapshot rather than the live server, so `pnpm codegen`,
// type-checking and CI all work without a running API. Refresh the snapshot with `pnpm codegen:schema`.

const config: CodegenConfig = {
  schema: "./schema.graphql",

  documents: ["./src/**/*.{ts,tsx}", "!./src/gql/**/*"],

  ignoreNoDocuments: true,

  generates: {
    "./src/gql/": {
      preset: "client",

      presetConfig: {
        // Fragment masking hides fragment fields from the parent component unless unmasked. It is a good pattern on
        // large teams, but it adds ceremony that is not worth it at this size. Disabled deliberately.
        fragmentMasking: false,
      },

      config: {
        // `json-graphql-server` exposes two custom scalars. `Date` is serialised as an ISO-8601 string over the wire.
        // `JSON` is genuinely unstructured (satellite `tle` and `specs`), so it is typed as `unknown` values to force
        // an explicit narrowing at the call site instead of silently trusting `any`.
        scalars: {
          Date: "string",
          JSON: "Record<string, unknown>",
        },
      },
    },
  },
};

export default config;
