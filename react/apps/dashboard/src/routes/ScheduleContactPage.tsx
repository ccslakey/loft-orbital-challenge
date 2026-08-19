/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useMemo, useState} from "react";
import {useMutation, useQuery} from "@apollo/client/react";
import {Link, useNavigate, useSearchParams} from "react-router-dom";

import {
  CONTACTS_QUERY,
  CREATE_CONTACT,
  EMPLOYEES_QUERY,
  GROUND_STATIONS_QUERY,
  SATELLITE_OVERVIEW_QUERY,
} from "@/api/operations.js";
import QueryState from "@/components/ui/QueryState.js";
import StatusChip from "@/components/ui/StatusChip.js";
import {busyInterval, conflictsFor, PASS_PAD_MS, recoverContactWindow, type ScheduledUse} from "@/lib/contacts.js";
import {CONTACT_HORIZON_HOURS, findContactWindows, type FleetStation, type PassWindow} from "@/lib/fleet.js";
import {formatSpan} from "@/lib/format.js";
import {createSatrec} from "@/lib/propagation.js";
import {getGroundStationState, getPayloadState, getSatelliteState} from "@/lib/status.js";
import {parseTle} from "@/lib/tle.js";

import styles from "./ScheduleContactPage.module.scss";

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */

const CONTACT_TYPES = ["Customer Task", "Maintenance"] as const;

type ContactType = (typeof CONTACT_TYPES)[number];

const CONTACTS_VARIABLES = {perPage: 100, page: 0};

// Consecutive passes at one station are orbit-period apart, so a few minutes of slack is unambiguous.
const PREFILL_AOS_TOLERANCE_MS = 5 * 60_000;

/* Formatting /////////////////////////////////////////////////////////////////////////////////////////////////////// */

const hhmm = (ms: number): string => new Date(ms).toISOString().slice(11, 16);

const windowKey = ({stationId, aosMs}: PassWindow): string => `${stationId}:${aosMs}`;

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ScheduleContactPage() {
  const satellitesQuery = useQuery(SATELLITE_OVERVIEW_QUERY, {variables: {perPage: 50, page: 0}});
  const stationsQuery = useQuery(GROUND_STATIONS_QUERY, {variables: {perPage: 50, page: 0}});
  const employeesQuery = useQuery(EMPLOYEES_QUERY);
  const contactsQuery = useQuery(CONTACTS_QUERY, {variables: CONTACTS_VARIABLES});
  const [createContact, {loading: saving, error: saveError}] = useMutation(CREATE_CONTACT);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [satelliteId, setSatelliteId] = useState(searchParams.get("satellite") ?? "");
  const [type, setType] = useState<ContactType>("Customer Task");
  const [payloadId, setPayloadId] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  // Deep-link window prefill. The linking page bisected its AOS from a different scan grid, so the values
  // differ by milliseconds — the prefill matches by station plus AOS proximity, never exact equality.
  const [prefill, setPrefill] = useState(() => {
    const station = searchParams.get("station");
    const aosMs = Number(searchParams.get("aos"));

    return station && Number.isFinite(aosMs) ? {stationId: station, aosMs} : null;
  });
  const [script, setScript] = useState("");
  const [configRows, setConfigRows] = useState([{key: "", value: ""}]);
  const [employeeId, setEmployeeId] = useState("");
  const [staleWindow, setStaleWindow] = useState(false);

  const satellites = useMemo(
    () =>
      (satellitesQuery.data?.allSatellites ?? [])
        .filter((satellite) => satellite !== null)
        .filter((satellite) => getSatelliteState(satellite.status) !== "inert"),
    [satellitesQuery.data],
  );

  const employees = (employeesQuery.data?.allEmployees ?? []).filter((employee) => employee !== null);

  const activeStations = useMemo(
    () =>
      (stationsQuery.data?.allGroundStations ?? [])
        .filter((station) => station !== null)
        .flatMap((station): FleetStation[] => {
          const [latitude, longitude] = station.coordinates;

          return getGroundStationState(station.status) === "inert" || latitude == null || longitude == null
            ? []
            : [{id: station.id, name: station.name, latitude, longitude}];
        }),
    [stationsQuery.data],
  );

  const satellite = useMemo(
    () => satellites.find((candidate) => candidate.id === satelliteId) ?? null,
    [satellites, satelliteId],
  );
  const payloads = (satellite?.Payloads ?? []).filter((payload) => payload !== null);
  const payload = payloads.find((candidate) => candidate.id === payloadId) ?? null;

  // Candidate windows for the chosen satellite; passes must start at least one pad ahead to be schedulable.
  const windows = useMemo(() => {
    const tle = parseTle(satellite?.tle);
    const satrec = tle ? createSatrec(tle) : null;

    if (!satrec) {
      return null;
    }

    const now = new Date();

    return findContactWindows(satrec, activeStations, now).filter(
      (window) => window.aosMs > now.getTime() + PASS_PAD_MS,
    );
  }, [satellite, activeStations]);

  // Busy intervals from every scheduled contact, for double-booking warnings.
  const scheduledUses = useMemo(() => {
    const uses: ScheduledUse[] = [];

    for (const contact of contactsQuery.data?.allContacts ?? []) {
      if (!contact?.Satellite || !contact.GroundStation) {
        continue;
      }

      const aosMs = new Date(contact.date).getTime();
      const [stationLat, stationLon] = contact.GroundStation.coordinates;
      const tle = parseTle(contact.Satellite.tle);
      const satrec = tle ? createSatrec(tle) : null;
      const recovered =
        satrec && stationLat != null && stationLon != null
          ? recoverContactWindow(satrec, stationLat, stationLon, aosMs)
          : null;

      uses.push({
        ...busyInterval(aosMs, recovered?.losMs ?? null),
        satelliteId: contact.Satellite.id,
        satelliteName: contact.Satellite.name,
        stationId: contact.GroundStation.id,
        stationName: contact.GroundStation.name,
      });
    }

    return uses;
  }, [contactsQuery.data]);

  const prefillWindow =
    prefill === null
      ? null
      : (windows?.find(
          (window) =>
            window.stationId === prefill.stationId &&
            Math.abs(window.aosMs - prefill.aosMs) <= PREFILL_AOS_TOLERANCE_MS,
        ) ?? null);

  const selectedWindow = (windows?.find((window) => windowKey(window) === selectedKey) ?? null) || prefillWindow;

  const configuration = Object.fromEntries(
    configRows.filter((row) => row.key.trim() !== "").map((row) => [row.key.trim(), row.value]),
  );

  const canSubmit =
    satellite !== null &&
    selectedWindow !== null &&
    script.trim() !== "" &&
    employeeId !== "" &&
    (type === "Maintenance" || payloadId !== "") &&
    !saving;

  const activeKey = selectedWindow === null ? "" : windowKey(selectedWindow);

  const pickSatellite = (id: string) => {
    setSatelliteId(id);
    setPayloadId("");
    setSelectedKey("");
    setPrefill(null);
    setStaleWindow(false);
  };

  const pickWindow = (key: string) => {
    setSelectedKey(key);
    setPrefill(null);
    setStaleWindow(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit || !selectedWindow) {
      return;
    }

    // The window list ages while the form is open; a pass that slipped into the past must be repicked.
    if (selectedWindow.aosMs <= new Date().getTime() + PASS_PAD_MS) {
      setStaleWindow(true);
      setSelectedKey("");
      setPrefill(null);

      return;
    }

    // Failure surfaces through the `saveError` tuple; catch keeps the rejected promise from going unhandled.
    createContact({
      variables: {
        date: new Date(selectedWindow.aosMs).toISOString(),
        type,
        executionScript: script.trim(),
        configuration,
        groundStation_id: selectedWindow.stationId,
        satellite_id: satellite.id,
        payload_id: type === "Customer Task" ? payloadId : null,
        employee_id: employeeId,
      },
      refetchQueries: [{query: CONTACTS_QUERY, variables: CONTACTS_VARIABLES}],
      onCompleted: () => navigate("/contacts"),
    }).catch(() => {});
  };

  const loading = (satellitesQuery.loading && !satellitesQuery.data) || (stationsQuery.loading && !stationsQuery.data);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Schedule contact</h1>
        <p className={styles.subtitle}>
          Book a ground-station pass to communicate with a satellite. Windows cover the next {CONTACT_HORIZON_HOURS}{" "}
          hours over operational stations; conflicts with already-scheduled contacts are flagged, not blocked.
        </p>
        <Link className={styles.backLink} to="/contacts">
          ← Scheduled contacts
        </Link>
      </header>

      <QueryState
        loading={loading}
        error={satellitesQuery.error ?? stationsQuery.error}
        empty={satellites.length === 0}
        emptyMessage="No serviceable satellites are registered against this operator."
        onRetry={() => {
          void satellitesQuery.refetch();
          void stationsQuery.refetch();
        }}
      >
        <form className={styles.form} onSubmit={submit}>
          {/* 1 — Target & task */}
          <fieldset className={styles.section}>
            <legend className={styles.sectionTitle}>1 · Target &amp; task</legend>

            <div className={styles.fieldRow}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Satellite</span>
                <select
                  className={styles.select}
                  value={satelliteId}
                  onChange={(event) => pickSatellite(event.target.value)}
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {satellites.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {candidate.status}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.field}>
                <span className={styles.fieldLabel}>Type</span>
                <div className={styles.typeToggle} role="radiogroup" aria-label="Contact type">
                  {CONTACT_TYPES.map((candidate) => (
                    <label key={candidate} className={styles.typeOption}>
                      <input
                        type="radio"
                        name="contact-type"
                        checked={type === candidate}
                        onChange={() => setType(candidate)}
                      />
                      {candidate}
                    </label>
                  ))}
                </div>
              </div>

              {type === "Customer Task" ? (
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Payload</span>
                  <select
                    className={styles.select}
                    value={payloadId}
                    onChange={(event) => setPayloadId(event.target.value)}
                    disabled={satellite === null}
                  >
                    <option value="" disabled>
                      {satellite === null ? "Pick a satellite first" : "Choose…"}
                    </option>
                    {payloads.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} · {candidate.Customer?.name ?? "no customer"} · {candidate.status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            {satellite ? (
              <p className={styles.sectionNote}>
                <StatusChip label={satellite.status} state={getSatelliteState(satellite.status)} />
                {satellite.Constellation ? ` ${satellite.Constellation.name}` : null}
              </p>
            ) : null}

            {payload && getPayloadState(payload.status) === "inert" ? (
              <p className={styles.warning} role="alert">
                {payload.name} is {payload.status} — confirm with the customer that this contact should reactivate it.
              </p>
            ) : null}
          </fieldset>

          {/* 2 — Window */}
          <fieldset className={styles.section} disabled={satellite === null}>
            <legend className={styles.sectionTitle}>2 · Window</legend>

            {satellite === null ? (
              <p className={styles.sectionNote}>Pick a satellite to compute its passes.</p>
            ) : windows === null ? (
              <p className={styles.warning}>
                {satellite.name} has no usable TLE, so no windows can be computed. Contact cannot be scheduled.
              </p>
            ) : windows.length === 0 ? (
              <p className={styles.sectionNote}>
                No passes clear the mask within the next {CONTACT_HORIZON_HOURS} hours.
              </p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col" className={styles.pickHeader}>
                        <span className={styles.srOnly}>Select</span>
                      </th>
                      <th scope="col">Station</th>
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
                      <th scope="col">Conflicts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {windows.map((window) => {
                      const key = windowKey(window);
                      const conflicts = conflictsFor({...window, satelliteId: satellite.id}, scheduledUses);

                      return (
                        <tr key={key} data-selected={activeKey === key || undefined}>
                          <td className={styles.pickCell}>
                            <input
                              type="radio"
                              name="window"
                              aria-label={`${window.stationName}, ${hhmm(window.aosMs)} UTC`}
                              checked={activeKey === key}
                              onChange={() => pickWindow(key)}
                            />
                          </td>
                          <td>{window.stationName}</td>
                          <td className={styles.numeric}>{hhmm(window.aosMs)}</td>
                          <td className={styles.numeric}>{window.truncated ? "—" : hhmm(window.losMs)}</td>
                          <td className={styles.numeric}>{formatSpan(window.losMs - window.aosMs)}</td>
                          <td className={styles.numeric}>{Math.round(window.maxElevationDeg)}°</td>
                          <td>
                            {conflicts.length === 0 ? (
                              <span className={styles.clear}>—</span>
                            ) : (
                              <span className={styles.conflict}>
                                {conflicts[0].stationId === window.stationId
                                  ? `${conflicts[0].stationName} committed to ${conflicts[0].satelliteName}`
                                  : `${conflicts[0].satelliteName} already booked via ${conflicts[0].stationName}`}{" "}
                                until {hhmm(conflicts[0].endMs)} UTC
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {staleWindow ? (
              <p className={styles.warning} role="alert">
                That pass has already started — pick a later window.
              </p>
            ) : null}
          </fieldset>

          {/* 3 — Execution & confirm */}
          <fieldset className={styles.section} disabled={selectedWindow === null}>
            <legend className={styles.sectionTitle}>3 · Execution &amp; confirm</legend>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Execution script</span>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Commands to run during the pass…"
                value={script}
                onChange={(event) => setScript(event.target.value)}
              />
            </label>

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Configuration</span>
              {configRows.map((row, index) => (
                <div className={styles.configRow} key={index}>
                  <input
                    className={styles.input}
                    placeholder="KEY"
                    aria-label={`Configuration key ${index + 1}`}
                    value={row.key}
                    onChange={(event) =>
                      setConfigRows(configRows.map((r, i) => (i === index ? {...r, key: event.target.value} : r)))
                    }
                  />
                  <input
                    className={styles.input}
                    placeholder="value"
                    aria-label={`Configuration value ${index + 1}`}
                    value={row.value}
                    onChange={(event) =>
                      setConfigRows(configRows.map((r, i) => (i === index ? {...r, value: event.target.value} : r)))
                    }
                  />
                  <button
                    type="button"
                    className={styles.rowButton}
                    aria-label={`Remove configuration row ${index + 1}`}
                    disabled={configRows.length === 1}
                    onClick={() => setConfigRows(configRows.filter((_, i) => i !== index))}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={styles.addRow}
                onClick={() => setConfigRows([...configRows, {key: "", value: ""}])}
              >
                + Add row
              </button>
            </div>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Operator</span>
              <select
                className={styles.select}
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
              >
                <option value="" disabled>
                  Choose…
                </option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} · {employee.role}
                  </option>
                ))}
              </select>
            </label>

            {satellite && selectedWindow ? (
              <p className={styles.review}>
                {satellite.name} via {selectedWindow.stationName}, {hhmm(selectedWindow.aosMs)}–
                {selectedWindow.truncated ? "…" : hhmm(selectedWindow.losMs)} UTC · {type}
                {payload && type === "Customer Task" ? ` for ${payload.Customer?.name ?? payload.name}` : ""}
              </p>
            ) : null}

            <div className={styles.formFoot}>
              {saveError ? <span className={styles.formError}>Could not schedule: {saveError.message}</span> : <span />}
              <button className={styles.submit} type="submit" disabled={!canSubmit}>
                {saving ? "Scheduling…" : "Schedule contact"}
              </button>
            </div>
          </fieldset>
        </form>
      </QueryState>
    </section>
  );
}

export default ScheduleContactPage;
