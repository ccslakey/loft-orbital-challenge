/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {describe, expect, it} from "vitest";

import {getCatalogNumber, parseTle} from "@/lib/tle.js";

/* Fixtures ///////////////////////////////////////////////////////////////////////////////////////////////////////// */

const LINE_1 = "1    11U 59001A   22053.83197560  .00000847  00000-0  45179-3 0  9996";
const LINE_2 = "2    11  32.8647 264.6509 1466352 126.0358 248.5175 11.85932318689790";

/* Tests //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

describe("parseTle", () => {
  it("narrows a well-formed JSON blob into typed TLE lines", () => {
    expect(parseTle({line1: LINE_1, line2: LINE_2})).toEqual({line1: LINE_1, line2: LINE_2});
  });

  it("returns null when the value is missing", () => {
    expect(parseTle(null)).toBeNull();
    expect(parseTle(undefined)).toBeNull();
  });

  it("rejects lines of the wrong length", () => {
    expect(parseTle({line1: "1 too short", line2: LINE_2})).toBeNull();
  });

  it("rejects lines carrying the wrong line number", () => {
    expect(parseTle({line1: LINE_2, line2: LINE_1})).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(parseTle({line1: 1, line2: 2})).toBeNull();
  });
});

describe("getCatalogNumber", () => {
  it("reads the NORAD catalog number from the first line", () => {
    expect(getCatalogNumber({line1: LINE_1, line2: LINE_2})).toBe(11);
  });
});

