/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {
  getGroundStationState,
  getLaunchState,
  getPayloadState,
  getSatelliteState,
} from "@/lib/status.js";

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("getSatelliteState", () => {
  it("maps every value in the server's SatelliteStatus enum", () => {
    expect(getSatelliteState("In Orbit")).toBe("nominal");
    expect(getSatelliteState("Planned")).toBe("planned");
    expect(getSatelliteState("Decommissioned")).toBe("inert");
  });

  it("falls back to inert for values the client has never seen", () => {
    expect(getSatelliteState("Reentering")).toBe("inert");
  });

  it("falls back to inert for missing values", () => {
    expect(getSatelliteState(null)).toBe("inert");
    expect(getSatelliteState(undefined)).toBe("inert");
    expect(getSatelliteState("")).toBe("inert");
  });
});

describe("getGroundStationState", () => {
  it("separates a site under maintenance from one that has failed", () => {
    expect(getGroundStationState("Maintenance")).toBe("caution");
    expect(getGroundStationState("Error")).toBe("critical");
  });

  it("treats offline and unknown as an absence of signal", () => {
    expect(getGroundStationState("Offline")).toBe("inert");
    expect(getGroundStationState("Unknown")).toBe("inert");
  });

  it("maps an online site to nominal", () => {
    expect(getGroundStationState("Online")).toBe("nominal");
  });
});

describe("getLaunchState", () => {
  it("treats a terminated launch as critical", () => {
    expect(getLaunchState("Terminated")).toBe("critical");
  });

  it("maps completed and active launches to nominal", () => {
    expect(getLaunchState("Completed")).toBe("nominal");
    expect(getLaunchState("Active")).toBe("nominal");
  });
});

describe("getPayloadState", () => {
  it("maps the payload lifecycle", () => {
    expect(getPayloadState("Active")).toBe("nominal");
    expect(getPayloadState("Inactive")).toBe("inert");
  });
});
