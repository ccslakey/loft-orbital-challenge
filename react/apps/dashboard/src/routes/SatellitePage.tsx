/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {Link, useParams} from "react-router-dom";

import {SATELLITE_DETAIL_QUERY} from "@/api/operations.js";
import StatusChip from "@/components/ui/StatusChip.js";
import QueryState from "@/components/ui/QueryState.js";
import {formatAltitude, formatDate, formatLatitude, formatLongitude} from "@/lib/format.js";
import {getLaunchState, getPayloadState, getSatelliteState} from "@/lib/status.js";
import {getCatalogNumber, parseTle} from "@/lib/tle.js";

import styles from "./SatellitePage.module.scss";

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function SatellitePage() {
  const {satelliteId} = useParams();

  const {data, loading, error, refetch} = useQuery(SATELLITE_DETAIL_QUERY, {
    variables: {id: satelliteId ?? ""},
    skip: !satelliteId,
    pollInterval: 5000,
  });

  const satellite = data?.Satellite ?? null;
  const state = getSatelliteState(satellite?.status);
  const tle = parseTle(satellite?.tle);
  const [latitude, longitude] = satellite?.coordinates ?? [];

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
        empty={!satellite}
        emptyMessage="No satellite matches that identifier."
        onRetry={() => void refetch()}
      >
        {satellite ? (
          <>
            <header className={styles.head}>
              <div className={styles.headText}>
                <h1 className={styles.title}>{satellite.name}</h1>
                <StatusChip label={satellite.status} state={state} />
                <p className={styles.description}>{satellite.description}</p>
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
                <h2 className={styles.panelTitle}>Two-line element set</h2>
                {tle ? (
                  <pre className={styles.tle}>
                    {tle.line1}
                    {"\n"}
                    {tle.line2}
                  </pre>
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
          </>
        ) : null}
      </QueryState>
    </section>
  );
}

export default SatellitePage;
