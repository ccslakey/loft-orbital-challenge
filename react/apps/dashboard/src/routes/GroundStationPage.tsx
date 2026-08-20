/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {useMemo} from "react";
import {Link, useParams} from "react-router-dom";

import {EMPLOYEES_QUERY, GROUND_STATION_DETAIL_QUERY, MAP_SATELLITES_QUERY} from "@/api/operations.js";
import StatusChip from "@/components/ui/StatusChip.js";
import ContactTable from "@/components/ui/ContactTable.js";
import PassTable from "@/components/ui/PassTable.js";
import QueryState from "@/components/ui/QueryState.js";
import ReportCard from "@/components/ui/ReportCard.js";
import {useContactRows} from "@/hooks/useContactRows.js";
import {useNow} from "@/hooks/useNow.js";
import {
  CONTACT_HORIZON_HOURS,
  findContactWindows,
  getCachedWindows,
  type FleetStation,
  type PassWindow,
  type WindowsCache,
} from "@/lib/fleet.js";
import {formatLatitude, formatLongitude} from "@/lib/format.js";
import {createSatrec} from "@/lib/propagation.js";
import {getGroundStationState, getSatelliteState} from "@/lib/status.js";
import {parseTle} from "@/lib/tle.js";

import styles from "./GroundStationPage.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface StationPass {
  satelliteId: string;
  satelliteName: string;
  window: PassWindow;
}

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Keyed by satellite + TLE + station, shared with remounts; the window search is too heavy per render.
const passCache: WindowsCache = new Map();

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function GroundStationPage() {
  const {stationId} = useParams();

  const {data, loading, error, refetch} = useQuery(GROUND_STATION_DETAIL_QUERY, {
    variables: {id: stationId ?? ""},
    skip: !stationId,
  });
  const satellitesQuery = useQuery(MAP_SATELLITES_QUERY, {variables: {perPage: 50, page: 0}});
  const employeesQuery = useQuery(EMPLOYEES_QUERY);
  const now = useNow(15_000);

  const station = data?.GroundStation ?? null;
  const state = getGroundStationState(station?.status);
  const inert = state === "inert";
  const [latitude, longitude] = station?.coordinates ?? [];

  const fleetStation: FleetStation | null = useMemo(
    () =>
      station && getGroundStationState(station.status) !== "inert" && latitude != null && longitude != null
        ? {id: station.id, name: station.name, latitude, longitude}
        : null,
    [station, latitude, longitude],
  );

  const satellites = useMemo(
    () => (satellitesQuery.data?.allSatellites ?? []).filter((satellite) => satellite !== null),
    [satellitesQuery.data],
  );

  // Passes over this station across the serviceable fleet; per-satellite windows served from the TTL cache.
  const upcomingPasses = useMemo(() => {
    if (!fleetStation) {
      return [];
    }

    const passes: StationPass[] = [];

    for (const satellite of satellites) {
      if (getSatelliteState(satellite.status) === "inert") {
        continue;
      }

      const tle = parseTle(satellite.tle);
      const satrec = tle ? createSatrec(tle) : null;

      if (!satrec) {
        continue;
      }

      const windows = getCachedWindows(passCache, `${satellite.id}\n${tle!.line1}\n${fleetStation.id}`, now, () =>
        findContactWindows(satrec, [fleetStation], now),
      );

      for (const window of windows) {
        if (window.losMs > now.getTime()) {
          passes.push({satelliteId: satellite.id, satelliteName: satellite.name, window});
        }
      }
    }

    return passes.sort((a, b) => a.window.aosMs - b.window.aosMs);
  }, [fleetStation, satellites, now]);

  const contacts = useMemo(() => (data?.GroundStation?.Contacts ?? []).filter((contact) => contact !== null), [data]);

  const contactRows = useContactRows(contacts, now, {
    station: {latitude: latitude ?? null, longitude: longitude ?? null},
  });

  const reports = useMemo(
    () =>
      (data?.GroundStation?.Reports ?? [])
        .filter((report) => report !== null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data],
  );

  const employees = useMemo(
    () => (employeesQuery.data?.allEmployees ?? []).filter((employee) => employee !== null),
    [employeesQuery.data],
  );

  return (
    <section className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link to="/ground-stations">Ground stations</Link>
        <span aria-hidden="true">/</span>
        <span>{station?.name ?? "—"}</span>
      </nav>

      <QueryState
        loading={loading && !data}
        error={error}
        hasData={Boolean(data)}
        empty={!station}
        emptyMessage="No ground station matches that identifier."
        onRetry={() => void refetch()}
      >
        {station ? (
          <>
            <header className={styles.head}>
              <div className={styles.headText}>
                <h1 className={styles.title}>{station.name}</h1>
                <StatusChip label={station.status} state={state} />
                <p className={styles.description}>
                  {station.network} network · {formatLatitude(latitude)}, {formatLongitude(longitude)}
                </p>
              </div>
              <div className={styles.actions}>
                <Link className={styles.actionSecondary} to={`/contacts?station=${stationId}`}>
                  View contacts
                </Link>
              </div>
            </header>

            <div className={styles.grid}>
              <article className={styles.panel}>
                <h2 className={styles.panelTitle}>Site</h2>
                <dl className={styles.readout}>
                  <div>
                    <dt>Network</dt>
                    <dd>{station.network}</dd>
                  </div>
                  <div>
                    <dt>Latitude</dt>
                    <dd>{formatLatitude(latitude)}</dd>
                  </div>
                  <div>
                    <dt>Longitude</dt>
                    <dd>{formatLongitude(longitude)}</dd>
                  </div>
                </dl>
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <h2 className={styles.panelTitle}>Upcoming passes — {CONTACT_HORIZON_HOURS} h horizon</h2>
                {inert ? (
                  <p className={styles.missing}>
                    {station.name} is {station.status} — excluded from contact planning until it returns to service.
                  </p>
                ) : satellitesQuery.loading && !satellitesQuery.data ? (
                  <p className={styles.missing}>Computing passes…</p>
                ) : upcomingPasses.length === 0 ? (
                  <p className={styles.missing}>
                    No serviceable satellite clears the mask here within the next {CONTACT_HORIZON_HOURS} hours.
                  </p>
                ) : (
                  <PassTable
                    rows={upcomingPasses}
                    getWindow={(pass) => pass.window}
                    rowKey={(pass) => `${pass.satelliteId}:${pass.window.aosMs}`}
                    lead={[
                      {
                        header: "Satellite",
                        render: (pass) => (
                          <Link className={styles.rowLink} to={`/fleet/${pass.satelliteId}`}>
                            {pass.satelliteName}
                          </Link>
                        ),
                      },
                    ]}
                    trailing={{
                      header: <span className={styles.srOnly}>Schedule</span>,
                      numeric: true,
                      render: (pass) => (
                        <Link
                          className={styles.rowLink}
                          to={`/contacts/new?satellite=${pass.satelliteId}&station=${station.id}&aos=${pass.window.aosMs}`}
                        >
                          Schedule
                        </Link>
                      ),
                    }}
                  />
                )}
              </article>

              <article className={`${styles.panel} ${styles.panelWide}`}>
                <h2 className={styles.panelTitle}>Contacts</h2>
                {contactRows.length === 0 ? (
                  <p className={styles.missing}>No contacts are scheduled through this station.</p>
                ) : (
                  <>
                    <ContactTable
                      rows={contactRows}
                      entityHeader="Satellite"
                      renderEntity={(contact) =>
                        contact.Satellite ? (
                          <Link className={styles.rowLink} to={`/fleet/${contact.Satellite.id}`}>
                            {contact.Satellite.name}
                          </Link>
                        ) : (
                          "—"
                        )
                      }
                    />
                    <Link className={styles.inlineLink} to={`/contacts?station=${stationId}`}>
                      All contacts →
                    </Link>
                  </>
                )}
              </article>
            </div>

            <section className={styles.reportsSection}>
              <h2 className={styles.sectionTitle}>Reports</h2>
              {reports.length === 0 ? (
                <p className={styles.missing}>No reports reference this station.</p>
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

export default GroundStationPage;
