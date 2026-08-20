/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {Link} from "react-router-dom";

import {GROUND_STATIONS_QUERY} from "@/api/operations.js";
import StatusChip from "@/components/ui/StatusChip.js";
import QueryState from "@/components/ui/QueryState.js";
import {formatLatitude, formatLongitude} from "@/lib/format.js";
import {getGroundStationState} from "@/lib/status.js";

import styles from "./GroundStationsPage.module.scss";

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function GroundStationsPage() {
  const {data, loading, error, refetch} = useQuery(GROUND_STATIONS_QUERY, {
    variables: {perPage: 50, page: 0},
  });

  const stations = (data?.allGroundStations ?? []).filter((station) => station !== null);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Ground stations</h1>
        <p className={styles.subtitle}>Contracted antenna sites available for scheduling contacts.</p>
      </header>

      <QueryState
        loading={loading && !data}
        error={error}
        hasData={Boolean(data)}
        empty={stations.length === 0}
        emptyMessage="No ground stations are under contract."
        onRetry={() => void refetch()}
      >
        <ul className={styles.grid}>
          {stations.map((station) => {
            const state = getGroundStationState(station.status);
            const [latitude, longitude] = station.coordinates;

            return (
              <li className={styles.card} key={station.id} data-state={state}>
                <div className={styles.cardHead}>
                  <h2 className={styles.name}>
                    <Link className={styles.nameLink} to={`/ground-stations/${station.id}`}>
                      {station.name}
                    </Link>
                  </h2>
                  <StatusChip label={station.status} state={state} />
                </div>
                <dl className={styles.readout}>
                  <div>
                    <dt>Network</dt>
                    <dd>{station.network}</dd>
                  </div>
                  <div>
                    <dt>Position</dt>
                    <dd>
                      {formatLatitude(latitude)}, {formatLongitude(longitude)}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      </QueryState>
    </section>
  );
}

export default GroundStationsPage;
