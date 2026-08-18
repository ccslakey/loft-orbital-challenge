/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {ApolloClient, CombinedGraphQLErrors, HttpLink, InMemoryCache} from "@apollo/client";
import {ErrorLink} from "@apollo/client/link/error";

/* Links //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const httpLink = new HttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:3000/graphql",
});

// Central place to observe failures. A `CombinedGraphQLErrors` instance means the request reached the server but one
// or more fields failed; anything else is a transport failure (server down, CORS, offline). This link only reports —
// it deliberately does not swallow the error, so components still receive it and can render their own recovery UI.
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
          // `allSatellites` is filtered and sorted via arguments. Keying cache entries by those arguments keeps
          // distinct result sets from overwriting one another while paging and filtering.
          allSatellites: {
            keyArgs: ["filter", "sortField", "sortOrder", "perPage"],
          },
        },
      },
    },
  }),
});
