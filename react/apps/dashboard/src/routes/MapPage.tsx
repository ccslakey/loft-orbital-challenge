/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {geoCircle, geoEquirectangular, geoGraticule10, geoPath} from "d3-geo";
import {useMemo} from "react";
import {Link} from "react-router-dom";
import {feature} from "topojson-client";
import type {Topology} from "topojson-specification";
import landTopology from "world-atlas/land-110m.json";

import {GROUND_STATIONS_QUERY, MAP_SATELLITES_QUERY} from "@/api/operations.js";
import QueryState from "@/components/ui/QueryState.js";
import {useNow} from "@/hooks/useNow.js";
import {activeFleetStations} from "@/lib/fleet.js";
import {formatAltitude, formatLatitude, formatLongitude} from "@/lib/format.js";
import {createSatrec, groundTrack, orbitalPeriodMinutes, propagateToGeodetic} from "@/lib/propagation.js";
import {getGroundStationState, getSatelliteState} from "@/lib/status.js";
import {parseTle} from "@/lib/tle.js";
import {centralAngleDeg, DEFAULT_ELEVATION_MASK_DEG, elevationDeg, footprintRadiusDeg} from "@/lib/visibility.js";
import {findNextWindow, type ContactWindow} from "@/lib/windows.js";

import styles from "./MapPage.module.scss";

/* Projection /////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Static geometry: projected once at module load, only the markers move.

const MAP_WIDTH = 960;
const MAP_HEIGHT = 480;
const MAP_MARGIN = 4;

const projection = geoEquirectangular().fitExtent(
  [
    [MAP_MARGIN, MAP_MARGIN],
    [MAP_WIDTH - MAP_MARGIN, MAP_HEIGHT - MAP_MARGIN],
  ],
  {type: "Sphere"},
);

const toPath = geoPath(projection);

// world-atlas ships untyped TopoJSON; the file is a standard Topology carrying a `land` object.
const topology = landTopology as unknown as Topology;

const SPHERE_PATH = toPath({type: "Sphere"}) ?? "";
const GRATICULE_PATH = toPath(geoGraticule10()) ?? "";
const LAND_PATH = toPath(feature(topology, topology.objects.land)) ?? "";

// Coordinates arrive as a nullable list of nullable floats; a missing component drops the marker.
const project = (latitude: number | null | undefined, longitude: number | null | undefined): [number, number] | null =>
  latitude == null || longitude == null ? null : projection([longitude, latitude]);

/* Formatting /////////////////////////////////////////////////////////////////////////////////////////////////////// */

const formatUtcTime = (date: Date, reference: Date): string => {
  const time = date.toISOString().slice(11, 16);

  return date.getUTCDate() === reference.getUTCDate() ? time : `${time} +1d`;
};

const formatWindowDuration = ({aos, los, truncated}: ContactWindow): string =>
  `${Math.max(1, Math.round((los.getTime() - aos.getTime()) / 60000))}${truncated ? "+" : ""} min`;

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function MapPage() {
  // Motion comes from local propagation; the slow poll refreshes TLEs and corrects drift.
  const satellitesQuery = useQuery(MAP_SATELLITES_QUERY, {
    variables: {perPage: 50, page: 0},
    pollInterval: 30000,
  });
  const stationsQuery = useQuery(GROUND_STATIONS_QUERY, {variables: {perPage: 50, page: 0}});
  const now = useNow(1000);

  const tracked = useMemo(
    () =>
      (satellitesQuery.data?.allSatellites ?? [])
        .filter((satellite) => satellite !== null)
        .map((satellite) => {
          const tle = parseTle(satellite.tle);

          return {satellite, satrec: tle ? createSatrec(tle) : null};
        }),
    [satellitesQuery.data],
  );

  const stations = useMemo(
    () => (stationsQuery.data?.allGroundStations ?? []).filter((station) => station !== null),
    [stationsQuery.data],
  );

  // Footprints and links are planning aids: decommissioned satellites and offline stations keep only their marker.
  const operationalStations = useMemo(
    () => activeFleetStations(stationsQuery.data?.allGroundStations),
    [stationsQuery.data],
  );

  // Recomputed per poll, not per animation tick: the search costs milliseconds thanks to the
  // reachability bound, but is far too heavy for the 1 Hz clock.
  const upcoming = useMemo(() => {
    const from = new Date();
    const rows = [];

    for (const {satellite, satrec} of tracked) {
      if (!satrec || getSatelliteState(satellite.status) === "inert") {
        continue;
      }

      for (const station of operationalStations) {
        const window = findNextWindow(satrec, station.latitude, station.longitude, from);

        if (window) {
          rows.push({satellite, station, window});
        }
      }
    }

    return rows.sort((a, b) => a.window.aos.getTime() - b.window.aos.getTime());
  }, [tracked, operationalStations]);

  // The scan refreshes on poll boundaries, so between polls a pass can end; hide it once LOS is behind us.
  const currentUpcoming = upcoming.filter(({window}) => window.truncated || window.los.getTime() > now.getTime());

  // The track's shape drifts only with Earth rotation (~0.25°/min), so it recomputes on a minute bucket,
  // not the 1 Hz clock. Inert satellites keep only their marker, same as footprints and links.
  const trackEpochMs = Math.floor(now.getTime() / 60_000) * 60_000;
  const tracks = useMemo(() => {
    const start = new Date(trackEpochMs);
    const rows = [];

    for (const {satellite, satrec} of tracked) {
      if (!satrec || getSatelliteState(satellite.status) === "inert") {
        continue;
      }

      const period = orbitalPeriodMinutes(satrec);
      const coordinates = period === null ? [] : groundTrack(satrec, start, period);

      if (coordinates.length === 0) {
        continue;
      }

      const d = toPath({type: "LineString", coordinates}) ?? "";

      rows.push({id: satellite.id, name: satellite.name, d});
    }

    return rows;
  }, [tracked, trackEpochMs]);

  const fleet = tracked.map(({satellite, satrec}) => ({
    satellite,
    state: getSatelliteState(satellite.status),
    live: satrec ? propagateToGeodetic(satrec, now) : null,
  }));

  const stationEntries = useMemo(
    () => stations.map((station) => ({station, state: getGroundStationState(station.status)})),
    [stations],
  );

  const links = [];

  for (const {satellite, state, live} of fleet) {
    if (state === "inert" || !live) {
      continue;
    }

    for (const station of operationalStations) {
      const elevation = elevationDeg(
        centralAngleDeg(station.latitude, station.longitude, live.latitude, live.longitude),
        live.altitude,
      );

      if (elevation === null || elevation < DEFAULT_ELEVATION_MASK_DEG) {
        continue;
      }

      links.push({
        satellite,
        station,
        elevation,
        path:
          toPath({
            type: "LineString",
            coordinates: [
              [station.longitude, station.latitude],
              [live.longitude, live.latitude],
            ],
          }) ?? "",
      });
    }
  }

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Contact map</h1>
        <p className={styles.subtitle}>
          Sub-satellite points propagated in the browser from each TLE once a second, with visibility footprints and
          active line-of-sight links above a {DEFAULT_ELEVATION_MASK_DEG}° elevation mask.
        </p>
      </header>

      <QueryState
        loading={(satellitesQuery.loading && !satellitesQuery.data) || (stationsQuery.loading && !stationsQuery.data)}
        error={satellitesQuery.error ?? stationsQuery.error}
        hasData={Boolean(satellitesQuery.data && stationsQuery.data)}
        empty={tracked.length === 0}
        emptyMessage="No satellites are registered against this operator."
        onRetry={() => {
          void satellitesQuery.refetch();
          void stationsQuery.refetch();
        }}
      >
        <figure className={styles.panel}>
          <svg
            className={styles.map}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="img"
            aria-label="World map of live satellite positions and contracted ground stations"
          >
            <path className={styles.sphere} d={SPHERE_PATH} />
            <path className={styles.graticule} d={GRATICULE_PATH} />
            <path className={styles.land} d={LAND_PATH} />

            {tracks.map((track) => (
              <path key={track.id} className={styles.track} d={track.d}>
                <title>{`${track.name} — ground track, one orbit ahead`}</title>
              </path>
            ))}

            {fleet.map(({satellite, state, live}) => {
              if (state === "inert" || !live) {
                return null;
              }

              const radius = footprintRadiusDeg(live.altitude);

              if (radius === null) {
                return null;
              }

              const d = toPath(geoCircle().center([live.longitude, live.latitude]).radius(radius)()) ?? "";

              return <path key={satellite.id} className={styles.footprint} data-state={state} d={d} />;
            })}

            {links.map(({satellite, station, elevation, path}) => (
              <g key={`${station.id}-${satellite.id}`} className={styles.link}>
                <title>{`${station.name} ↔ ${satellite.name} — elevation ${elevation.toFixed(0)}°`}</title>
                <path d={path} />
              </g>
            ))}

            {stationEntries.map(({station, state}) => {
              const [latitude, longitude] = station.coordinates;
              const point = project(latitude, longitude);

              if (!point) {
                return null;
              }

              return (
                <g
                  key={station.id}
                  className={styles.station}
                  data-state={state}
                  transform={`translate(${point[0]} ${point[1]})`}
                >
                  <title>{`${station.name} — ${station.status ?? "Unknown"} · ${formatLatitude(latitude)}, ${formatLongitude(longitude)}`}</title>
                  <path d="M0 -4 L4 0 L0 4 L-4 0 Z" />
                </g>
              );
            })}

            {fleet.map(({satellite, state, live}) => {
              const [latitude, longitude] = live ? [live.latitude, live.longitude] : satellite.coordinates;
              const altitude = live ? live.altitude : satellite.altitude;
              const point = project(latitude, longitude);

              if (!point) {
                return null;
              }

              const detail = live ? "" : " · TLE unavailable, last server position";

              return (
                <g
                  key={satellite.id}
                  className={styles.satellite}
                  data-state={state}
                  data-degraded={live ? undefined : true}
                  transform={`translate(${point[0]} ${point[1]})`}
                >
                  <title>{`${satellite.name} — ${satellite.status ?? "Unknown"} · ${formatLatitude(latitude)}, ${formatLongitude(longitude)} · ${formatAltitude(altitude)}${detail}`}</title>
                  <circle r={3.5} />
                  <text className={styles.markerLabel} x={7} y={-6}>
                    {satellite.name}
                  </text>
                </g>
              );
            })}
          </svg>

          <figcaption className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendSatellite} aria-hidden="true" /> Satellite
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendStation} aria-hidden="true" /> Ground station
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendTrack} aria-hidden="true" /> Ground track, one orbit
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendFootprint} aria-hidden="true" /> Visibility footprint
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendLink} aria-hidden="true" /> Line of sight
            </span>
            <span className={styles.legendNote}>
              Colour encodes reported status. Footprints and links skip decommissioned or offline assets; a hollow
              marker means the TLE could not be used and the position is the server&apos;s last poll.
            </span>
          </figcaption>
        </figure>

        <section className={styles.contacts}>
          <h2 className={styles.contactsTitle}>Next contacts — 24 h horizon, times UTC</h2>

          {currentUpcoming.length === 0 ? (
            <p className={styles.contactsNote}>No contacts clear the mask within the next 24 hours.</p>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">Station</th>
                      <th scope="col">Satellite</th>
                      <th scope="col" className={styles.numeric}>
                        <abbr title="Acquisition of signal">AOS</abbr>
                      </th>
                      <th scope="col" className={styles.numeric}>
                        <abbr title="Loss of signal">LOS</abbr>
                      </th>
                      <th scope="col" className={styles.numeric}>
                        Duration
                      </th>
                      <th scope="col" className={styles.numeric}>
                        Max elev
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUpcoming.slice(0, 10).map(({satellite, station, window}) => (
                      <tr key={`${station.id}-${satellite.id}`}>
                        <td>{station.name}</td>
                        <td>
                          <Link className={styles.rowName} to={`/fleet/${satellite.id}`}>
                            {satellite.name}
                          </Link>
                        </td>
                        <td className={styles.numeric}>{formatUtcTime(window.aos, now)}</td>
                        <td className={styles.numeric}>{window.truncated ? "—" : formatUtcTime(window.los, now)}</td>
                        <td className={styles.numeric}>{formatWindowDuration(window)}</td>
                        <td className={styles.numeric}>{`${Math.round(window.maxElevationDeg)}°`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {currentUpcoming.length > 10 ? (
                <p className={styles.contactsNote}>
                  {currentUpcoming.length - 10} more pairs have a window inside the horizon.
                </p>
              ) : null}
            </>
          )}
        </section>
      </QueryState>
    </section>
  );
}

export default MapPage;
