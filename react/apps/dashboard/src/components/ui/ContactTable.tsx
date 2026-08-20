/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {ReactNode} from "react";

import {PHASE_PRESENTATION, type ContactPhase} from "@/lib/contacts.js";
import {formatUtcDateTime} from "@/lib/format.js";

import StatusChip from "./StatusChip.js";
import styles from "./ContactTable.module.scss";

/* Props //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

interface ContactTableContact {
  id: string;
  type: string;
  Payload?: {name: string} | null;
  Employee?: {name: string} | null;
}

interface ContactTableProps<T extends ContactTableContact> {
  rows: ReadonlyArray<{contact: T; dateMs: number; phase: ContactPhase; windowLabel: string | null}>;
  /** The column linking back to the other side of the contact (Station on a satellite page, and vice versa). */
  entityHeader: string;
  renderEntity: (contact: T) => ReactNode;
}

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ContactTable<T extends ContactTableContact>({rows, entityHeader, renderEntity}: ContactTableProps<T>) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Phase</th>
            <th scope="col" className={styles.numeric}>
              Date
            </th>
            <th scope="col">{entityHeader}</th>
            <th scope="col">Type</th>
            <th scope="col">Payload</th>
            <th scope="col">Operator</th>
            <th scope="col" className={styles.numeric}>
              Window
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({contact, dateMs, phase, windowLabel}) => (
            <tr key={contact.id} data-state={PHASE_PRESENTATION[phase].state}>
              <td>
                <StatusChip label={PHASE_PRESENTATION[phase].label} state={PHASE_PRESENTATION[phase].state} />
              </td>
              <td className={styles.numeric}>{formatUtcDateTime(dateMs)}</td>
              <td>{renderEntity(contact)}</td>
              <td>{contact.type}</td>
              <td>{contact.Payload?.name ?? "—"}</td>
              <td>{contact.Employee?.name ?? "—"}</td>
              <td className={styles.numeric}>{windowLabel ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ContactTable;
