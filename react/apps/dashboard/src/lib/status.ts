/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// API returns status as String, not enum. Sole mapping from raw value to UI state.

export type State = "nominal" | "planned" | "caution" | "critical" | "inert";

/* Mappings ///////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Covers every value in the server enums (apps/server/src/db.ts), not just those present in seed data.

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

// Unknown status -> inert, never throws.
const resolve = (table: Readonly<Record<string, State>>, status: string | null | undefined): State =>
  (status && table[status]) || "inert";

export const getSatelliteState = (status: string | null | undefined): State => resolve(SATELLITE_STATES, status);

export const getGroundStationState = (status: string | null | undefined): State =>
  resolve(GROUND_STATION_STATES, status);

export const getLaunchState = (status: string | null | undefined): State => resolve(LAUNCH_STATES, status);

export const getPayloadState = (status: string | null | undefined): State => resolve(PAYLOAD_STATES, status);

