/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// The API types `tle` as the opaque `JSON` scalar, so its shape is unverified at the type level. Everything below
// exists to turn that `unknown` blob into something the rest of the app can trust.

export interface TwoLineElement {
  line1: string;
  line2: string;
}

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// A TLE is a fixed-width format: two 69-character lines, each prefixed with its line number.
// See https://en.wikipedia.org/wiki/Two-line_element_set

const TLE_LINE_LENGTH = 69;

/* Parsing ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const isValidLine = (value: unknown, lineNumber: 1 | 2): value is string =>
  typeof value === "string" && value.length === TLE_LINE_LENGTH && value.startsWith(String(lineNumber));

/**
 * Narrows the raw `JSON` scalar returned for `Satellite.tle` into a typed pair of TLE lines.
 *
 * Returns `null` rather than throwing: a malformed TLE on one satellite should degrade that single row, not take down
 * a list of satellites that are otherwise fine.
 */
export const parseTle = (value: Record<string, unknown> | null | undefined): TwoLineElement | null => {
  if (!value) {
    return null;
  }

  const {line1, line2} = value;

  if (!isValidLine(line1, 1) || !isValidLine(line2, 2)) {
    return null;
  }

  return {line1, line2};
};

/**
 * Extracts the NORAD catalog number, the satellite's canonical identifier, from columns 3-7 of the first line.
 */
export const getCatalogNumber = (tle: TwoLineElement): number | null => {
  const raw = Number.parseInt(tle.line1.slice(2, 7).trim(), 10);

  return Number.isNaN(raw) ? null : raw;
};
