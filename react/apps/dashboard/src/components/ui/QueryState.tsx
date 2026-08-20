/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {ErrorLike} from "@apollo/client";
import type {ReactNode} from "react";

import styles from "./QueryState.module.scss";

/* Props //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface QueryStateProps {
  loading: boolean;
  error?: ErrorLike;
  /** When data is already on screen, an error renders as a non-blocking banner instead of replacing the page. */
  hasData?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: ReactNode;
}

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function QueryState({loading, error, hasData, empty, emptyMessage, onRetry, children}: QueryStateProps) {
  if (error && !hasData) {
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

  return (
    <>
      {error ? (
        <p className={styles.stale} role="status">
          <span>Link degraded — showing last received data.</span>
          {onRetry ? (
            <button className={styles.staleRetry} type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </p>
      ) : null}
      {children}
    </>
  );
}

export default QueryState;
