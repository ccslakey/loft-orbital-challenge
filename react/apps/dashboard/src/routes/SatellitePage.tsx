/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {useMemo} from "react";
import {Link, useParams} from "react-router-dom";

import {
  EMPLOYEES_QUERY,
  GROUND_STATIONS_QUERY,
  SATELLITE_ACTIVITY_QUERY,
  SATELLITE_DETAIL_QUERY,
  SATELLITE_POSITION_QUERY,
} from "@/api/operations.js";
import StatusChip from "@/components/ui/StatusChip.js";
import PassTable from "@/components/ui/PassTable.js";
import QueryState from "@/components/ui/QueryState.js";
import ReportCard from "@/components/ui/ReportCard.js";
import {useContactRows} from "@/hooks/useContactRows.js";
import {useNow} from "@/hooks/useNow.js";
import {PHASE_PRESENTATION} from "@/lib/contacts.js";
import {
  activeFleetStations,
  CONTACT_HORIZON_HOURS,
  findContactWindows,
  getCachedWindows,
  type WindowsCache,
} from "@/lib/fleet.js";
import {
  formatAltitude,
  formatDate,
  formatLatitude,
  formatLongitude,
  formatSpan,
  formatUtcDateTime,
} from "@/lib/format.js";
import {deriveOrbit, tleAgeDays, TLE_STALE_DAYS} from "@/lib/orbit.js";
import {createSatrec} from "@/lib/propagation.js";
import {getLaunchState, getPayloadState, getSatelliteState} from "@/lib/status.js";
import {getCatalogNumber, parseTle} from "@/lib/tle.js";

import styles from "./SatellitePage.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Keyed by satellite + TLE + station set, shared with remounts; the window search is too heavy per render.
const passCache: WindowsCache = new Map();

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function SatellitePage() {
  const {satelliteId} = useParams();

  const {data, loading, error, refetch} = useQuery(SATELLITE_DETAIL_QUERY, {
    variables: {id: satelliteId ?? ""},
    skip: !satelliteId,
  });
  // The 5 s cadence polls only the position fields; they merge into the same Satellite cache entity,
  // so description/image/specs and relations are fetched once by the detail query above.
  useQuery(SATELLITE_POSITION_QUERY, {
    variables: {id: satelliteId ?? ""},
    skip: !satelliteId,
    pollInterval: 5000,
  });
  // Contacts and reports are fetched apart from the 5 s position poll so they are not re-fetched every tick.
  const activityQuery = useQuery(SATELLITE_ACTIVITY_QUERY, {
    variables: {id: satelliteId ?? ""},
    skip: !satelliteId,
  });
  const stationsQuery = useQuery(GROUND_STATIONS_QUERY, {variables: {perPage: 50, page: 0}});
  const employeesQuery = useQuery(EMPLOYEES_QUERY);
  const now = useNow(15_000);

  const satellite = data?.Satellite ?? null;
  const state = getSatelliteState(satellite?.status);
  const inert = state === "inert";
  const [latitude, longitude] = satellite?.coordinates ?? [];

  // Memoized off the raw tle field so the 5 s position poll does not rebuild the satrec chain.
  const tleValue = satellite?.tle;
  const tle = useMemo(() => parseTle(tleValue), [tleValue]);
  const satrec = useMemo(() => (tle ? createSatrec(tle) : null), [tle]);
  const orbit = useMemo(() => (satrec ? deriveOrbit(satrec) : null), [satrec]);
  const tleAgeMs = orbit ? now.getTime() - orbit.epochMs : null;
  const tleStale = orbit !== null && tleAgeDays(orbit.epochMs, now.getTime()) > TLE_STALE_DAYS;

  const activeStations = useMemo(
    () => activeFleetStations(stationsQuery.data?.allGroundStations),
    [stationsQuery.data],
  );

  const upcomingPasses = useMemo(() => {
    if (!satrec || !satelliteId || activeStations.length === 0) {
      return [];
    }

    const stationsKey = activeStations.map((station) => station.id).join("|");
    const windows = getCachedWindows(passCache, `${satelliteId}\n${tle?.line1}\n${stationsKey}`, now, () =>
      findContactWindows(satrec, activeStations, now),
    );

    return windows.filter((window) => window.losMs > now.getTime());
  }, [satrec, satelliteId, tle, activeStations, now]);

  const contacts = useMemo(
    () => (activityQuery.data?.Satellite?.Contacts ?? []).filter((contact) => contact !== null),
    [activityQuery.data],
  );

  const contactRows = useContactRows(contacts, now, {satrec});

  const reports = useMemo(
    () =>
      (activityQuery.data?.Satellite?.Reports ?? [])
        .filter((report) => report !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activityQuery.data],
  );

  const employees = useMemo(
    () => (employeesQuery.data?.allEmployees ?? []).filter((employee) => employee !== null),
    [employeesQuery.data],
  );

  const specs = satellite?.specs;
  const specEntries = useMemo(
    () =>
      specs && typeof specs === "object" && !Array.isArray(specs)
        ? Object.entries(specs as Record<string, unknown>)
        : [],
    [specs],
  );

  const scheduleHref = `/contacts/new?satellite=${satelliteId}`;

  return (
    <section className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link to="/fleet">Satellites</Link>
        <span aria-hidden="true">/</span>
        <span>{satellite?.name ?? "—"}</span>
      </nav>

      <QueryState
        loading={loading && !data}
        error={error}
        hasData={Boolean(data)}
        empty={!satellite}
        emptyMessage="No satellite matches that identifier."
        onRetry={() => void refetch()}
      >
        {satellite ? (
          <>
            <header className={styles.head}>
              {satellite.image ? (
                <img
                  className={styles.heroImage}
                  src={satellite.image}
                  alt={satellite.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : null}
              <div className={styles.headText}>
                <h1 className={styles.title}>{satellite.name}</h1>
                <StatusChip label={satellite.status} state={state} />
                <p className={styles.description}>{satellite.description}</p>
              </div>
              <div className={styles.actions}>
                {inert ? (
                  <span className={styles.actionDisabled} title="Decommissioned satellites cannot be scheduled">
                    Schedule contact
                  </span>
                ) : (
                  <Link className={styles.actionPrimary} to={scheduleHref}>
                    Schedule contact
                  </Link>
                )}
                <Link className={styles.actionSecondary} to={`/contacts?satellite=${satelliteId}`}>
                  View contacts
                </Link>
              </div>
            </header>

            <div className={styles.grid}>
              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Current position</h2>
                <dl className={styles.readout}>
                  <div>
                    <dt>Altitude</dt>
                    <dd>{formatAltitude(satellite.altitude)}</dd>
                  </div>
                  <div>
                    <dt>Latitude</dt>
                    <dd>{formatLatitude(latitude)}</dd>
                  </div>
                  <div>
                    <dt>Longitude</dt>
                    <dd>{formatLongitude(longitude)}</dd>
                  </div>
                  <div>
                    <dt>NORAD id</dt>
                    <dd>{tle ? (getCatalogNumber(tle) ?? "—") : "—"}</dd>
                  </div>
                </dl>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Spacecraft</h2>
                <dl className={styles.readout}>
                  <div>
                    <dt>Manufacturer</dt>
                    <dd>{satellite.manufacturer}</dd>
                  </div>
                  <div>
                    <dt>Bus</dt>
                    <dd>{satellite.busType}</dd>
                  </div>
                  <div>
                    <dt>Constellation</dt>
                    <dd>{satellite.Constellation?.name ?? "Unassigned"}</dd>
                  </div>
                  {specEntries.map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </article>

              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Launch</h2>
                {satellite.Launch ? (
                  <dl className={styles.readout}>
                    <div>
                      <dt>Vehicle</dt>
                      <dd>{satellite.Launch.rocket}</dd>
                    </div>
                    <div>
                      <dt>Provider</dt>
                      <dd>{satellite.Launch.provider}</dd>
                    </div>
                    <div>
                      <dt>Date</dt>
                      <dd>{formatDate(satellite.Launch.date)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <StatusChip
                          label={satellite.Launch.outcome ?? satellite.Launch.status}
                          state={getLaunchState(satellite.Launch.status)}
                        />
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className={styles.missing}>Not yet manifested to a launch.</p>
                )}
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <h2 className={styles.panelTitle}>Upcoming passes — {CONTACT_HORIZON_HOURS} h horizon</h2>
                {!tle ? (
                  <p className={styles.missing}>No valid two-line element set — passes cannot be predicted.</p>
                ) : stationsQuery.loading && !stationsQuery.data ? (
                  <p className={styles.missing}>Computing passes…</p>
                ) : upcomingPasses.length === 0 ? (
                  <p className={styles.missing}>
                    No passes clear the mask over operational stations within the next {CONTACT_HORIZON_HOURS} hours.
                  </p>
                ) : (
                  <PassTable
                    rows={upcomingPasses}
                    getWindow={(window) => window}
                    rowKey={(window) => `${window.stationId}:${window.aosMs}`}
                    lead={[{header: "Station", render: (window) => window.stationName}]}
                    trailing={
                      inert
                        ? undefined
                        : {
                            header: <span className={styles.srOnly}>Schedule</span>,
                            numeric: true,
                            render: (window) => (
                              <Link
                                className={styles.rowLink}
                                to={`${scheduleHref}&station=${window.stationId}&aos=${window.aosMs}`}
                              >
                                Schedule
                              </Link>
                            ),
                          }
                    }
                  />
                )}
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <h2 className={styles.panelTitle}>Contacts</h2>
                {activityQuery.loading && !activityQuery.data ? (
                  <p className={styles.missing}>Loading contacts…</p>
                ) : contactRows.length === 0 ? (
                  <p className={styles.missing}>
                    No contacts scheduled.{" "}
                    {inert ? null : (
                      <Link className={styles.inlineLink} to={scheduleHref}>
                        Schedule one →
                      </Link>
                    )}
                  </p>
                ) : (
                  <>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th scope="col">Phase</th>
                            <th scope="col" className={styles.numeric}>
                              Date
                            </th>
                            <th scope="col">Station</th>
                            <th scope="col">Type</th>
                            <th scope="col">Payload</th>
                            <th scope="col">Operator</th>
                            <th scope="col" className={styles.numeric}>
                              Window
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {contactRows.map(({contact, dateMs, phase, windowLabel}) => (
                            <tr key={contact.id} data-state={PHASE_PRESENTATION[phase].state}>
                              <td>
                                <StatusChip
                                  label={PHASE_PRESENTATION[phase].label}
                                  state={PHASE_PRESENTATION[phase].state}
                                />
                              </td>
                              <td className={styles.numeric}>{formatUtcDateTime(dateMs)}</td>
                              <td>{contact.GroundStation?.name ?? "—"}</td>
                              <td>{contact.type}</td>
                              <td>{contact.Payload?.name ?? "—"}</td>
                              <td>{contact.Employee?.name ?? "—"}</td>
                              <td className={styles.numeric}>{windowLabel ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Link className={styles.inlineLink} to={`/contacts?satellite=${satelliteId}`}>
                      All contacts →
                    </Link>
                  </>
                )}
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <h2 className={styles.panelTitle}>Orbit</h2>
                {tle && orbit ? (
                  <>
                    <dl className={`${styles.readout} ${styles.orbitReadout}`}>
                      <div>
                        <dt>Inclination</dt>
                        <dd>{orbit.inclinationDeg.toFixed(2)}°</dd>
                      </div>
                      <div>
                        <dt>Period</dt>
                        <dd>{orbit.periodMin.toFixed(1)} min</dd>
                      </div>
                      <div>
                        <dt>Apogee</dt>
                        <dd>{formatAltitude(orbit.apogeeKm)}</dd>
                      </div>
                      <div>
                        <dt>Perigee</dt>
                        <dd>{formatAltitude(orbit.perigeeKm)}</dd>
                      </div>
                      <div>
                        <dt>Eccentricity</dt>
                        <dd>{orbit.eccentricity.toFixed(5)}</dd>
                      </div>
                      <div className={styles.orbitEpoch}>
                        <dt>TLE epoch</dt>
                        <dd className={styles.epochCell}>
                          {formatUtcDateTime(orbit.epochMs)}
                          {tleStale && tleAgeMs !== null ? (
                            <StatusChip label={`${formatSpan(tleAgeMs)} old`} state="caution" />
                          ) : null}
                        </dd>
                      </div>
                    </dl>
                    <pre className={styles.tle}>
                      {tle.line1}
                      {"\n"}
                      {tle.line2}
                    </pre>
                  </>
                ) : (
                  <p className={styles.missing}>No valid two-line element set on record.</p>
                )}
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <h2 className={styles.panelTitle}>Payloads</h2>
                {satellite.Payloads && satellite.Payloads.length > 0 ? (
                  <ul className={styles.payloads}>
                    {satellite.Payloads.filter((payload) => payload !== null).map((payload) => (
                      <li key={payload.id}>
                        <span className={styles.payloadName}>{payload.name}</span>
                        <span className={styles.payloadCustomer}>{payload.Customer?.name ?? "Unassigned"}</span>
                        <StatusChip label={payload.status} state={getPayloadState(payload.status)} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.missing}>No payloads are integrated on this bus.</p>
                )}
              </article>
            </div>

            <section className={styles.reportsSection}>
              <h2 className={styles.sectionTitle}>Reports</h2>
              {activityQuery.loading && !activityQuery.data ? (
                <p className={styles.missing}>Loading reports…</p>
              ) : reports.length === 0 ? (
                <p className={styles.missing}>No reports reference this satellite.</p>
              ) : (
                <ul className={styles.reports}>
                  {reports.map((report) => (
                    <ReportCard key={report.id} report={report} employees={employees} hideTarget />
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </QueryState>
    </section>
  );
}

export default SatellitePage;
