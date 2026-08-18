/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {Link} from "react-router-dom";

import {SATELLITE_OVERVIEW_QUERY} from "@/api/operations.js";
import StatusChip from "@/components/ui/StatusChip.js";
import QueryState from "@/components/ui/QueryState.js";
import {formatAltitude, formatLatitude, formatLongitude, longitudeToTrackPosition} from "@/lib/format.js";
import {getSatelliteState} from "@/lib/status.js";

import styles from "./FleetPage.module.scss";

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function FleetPage() {
  const {data, loading, error, refetch} = useQuery(SATELLITE_OVERVIEW_QUERY, {
    variables: {perPage: 50, page: 0},
    // Positions are recomputed from TLEs server-side once a second and there are no subscriptions, so the ground track
    // is only live because we ask again.
    pollInterval: 5000,
  });

  const satellites = (data?.allSatellites ?? []).filter((satellite) => satellite !== null);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Satellites</h1>
        <p className={styles.subtitle}>
          Sub-satellite point and altitude, refreshed every five seconds from the current two-line element set.
        </p>
      </header>

      <QueryState
        loading={loading && !data}
        error={error}
        empty={satellites.length === 0}
        emptyMessage="No satellites are registered against this operator."
        onRetry={() => void refetch()}
      >
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Satellite</th>
                <th scope="col">Status</th>
                <th scope="col" className={styles.numeric}>
                  Altitude
                </th>
                <th scope="col" className={styles.numeric}>
                  Latitude
                </th>
                <th scope="col" className={styles.numeric}>
                  Longitude
                </th>
                <th scope="col" className={styles.trackHeader}>
                  Ground track
                  <span className={styles.scale} aria-hidden="true">
                    <span>180W</span>
                    <span>0</span>
                    <span>180E</span>
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {satellites.map((satellite) => {
                const state = getSatelliteState(satellite.status);
                const [latitude, longitude] = satellite.coordinates;
                const position = longitudeToTrackPosition(longitude);

                return (
                  <tr key={satellite.id} data-state={state}>
                    <th scope="row" className={styles.nameCell}>
                      <Link className={styles.name} to={`/fleet/${satellite.id}`}>
                        {satellite.name}
                      </Link>
                      {satellite.Constellation ? (
                        <span className={styles.constellation}>{satellite.Constellation.name}</span>
                      ) : null}
                    </th>

                    <td>
                      <StatusChip label={satellite.status} state={state} />
                    </td>

                    <td className={styles.numeric}>{formatAltitude(satellite.altitude)}</td>
                    <td className={styles.numeric}>{formatLatitude(latitude)}</td>
                    <td className={styles.numeric}>{formatLongitude(longitude)}</td>

                    <td>
                      <div className={styles.track}>
                        <span className={styles.meridian} aria-hidden="true" />
                        {position === null ? null : (
                          <span
                            className={styles.marker}
                            style={{left: `${position * 100}%`}}
                            title={`${formatLatitude(latitude)}, ${formatLongitude(longitude)}`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </QueryState>
    </section>
  );
}

export default FleetPage;
