/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// The API flattens the server's TypeScript enums into plain `String!`, so status values arrive unvalidated. Rather
// than scatter string comparisons through the components, every status is funnelled through this module and mapped
// onto a small closed set of operational states. That set — not the raw string — is what drives colour in the UI.

export type State = "nominal" | "planned" | "caution" | "critical" | "inert";

/* Mappings ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Keys cover every value in the server's enums (`apps/server/src/db.ts`), not just the ones the seed data happens to
// use today. Values are grouped by what an operator should *do* about them, which is why "Maintenance" is a caution
// for a ground station (someone is working on it) but merely a category for a report.

const SATELLITE_STATES: Readonly<Record<string, State>> = {
  "In Orbit": "nominal",
  Planned: "planned",
  Decommissioned: "inert",
};

const GROUND_STATION_STATES: Readonly<Record<string, State>> = {
  Online: "nominal",
  Maintenance: "caution",
  Offline: "inert",
  Error: "critical",
  Unknown: "inert",
};

const LAUNCH_STATES: Readonly<Record<string, State>> = {
  Completed: "nominal",
  Active: "nominal",
  Pending: "planned",
  Terminated: "critical",
};

const PAYLOAD_STATES: Readonly<Record<string, State>> = {
  Active: "nominal",
  Inactive: "inert",
};

/* Lookup /////////////////////////////////////////////////////////////////////////////////////////////////////////// */

/**
 * Resolves a raw status string to an operational state.
 *
 * Unrecognised values fall back to `inert` rather than throwing. A status the client has never heard of is a reason to
 * show the row in a neutral colour, not a reason to blank the fleet list.
 */
const resolve = (table: Readonly<Record<string, State>>, status: string | null | undefined): State =>
  (status && table[status]) || "inert";

export const getSatelliteState = (status: string | null | undefined): State => resolve(SATELLITE_STATES, status);

export const getGroundStationState = (status: string | null | undefined): State =>
  resolve(GROUND_STATION_STATES, status);

export const getLaunchState = (status: string | null | undefined): State => resolve(LAUNCH_STATES, status);

export const getPayloadState = (status: string | null | undefined): State => resolve(PAYLOAD_STATES, status);
