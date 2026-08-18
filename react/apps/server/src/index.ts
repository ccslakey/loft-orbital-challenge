/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import cors from "cors";
import express from "express";
import jsonGraphqlExpress from "json-graphql-server/node";

import db from "./db.js";

/* GraphiQL ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// json-graphql-server's built-in GraphiQL page loads its assets from unpinned unpkg URLs. `graphiql@latest` is now v5,
// which no longer ships graphiql.min.js, so that page 404s and hangs on "Loading...". Serve a pinned page instead.

const REACT_VERSION = "18.3.1";
const GRAPHIQL_VERSION = "3.8.3";

const graphiqlPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Fleet Operations API</title>
    <link rel="stylesheet" href="https://unpkg.com/graphiql@${GRAPHIQL_VERSION}/graphiql.min.css" />
    <style>
      body { margin: 0; height: 100vh; overflow: hidden; }
      #graphiql { height: 100vh; }
    </style>
  </head>
  <body>
    <div id="graphiql">Loading GraphiQL…</div>
    <script crossorigin src="https://unpkg.com/react@${REACT_VERSION}/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@${REACT_VERSION}/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/graphiql@${GRAPHIQL_VERSION}/graphiql.min.js"></script>
    <script>
      const root = ReactDOM.createRoot(document.getElementById("graphiql"));
      const fetcher = GraphiQL.createFetcher({url: "/graphql"});
      root.render(React.createElement(GraphiQL, {fetcher, defaultEditorToolsVisibility: true}));
    </script>
  </body>
</html>
`;

/* Server /////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const app = express();

app.use(cors());

// Only intercepts browser page loads. Programmatic GETs do not accept HTML, so they fall through, as does every POST.
app.get("/graphql", (request, response, next) => {
  if (!request.accepts("html")) {
    next();
    return;
  }

  response.type("html").send(graphiqlPage);
});

app.use("/graphql", jsonGraphqlExpress(db));

app.listen(3000);
