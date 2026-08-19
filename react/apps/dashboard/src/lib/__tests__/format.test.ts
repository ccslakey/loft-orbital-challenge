/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {formatAltitude, formatDate, formatLatitude, formatLongitude, longitudeToTrackPosition} from "@/lib/format.js";

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("formatLatitude", () => {
  it("qualifies the hemisphere instead of showing a minus sign", () => {
    expect(formatLatitude(10.372)).toBe("10.37\u00b0 N");
    expect(formatLatitude(-10.372)).toBe("10.37\u00b0 S");
  });

  it("treats the equator as northern by convention rather than rendering -0", () => {
    expect(formatLatitude(0)).toBe("0.00\u00b0 N");
  });

  it("renders an em dash when there is no fix", () => {
    expect(formatLatitude(null)).toBe("\u2014");
    expect(formatLatitude(undefined)).toBe("\u2014");
    expect(formatLatitude(Number.NaN)).toBe("\u2014");
  });
});

describe("formatLongitude", () => {
  it("uses east and west", () => {
    expect(formatLongitude(155.6)).toBe("155.60\u00b0 E");
    expect(formatLongitude(-68.4)).toBe("68.40\u00b0 W");
  });
});

describe("formatAltitude", () => {
  it("reports kilometres to one decimal", () => {
    expect(formatAltitude(578.83)).toBe("578.8 km");
  });

  it("renders an em dash when the altitude is unknown", () => {
    expect(formatAltitude(null)).toBe("\u2014");
  });
});

describe("longitudeToTrackPosition", () => {
  it("places the antimeridian at each edge and the prime meridian at the centre", () => {
    expect(longitudeToTrackPosition(-180)).toBe(0);
    expect(longitudeToTrackPosition(0)).toBe(0.5);
    expect(longitudeToTrackPosition(180)).toBe(0);
  });

  it("places a mid-longitude proportionally", () => {
    expect(longitudeToTrackPosition(-90)).toBe(0.25);
    expect(longitudeToTrackPosition(90)).toBe(0.75);
  });

  it("wraps rather than clamps once a satellite crosses the antimeridian", () => {
    expect(longitudeToTrackPosition(190)).toBeCloseTo(longitudeToTrackPosition(-170) as number, 10);
  });

  it("returns null when there is no fix", () => {
    expect(longitudeToTrackPosition(null)).toBeNull();
    expect(longitudeToTrackPosition(Number.NaN)).toBeNull();
  });
});

describe("formatDate", () => {
  it("formats an ISO date in UTC", () => {
    expect(formatDate("2021-01-09T00:00:00.000Z")).toBe("Jan 09, 2021");
  });

  it("renders an em dash for missing or unparseable values", () => {
    expect(formatDate(null)).toBe("\u2014");
    expect(formatDate("not a date")).toBe("\u2014");
  });
});
