/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import type {ReactNode} from "react";

import {formatSpan, formatUtcDateTime, formatUtcHhmm} from "@/lib/format.js";

import styles from "./PassTable.module.scss";

/* Props //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

export interface PassLike {
  aosMs: number;
  losMs: number;
  truncated: boolean;
  maxElevationDeg: number;
}

export interface PassTableColumn<Row> {
  header: ReactNode;
  render: (row: Row) => ReactNode;
  numeric?: boolean;
  className?: string;
}

interface PassTableProps<Row> {
  rows: readonly Row[];
  getWindow: (row: Row) => PassLike;
  rowKey: (row: Row) => string;
  /** Columns before the shared AOS / LOS / Duration / Max-elev block. */
  lead: PassTableColumn<Row>[];
  /** Optional column after the shared block (schedule link, conflicts…). */
  trailing?: PassTableColumn<Row>;
  /** HH:MM times with a "+1d" marker past the reference day, for lists inside a one-day horizon. */
  compact?: boolean;
  now?: Date;
  isSelected?: (row: Row) => boolean;
  /** Extra class for the scrolling wrapper, for page-specific panel treatments. */
  wrapClassName?: string;
}

/* Formatting /////////////////////////////////////////////////////////////////////////////////////////////////////// */

const formatCompactTime = (ms: number, reference: Date | undefined): string => {
  const time = formatUtcHhmm(ms);

  return reference && new Date(ms).getUTCDate() !== reference.getUTCDate() ? `${time} +1d` : time;
};

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function PassTable<Row>({
  rows,
  getWindow,
  rowKey,
  lead,
  trailing,
  compact,
  now,
  isSelected,
  wrapClassName,
}: PassTableProps<Row>) {
  const columnClass = (column: PassTableColumn<Row>) =>
    [column.numeric ? styles.numeric : null, column.className].filter(Boolean).join(" ") || undefined;

  return (
    <div className={[styles.tableWrap, wrapClassName].filter(Boolean).join(" ")}>
      <table className={styles.table}>
        <thead>
          <tr>
            {lead.map((column, index) => (
              <th scope="col" className={columnClass(column)} key={index}>
                {column.header}
              </th>
            ))}
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
            {trailing ? (
              <th scope="col" className={columnClass(trailing)}>
                {trailing.header}
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const window = getWindow(row);

            return (
              <tr key={rowKey(row)} data-selected={isSelected?.(row) || undefined}>
                {lead.map((column, index) => (
                  <td className={columnClass(column)} key={index}>
                    {column.render(row)}
                  </td>
                ))}
                <td className={styles.numeric}>
                  {compact ? formatCompactTime(window.aosMs, now) : formatUtcDateTime(window.aosMs)}
                </td>
                <td className={styles.numeric}>
                  {window.truncated
                    ? "—"
                    : compact
                      ? formatCompactTime(window.losMs, now)
                      : `${formatUtcHhmm(window.losMs)} UTC`}
                </td>
                <td className={styles.numeric}>
                  {formatSpan(window.losMs - window.aosMs)}
                  {window.truncated ? "+" : ""}
                </td>
                <td className={styles.numeric}>{Math.round(window.maxElevationDeg)}°</td>
                {trailing ? <td className={columnClass(trailing)}>{trailing.render(row)}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PassTable;
