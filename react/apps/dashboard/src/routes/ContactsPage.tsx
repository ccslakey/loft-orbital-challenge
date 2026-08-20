/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";
import {useMemo} from "react";
import {Link, useSearchParams} from "react-router-dom";
import type {SatRec} from "satellite.js";

import {CONTACTS_QUERY} from "@/api/operations.js";
import QueryState from "@/components/ui/QueryState.js";
import StatusChip from "@/components/ui/StatusChip.js";
import {useNow} from "@/hooks/useNow.js";
import {contactPhase, contactWindowLabel, recoverContactWindow, type ContactPhase} from "@/lib/contacts.js";
import {formatUtcDateTime} from "@/lib/format.js";
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
  phase: ContactPhase;
  state: State;
  // Recovered from the current TLE; null when the stored AOS no longer falls inside a pass.
  windowLabel: string | null;
}

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ContactsPage() {
  const {data, loading, error, refetch} = useQuery(CONTACTS_QUERY, {variables: {perPage: 100, page: 0}});
  const now = useNow(15_000);
  const [searchParams, setSearchParams] = useSearchParams();

  const satelliteFilter = searchParams.get("satellite");
  const stationFilter = searchParams.get("station");

  const allContacts = useMemo(() => (data?.allContacts ?? []).filter((contact) => contact !== null), [data]);
  const totalCount = data?._allContactsMeta?.count ?? null;
  const contacts = useMemo(
    () =>
      allContacts.filter(
        (contact) =>
          (satelliteFilter === null || contact.Satellite?.id === satelliteFilter) &&
          (stationFilter === null || contact.GroundStation?.id === stationFilter),
      ),
    [allContacts, satelliteFilter, stationFilter],
  );

  // Chip labels from any matching contact; an id with no contacts (or an unknown id) falls back to the raw value.
  const filterChips = [
    satelliteFilter !== null && {
      param: "satellite",
      label: `Satellite: ${contacts[0]?.Satellite?.name ?? satelliteFilter}`,
    },
    stationFilter !== null && {
      param: "station",
      label: `Station: ${contacts[0]?.GroundStation?.name ?? stationFilter}`,
    },
  ].filter((chip) => chip !== false);

  const clearFilter = (param: string) => {
    const next = new URLSearchParams(searchParams);

    next.delete(param);
    setSearchParams(next, {replace: true});
  };

  // Query order is date desc; in-progress and upcoming flip to soonest-first, past stays most-recent-first.
  const {active, upcoming, past} = useMemo(() => {
    const nowMs = now.getTime();
    const satrecCache = new Map<string, SatRec | null>();
    const rows = contacts.flatMap((contact): ContactRow[] => {
      const dateMs = new Date(contact.date).getTime();

      if (Number.isNaN(dateMs)) {
        return [];
      }

      const satId = contact.Satellite?.id ?? "";

      if (!satrecCache.has(satId)) {
        const tle = parseTle(contact.Satellite?.tle);

        satrecCache.set(satId, tle ? createSatrec(tle) : null);
      }

      const satrec = satrecCache.get(satId) ?? null;
      const [stationLat, stationLon] = contact.GroundStation?.coordinates ?? [null, null];
      const window =
        satrec && stationLat != null && stationLon != null
          ? recoverContactWindow(satrec, stationLat, stationLon, dateMs)
          : null;
      const phase = contactPhase(dateMs, window?.losMs ?? null, nowMs);

      return [
        {
          contact,
          dateMs,
          phase,
          state: getSatelliteState(contact.Satellite?.status),
          windowLabel: contactWindowLabel(phase, window, dateMs, nowMs),
        },
      ];
    });

    return {
      active: rows.filter((row) => row.phase === "active").sort((a, b) => a.dateMs - b.dateMs),
      upcoming: rows.filter((row) => row.phase === "upcoming").sort((a, b) => a.dateMs - b.dateMs),
      past: rows.filter((row) => row.phase === "past"),
    };
  }, [contacts, now]);

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
        {totalCount !== null && totalCount > allContacts.length ? (
          <p className={styles.capNote} role="status">
            Showing the {allContacts.length} most recent of {totalCount} contacts.
          </p>
        ) : null}
        {filterChips.length > 0 ? (
          <p className={styles.filterRow}>
            {filterChips.map(({param, label}) => (
              <span className={styles.filterChip} key={param}>
                {label}
                <button
                  type="button"
                  className={styles.filterClear}
                  aria-label={`Clear ${param} filter`}
                  onClick={() => clearFilter(param)}
                >
                  ✕
                </button>
              </span>
            ))}
          </p>
        ) : null}
      </header>

      <QueryState
        loading={loading && !data}
        error={error}
        hasData={Boolean(data)}
        empty={allContacts.length === 0}
        emptyMessage="No contacts have been scheduled."
        onRetry={() => void refetch()}
      >
        <ContactGroup title="In progress" rows={active} emptyNote="No contact is underway right now." />
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

                  <td>
                    {contact.Employee ? (
                      <>
                        {contact.Employee.name}
                        {contact.Employee.role ? (
                          <span className={styles.operatorRole}> · {contact.Employee.role}</span>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
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
