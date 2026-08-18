/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {State} from "@/lib/status.js";

import styles from "./StatusChip.module.scss";

/* Props //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface StatusChipProps {
  label: string;
  state: State;
}

function StatusChip({label, state}: StatusChipProps) {
  return (
    <span className={styles.chip} data-state={state}>
      <span className={styles.dot} aria-hidden="true" />
      {label}
    </span>
  );
}

export default StatusChip;

