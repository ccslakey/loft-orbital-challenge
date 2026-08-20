/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {ApolloClient, CombinedGraphQLErrors, HttpLink, InMemoryCache} from "@apollo/client";
import {ErrorLink} from "@apollo/client/link/error";

/* Links //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:3000/graphql",
});

// Reports without swallowing: the error still reaches useQuery so components can render their own recovery.
const errorLink = new ErrorLink(({error, operation}) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({message, path}) => {
      console.error(`[GraphQL] ${operation.operationName} — ${message}`, {path});
    });
  } else {
    console.error(`[Network] ${operation.operationName} — ${error.message}`);
  }
});

/* Client /////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const client = new ApolloClient({
  link: errorLink.concat(httpLink),

  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          // Key by args so filtered/sorted/paged result sets do not overwrite each other.
          allSatellites: {
            keyArgs: ["filter", "sortField", "sortOrder", "perPage", "page"],
          },
        },
      },
    },
  }),
});
