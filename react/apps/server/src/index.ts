/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import cors from "cors";
import express from "express";
import jsonGraphqlExpress from "json-graphql-server/node";

import db from "./db.js";
import {applyLargeSeedProfile} from "./seedLarge.js";

/* Server /////////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Opt-in demo dataset (~60 satellites, extra stations) for exercising the UI at a larger scale.
if (process.env.SEED_PROFILE === "large") {
  applyLargeSeedProfile(db);
}

const app = express();

app.use(cors());

app.use("/graphql", jsonGraphqlExpress(db));

app.listen(3000);
