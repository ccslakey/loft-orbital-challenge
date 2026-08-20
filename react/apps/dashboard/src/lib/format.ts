/* Time ///////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export const formatUtcHhmm = (ms: number): string => new Date(ms).toISOString().slice(11, 16);

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

/* Durations //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Humanized span at the coarsest useful unit: "3 min", "4.5 h", "12 d", "1.3 yr". Sub-minute rounds up to 1 min.
export const formatSpan = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) {
    return "—";
  }

  const minutes = ms / 60_000;

  if (minutes < 60) {
    return `${Math.max(1, Math.round(minutes))} min`;
  }

  const hours = minutes / 60;

  if (hours < 48) {
    return `${hours.toFixed(1)} h`;
  }

  const days = hours / 24;

  if (days < 365) {
    return `${Math.round(days)} d`;
  }

  return `${(days / 365.25).toFixed(1)} yr`;
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

// Epoch ms -> "Jan 09, 2021 · 14:32 UTC".
export const formatUtcDateTime = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return "—";
  }

  const iso = new Date(ms).toISOString();

  return `${formatDate(iso)} · ${iso.slice(11, 16)} UTC`;
};
