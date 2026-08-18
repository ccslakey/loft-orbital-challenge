/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {State} from "@/lib/status.js";

import styles from "./StatusChip.module.scss";

/* Props //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface StatusChipProps {
  /** The raw label to display, e.g. "In Orbit". */
  label: string;
  /** The operational state that decides the colour. */
  state: State;
}

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// The only place in the app that is allowed to introduce saturated colour, which is what keeps "colour is state"
// enforceable rather than aspirational.

function StatusChip({label, state}: StatusChipProps) {
  return (
    <span className={styles.chip} data-state={state}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}

export default StatusChip;
