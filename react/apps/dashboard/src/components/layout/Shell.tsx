/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {NavLink, Outlet} from "react-router-dom";

import {FLEET_SUMMARY_QUERY} from "@/api/operations.js";

import MissionClock from "./MissionClock.js";
import styles from "./Shell.module.scss";

/* Navigation /////////////////////////////////////////////////////////////////////////////////////////////////////// */

const NAV_GROUPS = [
  {
    label: "Fleet",
    items: [{to: "/fleet", label: "Satellites"}],
  },
  {
    label: "Ground segment",
    items: [{to: "/ground-stations", label: "Ground stations"}],
  },
  {
    label: "Planning",
    items: [{to: "/map", label: "Contact map"}],
  },
  {
    label: "Records",
    items: [{to: "/reports", label: "Reports"}],
  },
];

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function Shell() {
  const {data, error} = useQuery(FLEET_SUMMARY_QUERY, {pollInterval: 15000});

  const linkState = error ? "critical" : "nominal";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true" />
          <span className={styles.wordmark}>Loft Orbital</span>
          <span className={styles.product}>Fleet Operations</span>
        </div>

        <div className={styles.readout}>
          <span className={styles.metric}>
            <span className={styles.metricValue}>{data?._allSatellitesMeta?.count ?? "––"}</span> tracked
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.clock}>
            <MissionClock />
          </span>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.link} data-state={linkState}>
            <span className={styles.linkDot} aria-hidden="true" />
            {error ? "Link down" : "Link ok"}
          </span>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Sections">
          {NAV_GROUPS.map((group) => (
            <div className={styles.group} key={group.label}>
              <h2 className={styles.groupLabel}>{group.label}</h2>
              <ul>
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({isActive}) =>
                        isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Shell;
