/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// `tle` arrives as the opaque JSON scalar, so its shape is unverified at the type level.

export interface TwoLineElement {
  line1: string;
  line2: string;
}

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// TLE format: two 69-char lines, each prefixed with its line number.

const TLE_LINE_LENGTH = 69;

/* Parsing ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

const isValidLine = (value: unknown, lineNumber: 1 | 2): value is string =>
  typeof value === "string" && value.length === TLE_LINE_LENGTH && value.startsWith(String(lineNumber));

// Returns null rather than throwing: one malformed TLE degrades its row, not the whole list.
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

// NORAD catalog number lives in columns 3-7 of line 1.
export const getCatalogNumber = (tle: TwoLineElement): number | null => {
  const raw = Number.parseInt(tle.line1.slice(2, 7).trim(), 10);

  return Number.isNaN(raw) ? null : raw;
};

