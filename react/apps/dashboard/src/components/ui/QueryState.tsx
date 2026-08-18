/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {ErrorLike} from "@apollo/client";
import type {ReactNode} from "react";

import styles from "./QueryState.module.scss";

/* Props //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface QueryStateProps {
  loading: boolean;
  error?: ErrorLike;
  /** True when the request succeeded but returned nothing. */
  empty?: boolean;
  /** What to say when there is genuinely nothing to show. An empty screen should still give direction. */
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Every route funnels its loading / error / empty branches through here so the four states stay consistent and no page
// silently renders a blank panel.

function QueryState({loading, error, empty, emptyMessage, onRetry, children}: QueryStateProps) {
  if (error) {
    return (
      <div className={styles.state} role="alert">
        <p className={styles.headline}>Link to the API failed</p>
        <p className={styles.detail}>{error.message}</p>
        {onRetry ? (
          <button className={styles.retry} type="button" onClick={onRetry}>
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.state}>
        <p className={styles.headline}>Acquiring telemetry…</p>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={styles.state}>
        <p className={styles.headline}>Nothing tracked yet</p>
        <p className={styles.detail}>{emptyMessage ?? "No records match the current view."}</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default QueryState;
