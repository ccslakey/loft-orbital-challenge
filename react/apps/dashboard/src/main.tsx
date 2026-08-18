/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {ApolloProvider} from "@apollo/client/react";
import React from "react";
import ReactDOM from "react-dom/client";

import {client} from "@/api/client.js";
import App from "@/components/App.jsx";

import "@/styles/global.scss";

/* Bootstrap //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Mounting on a dedicated node rather than `document.body`: React owns everything inside its root, and browser
// extensions commonly inject siblings into `body`, which can make React's reconciler throw on removal.
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container #root was not found in the document.");
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
