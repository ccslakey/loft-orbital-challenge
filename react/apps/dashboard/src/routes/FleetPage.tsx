/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {useEffect, useMemo, useRef, useState} from "react";
import {Link, useSearchParams} from "react-router-dom";

import {GROUND_STATIONS_QUERY, SATELLITE_OVERVIEW_QUERY} from "@/api/operations.js";
import StatusChip from "@/components/ui/StatusChip.js";
import QueryState from "@/components/ui/QueryState.js";
import {
  CONTACT_HORIZON_HOURS,
  filterRows,
  findContactWindows,
  firstUpcomingWindow,
  getCachedWindows,
  hasActiveFilters,
  launchedAtMs,
  readFleetParams,
  sortRows,
  timelineSegments,
  type FleetFilters,
  type FleetSortField,
  type FleetStation,
  type PassWindow,
  type SortDirection,
  type TimelineSegment,
  type WindowsCache,
} from "@/lib/fleet.js";
import {formatAltitude, formatDate, formatLatitude, formatLongitude, formatSpan} from "@/lib/format.js";
import {createSatrec} from "@/lib/propagation.js";
import {getGroundStationState, getSatelliteState, type State} from "@/lib/status.js";
import {parseTle} from "@/lib/tle.js";
import {DEFAULT_ELEVATION_MASK_DEG} from "@/lib/visibility.js";

import styles from "./FleetPage.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface FleetRow {
  id: string;
  name: string;
  status: string;
  state: State;
  altitude: number | null;
  coordinates: readonly (number | null)[];
  constellationId: string | null;
  constellationName: string | null;
  customerIds: string[];
  payloadCategories: string[];
  launchedMs: number | null;
  launchedLabel: string;
  launchDate: string | null;
  nextAosMs: number | null;
  contact: PassWindow | null;
  contactEta: string | null;
  timeline: Array<TimelineSegment & {tip: string}>;
}

const HORIZON_MS = CONTACT_HORIZON_HOURS * 3_600_000;

// Keyed by satellite + TLE + station set, so entries survive remounts and stale keys are simply never hit again.
const contactCache: WindowsCache = new Map();

// "STATION · 12:34–12:46 UTC"; a pass on the next UTC day gets one trailing "+1d", one that straddles
// midnight marks only the end time, and a truncated LOS (still open at the horizon) gets a "+".
const formatWindowTip = ({stationName, aosMs, losMs, truncated}: PassWindow, reference: Date): string => {
  const hhmm = (ms: number) => new Date(ms).toISOString().slice(11, 16);
  const straddles = new Date(losMs).getUTCDate() !== new Date(aosMs).getUTCDate();
  const nextDay = new Date(aosMs).getUTCDate() !== reference.getUTCDate();

  return `${stationName} · ${hhmm(aosMs)}–${hhmm(losMs)}${straddles ? " +1d" : ""}${truncated ? "+" : ""} UTC${
    nextDay ? " +1d" : ""
  }`;
};

interface FilterOption {
  value: string;
  label: string;
}

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function FleetPage() {
  const {data, loading, error, refetch} = useQuery(SATELLITE_OVERVIEW_QUERY, {
    variables: {perPage: 50, page: 0},
    pollInterval: 5000,
  });
  const stationsQuery = useQuery(GROUND_STATIONS_QUERY, {variables: {perPage: 50, page: 0}});

  const [searchParams, setSearchParams] = useSearchParams();
  const {filters, sort, direction} = readFleetParams(searchParams);

  // The router applies search-param updates in a transition, so an input bound straight to the URL drops fast
  // keystrokes. The field owns its value; the URL is written debounced, and the ref distinguishes those writes
  // flushing back from external changes (back/forward, clear filters) that must reset the field.
  const [searchInput, setSearchInput] = useState(filters.search);
  const writtenSearch = useRef(filters.search);

  useEffect(() => {
    if (filters.search !== writtenSearch.current) {
      writtenSearch.current = filters.search;
      setSearchInput(filters.search);
    }
  }, [filters.search]);

  const satellites = useMemo(() => (data?.allSatellites ?? []).filter((satellite) => satellite !== null), [data]);

  // Contact search only considers stations that could actually take a pass.
  const activeStations = useMemo(
    () =>
      (stationsQuery.data?.allGroundStations ?? [])
        .filter((station) => station !== null)
        .flatMap((station): FleetStation[] => {
          const [latitude, longitude] = station.coordinates;

          return getGroundStationState(station.status) === "inert" || latitude == null || longitude == null
            ? []
            : [{id: station.id, name: station.name, latitude, longitude}];
        }),
    [stationsQuery.data],
  );

  // Rebuilt every poll; the expensive window search inside is served from the TTL cache between refreshes.
  const rows = useMemo((): FleetRow[] => {
    const now = new Date();
    const stationsKey = activeStations.map((station) => station.id).join("|");

    return satellites.map((satellite) => {
      const state = getSatelliteState(satellite.status);
      const tle = parseTle(satellite.tle);
      const satrec = tle && state !== "inert" ? createSatrec(tle) : null;
      const windows = satrec
        ? getCachedWindows(contactCache, `${satellite.id}\n${tle!.line1}\n${stationsKey}`, now, () =>
            findContactWindows(satrec, activeStations, now),
          )
        : [];
      const contact = firstUpcomingWindow(windows, now.getTime());

      const payloads = (satellite.Payloads ?? []).filter((payload) => payload !== null);
      const customerIds: string[] = [];

      for (const payload of payloads) {
        if (payload.Customer && !customerIds.includes(payload.Customer.id)) {
          customerIds.push(payload.Customer.id);
        }
      }

      const launchedMs = launchedAtMs(satellite.Launch?.date, satellite.Launch?.status);

      return {
        id: satellite.id,
        name: satellite.name,
        status: satellite.status,
        state,
        altitude: satellite.altitude,
        coordinates: satellite.coordinates,
        constellationId: satellite.Constellation?.id ?? null,
        constellationName: satellite.Constellation?.name ?? null,
        customerIds,
        payloadCategories: [...new Set(payloads.map((payload) => payload.category))],
        launchedMs,
        launchedLabel:
          launchedMs === null
            ? satellite.Launch?.status === "Pending"
              ? "Not launched"
              : "—"
            : formatSpan(now.getTime() - launchedMs),
        launchDate: satellite.Launch?.date ?? null,
        nextAosMs: contact?.aosMs ?? null,
        contact,
        contactEta:
          contact === null
            ? null
            : contact.aosMs <= now.getTime()
              ? "In view"
              : `in ${formatSpan(contact.aosMs - now.getTime())}`,
        timeline: timelineSegments(windows, now.getTime(), HORIZON_MS).map((segment) => ({
          ...segment,
          tip: formatWindowTip(segment.window, now),
        })),
      };
    });
  }, [satellites, activeStations]);

  // Customer names live on the payloads, not the rows; both option lists derive from the unfiltered data.
  const options = useMemo(() => {
    const constellations = new Map<string, string>();
    const customers = new Map<string, string>();

    for (const satellite of satellites) {
      if (satellite.Constellation) {
        constellations.set(satellite.Constellation.id, satellite.Constellation.name);
      }

      for (const payload of satellite.Payloads ?? []) {
        if (payload?.Customer) {
          customers.set(payload.Customer.id, payload.Customer.name);
        }
      }
    }

    const toOptions = (entries: Map<string, string>): FilterOption[] =>
      [...entries].map(([value, label]) => ({value, label})).sort((a, b) => a.label.localeCompare(b.label));

    return {
      statuses: [...new Set(rows.map((row) => row.status))].sort(),
      constellations: toOptions(constellations),
      customers: toOptions(customers),
      categories: [...new Set(rows.flatMap((row) => row.payloadCategories))].sort(),
    };
  }, [satellites, rows]);

  // A stale URL value (deleted constellation, mistyped status) deactivates that filter instead of matching nothing.
  const valid = (value: string | null, known: readonly string[]): string | null =>
    value !== null && known.includes(value) ? value : null;

  const effectiveFilters: FleetFilters = {
    status: valid(filters.status, options.statuses),
    constellation: valid(
      filters.constellation,
      options.constellations.map((option) => option.value),
    ),
    customer: valid(
      filters.customer,
      options.customers.map((option) => option.value),
    ),
    payloadCategory: valid(filters.payloadCategory, options.categories),
    search: filters.search,
  };

  const filtered = filterRows(rows, effectiveFilters);
  const visible = sort === null ? filtered : sortRows(filtered, sort, direction);
  const filtersActive = hasActiveFilters(effectiveFilters);

  const updateParams = (mutate: (next: URLSearchParams) => void, replace = false) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);

        mutate(next);

        return next;
      },
      {replace},
    );

  const setFilter = (key: string, value: string, replace = false) =>
    updateParams((next) => (value === "" ? next.delete(key) : next.set(key, value)), replace);

  // Debounced so a burst of keystrokes lands as one history replacement instead of one per character.
  useEffect(() => {
    if (searchInput === filters.search) {
      return;
    }

    const id = window.setTimeout(() => {
      writtenSearch.current = searchInput;
      setFilter("q", searchInput, true);
    }, 250);

    return () => window.clearTimeout(id);
  });

  const clearFilters = () =>
    updateParams((next) => {
      for (const key of ["status", "constellation", "customer", "payload", "q"]) {
        next.delete(key);
      }
    });

  // asc -> desc -> back to the server's name order.
  const toggleSort = (field: FleetSortField) =>
    updateParams((next) => {
      if (sort !== field) {
        next.set("sort", field);
        next.delete("dir");
      } else if (direction === "asc") {
        next.set("sort", field);
        next.set("dir", "desc");
      } else {
        next.delete("sort");
        next.delete("dir");
      }
    });

  const headerProps = {sort, direction, onToggle: toggleSort};

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Satellites</h1>
        <p className={styles.subtitle}>
          Sub-satellite point and altitude refreshed every five seconds; next contact and the passes strip cover every
          window over an operational ground station within {CONTACT_HORIZON_HOURS} hours, above a{" "}
          {DEFAULT_ELEVATION_MASK_DEG}° elevation mask. Click a pass to schedule a contact in it.
        </p>
      </header>

      <QueryState
        loading={loading && !data}
        error={error}
        empty={satellites.length === 0}
        emptyMessage="No satellites are registered against this operator."
        onRetry={() => void refetch()}
      >
        <div className={styles.toolbar}>
          <input
            type="search"
            className={styles.search}
            placeholder="Search name…"
            aria-label="Search by satellite name"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />

          <FilterSelect
            label="Status"
            value={effectiveFilters.status}
            options={options.statuses.map((status) => ({value: status, label: status}))}
            onChange={(value) => setFilter("status", value)}
          />
          <FilterSelect
            label="Constellation"
            value={effectiveFilters.constellation}
            options={options.constellations}
            onChange={(value) => setFilter("constellation", value)}
          />
          <FilterSelect
            label="Customer"
            value={effectiveFilters.customer}
            options={options.customers}
            onChange={(value) => setFilter("customer", value)}
          />
          <FilterSelect
            label="Payload"
            value={effectiveFilters.payloadCategory}
            options={options.categories.map((category) => ({value: category, label: category}))}
            onChange={(value) => setFilter("payload", value)}
          />

          {filtersActive ? (
            <button type="button" className={styles.clear} onClick={clearFilters}>
              Clear filters
            </button>
          ) : null}

          <span className={styles.count} role="status">
            {visible.length} of {rows.length}
          </span>
        </div>

        {visible.length === 0 ? (
          <div className={styles.noMatches}>
            <p>No satellites match the current filters.</p>
            <button type="button" className={styles.clear} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <SortHeader field="name" {...headerProps}>
                    Satellite
                  </SortHeader>
                  <SortHeader field="status" {...headerProps}>
                    Status
                  </SortHeader>
                  <SortHeader field="launched" className={styles.numeric} {...headerProps}>
                    Launched
                  </SortHeader>
                  <SortHeader field="altitude" className={styles.numeric} {...headerProps}>
                    Altitude
                  </SortHeader>
                  <th scope="col" className={styles.numeric}>
                    Latitude
                  </th>
                  <th scope="col" className={styles.numeric}>
                    Longitude
                  </th>
                  <SortHeader field="contact" {...headerProps}>
                    Next contact
                  </SortHeader>
                  <th scope="col" className={styles.timelineHeader}>
                    Passes
                    <span className={styles.scale} aria-hidden="true">
                      <span>now</span>
                      <span>+{CONTACT_HORIZON_HOURS / 2} h</span>
                      <span>+{CONTACT_HORIZON_HOURS} h</span>
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {visible.map((row) => {
                  const [latitude, longitude] = row.coordinates;

                  return (
                    <tr key={row.id} data-state={row.state}>
                      <th scope="row" className={styles.nameCell}>
                        <Link className={styles.name} to={`/fleet/${row.id}`}>
                          {row.name}
                        </Link>
                        {row.constellationName ? (
                          <span className={styles.constellation}>{row.constellationName}</span>
                        ) : null}
                      </th>

                      <td>
                        <StatusChip label={row.status} state={row.state} />
                      </td>

                      <td
                        className={styles.numeric}
                        title={row.launchedMs === null ? undefined : formatDate(row.launchDate)}
                      >
                        {row.launchedLabel}
                      </td>

                      <td className={styles.numeric}>{formatAltitude(row.altitude)}</td>
                      <td className={styles.numeric}>{formatLatitude(latitude)}</td>
                      <td className={styles.numeric}>{formatLongitude(longitude)}</td>

                      <td>
                        {row.contact === null ? (
                          <span className={styles.noContact}>—</span>
                        ) : (
                          <Link
                            className={styles.contactCell}
                            title={`AOS ${new Date(row.contact.aosMs).toISOString().slice(11, 19)} UTC — schedule a contact in this window`}
                            to={`/contacts/new?satellite=${row.id}&station=${row.contact.stationId}&aos=${row.contact.aosMs}`}
                          >
                            <span className={styles.contactEta}>{row.contactEta}</span>
                            <span className={styles.contactStation}>{row.contact.stationName}</span>
                          </Link>
                        )}
                      </td>

                      <td>
                        <div
                          className={styles.timeline}
                          role="img"
                          aria-label={`${row.timeline.length} passes in the next ${CONTACT_HORIZON_HOURS} hours`}
                        >
                          <span className={styles.timelineMid} aria-hidden="true" />
                          {row.timeline.map((segment) => {
                            // Anchor the tooltip so it grows inward: the panel's overflow clips anything
                            // extending past its edges.
                            const center = segment.start + segment.span / 2;
                            const align = center >= 0.5 ? "right" : center <= 0.15 ? "left" : "center";

                            return (
                              <Link
                                key={`${segment.window.stationId}-${segment.window.aosMs}`}
                                className={styles.pass}
                                style={{left: `${segment.start * 100}%`, width: `${segment.span * 100}%`}}
                                data-tip={segment.tip}
                                data-align={align}
                                aria-label={`Schedule contact — ${segment.tip}`}
                                to={`/contacts/new?satellite=${row.id}&station=${segment.window.stationId}&aos=${segment.window.aosMs}`}
                              />
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </section>
  );
}

/* Filter select //////////////////////////////////////////////////////////////////////////////////////////////////// */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      className={styles.select}
      aria-label={`Filter by ${label.toLowerCase()}`}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{label}: all</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/* Sort header ////////////////////////////////////////////////////////////////////////////////////////////////////// */

function SortHeader({
  field,
  sort,
  direction,
  onToggle,
  className,
  children,
}: {
  field: FleetSortField;
  sort: FleetSortField | null;
  direction: SortDirection;
  onToggle: (field: FleetSortField) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = sort === field;

  return (
    <th
      scope="col"
      className={className}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        className={styles.sortButton}
        data-active={active || undefined}
        onClick={() => onToggle(field)}
      >
        {children}
        <span className={styles.sortIndicator} aria-hidden="true">
          {active ? (direction === "asc" ? "▲" : "▼") : ""}
        </span>
      </button>
    </th>
  );
}

export default FleetPage;
