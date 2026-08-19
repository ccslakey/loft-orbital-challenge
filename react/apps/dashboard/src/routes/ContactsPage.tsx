/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {useMemo} from "react";
import {Link} from "react-router-dom";

import {CONTACTS_QUERY} from "@/api/operations.js";
import QueryState from "@/components/ui/QueryState.js";
import StatusChip from "@/components/ui/StatusChip.js";
import {recoverContactWindow} from "@/lib/contacts.js";
import {formatDate, formatSpan} from "@/lib/format.js";
import {createSatrec} from "@/lib/propagation.js";
import {getSatelliteState, type State} from "@/lib/status.js";
import {parseTle} from "@/lib/tle.js";
import type {ContactsQuery} from "@/gql/graphql.js";

import styles from "./ContactsPage.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

type Contact = NonNullable<NonNullable<ContactsQuery["allContacts"]>[number]>;

interface ContactRow {
  contact: Contact;
  dateMs: number;
  state: State;
  // Recovered from the current TLE; null when the stored AOS no longer falls inside a pass.
  windowLabel: string | null;
}

/* Formatting /////////////////////////////////////////////////////////////////////////////////////////////////////// */

const formatUtcDateTime = (ms: number): string => {
  const date = new Date(ms);

  return `${formatDate(date.toISOString())} · ${date.toISOString().slice(11, 16)} UTC`;
};

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ContactsPage() {
  const {data, loading, error, refetch} = useQuery(CONTACTS_QUERY, {variables: {perPage: 100, page: 0}});

  const contacts = useMemo(() => (data?.allContacts ?? []).filter((contact) => contact !== null), [data]);

  // Query order is date desc; upcoming flips to soonest-first, past stays most-recent-first.
  const {upcoming, past} = useMemo(() => {
    const nowMs = new Date().getTime();
    const rows = contacts.flatMap((contact): ContactRow[] => {
      const dateMs = new Date(contact.date).getTime();

      if (Number.isNaN(dateMs)) {
        return [];
      }

      const tle = parseTle(contact.Satellite?.tle);
      const satrec = tle ? createSatrec(tle) : null;
      const [stationLat, stationLon] = contact.GroundStation?.coordinates ?? [null, null];
      const window =
        satrec && stationLat != null && stationLon != null
          ? recoverContactWindow(satrec, stationLat, stationLon, dateMs)
          : null;

      return [
        {
          contact,
          dateMs,
          state: getSatelliteState(contact.Satellite?.status),
          windowLabel: window ? `${formatSpan(window.losMs - dateMs)} · ${Math.round(window.maxElevationDeg)}°` : null,
        },
      ];
    });

    return {
      upcoming: rows.filter((row) => row.dateMs >= nowMs).sort((a, b) => a.dateMs - b.dateMs),
      past: rows.filter((row) => row.dateMs < nowMs),
    };
  }, [contacts]);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <div className={styles.headRow}>
          <h1 className={styles.title}>Contacts</h1>
          <Link className={styles.scheduleButton} to="/contacts/new">
            Schedule contact
          </Link>
        </div>
        <p className={styles.subtitle}>
          Scheduled communication sessions between satellites and contracted ground stations. Window durations are
          recomputed from the current TLE; a dash means the stored time no longer matches a pass.
        </p>
      </header>

      <QueryState
        loading={loading && !data}
        error={error}
        empty={contacts.length === 0}
        emptyMessage="No contacts have been scheduled."
        onRetry={() => void refetch()}
      >
        <ContactGroup title="Upcoming" rows={upcoming} emptyNote="Nothing scheduled ahead." />
        <ContactGroup title="Past" rows={past} emptyNote="No completed contacts on record." />
      </QueryState>
    </section>
  );
}

/* Contact group //////////////////////////////////////////////////////////////////////////////////////////////////// */

function ContactGroup({title, rows, emptyNote}: {title: string; rows: ContactRow[]; emptyNote: string}) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>
        {title} <span className={styles.groupCount}>({rows.length})</span>
      </h2>

      {rows.length === 0 ? (
        <p className={styles.groupEmpty}>{emptyNote}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Satellite</th>
                <th scope="col">Station</th>
                <th scope="col">Type</th>
                <th scope="col">Payload</th>
                <th scope="col">Operator</th>
                <th scope="col" className={styles.numeric}>
                  Window
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(({contact, dateMs, state, windowLabel}) => (
                <tr key={contact.id} data-state={state}>
                  <td className={styles.numeric}>{formatUtcDateTime(dateMs)}</td>

                  <th scope="row" className={styles.nameCell}>
                    {contact.Satellite ? (
                      <>
                        <Link className={styles.name} to={`/fleet/${contact.Satellite.id}`}>
                          {contact.Satellite.name}
                        </Link>
                        <StatusChip label={contact.Satellite.status} state={state} />
                      </>
                    ) : (
                      "—"
                    )}
                  </th>

                  <td>{contact.GroundStation?.name ?? "—"}</td>
                  <td>{contact.type}</td>

                  <td>
                    {contact.Payload ? (
                      <span className={styles.payloadCell}>
                        {contact.Payload.name}
                        {contact.Payload.Customer ? (
                          <span className={styles.payloadCustomer}>{contact.Payload.Customer.name}</span>
                        ) : null}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>{contact.Employee?.name ?? "—"}</td>
                  <td className={styles.numeric}>{windowLabel ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default ContactsPage;
