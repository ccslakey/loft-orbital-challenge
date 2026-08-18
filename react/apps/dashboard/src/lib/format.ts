/* Coordinates ////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Signed degrees -> hemisphere-qualified, e.g. -10.37 lat becomes 10.37 S.
export const formatLatitude = (value: number | null | undefined): string => formatDegrees(value, "N", "S");

export const formatLongitude = (value: number | null | undefined): string => formatDegrees(value, "E", "W");

const formatDegrees = (value: number | null | undefined, positive: string, negative: string): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`;
};

/* Measurements ///////////////////////////////////////////////////////////////////////////////////////////////////// */

export const formatAltitude = (km: number | null | undefined): string =>
  km === null || km === undefined || Number.isNaN(km) ? "—" : `${km.toFixed(1)} km`;

/* Positions //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Longitude -> 0-1 across an equirectangular strip. Wraps rather than clamps: 190 == -170.
export const longitudeToTrackPosition = (longitude: number | null | undefined): number | null => {
  if (longitude === null || longitude === undefined || Number.isNaN(longitude)) {
    return null;
  }

  const wrapped = (((longitude + 180) % 360) + 360) % 360;

  return wrapped / 360;
};

/* Dates //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", {year: "numeric", month: "short", day: "2-digit", timeZone: "UTC"});
};

