/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useState} from "react";
import {useMutation, useQuery} from "@apollo/client/react";

import {
  CREATE_REPORT,
  EMPLOYEES_QUERY,
  GROUND_STATION_DETAIL_QUERY,
  GROUND_STATIONS_QUERY,
  MAP_SATELLITES_QUERY,
  REPORTS_QUERY,
  SATELLITE_ACTIVITY_QUERY,
} from "@/api/operations.js";
import type {EmployeesQuery, ReportsQuery} from "@/gql/graphql.js";
import QueryState from "@/components/ui/QueryState.js";
import ReportCard from "@/components/ui/ReportCard.js";

import styles from "./ReportsPage.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

type Report = NonNullable<NonNullable<ReportsQuery["allReports"]>[number]>;
type Employee = NonNullable<NonNullable<EmployeesQuery["allEmployees"]>[number]>;

/* Constants //////////////////////////////////////////////////////////////////////////////////////////////////////// */

const REPORTS_VARIABLES = {perPage: 50, page: 0, sortField: "date", sortOrder: "desc"};

// Mirrors the server's ReportType enum.
const REPORT_TYPES = ["Incident", "Maintenance", "Issue", "Other"] as const;

/* Page ///////////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ReportsPage() {
  const {data, loading, error, refetch} = useQuery(REPORTS_QUERY, {variables: REPORTS_VARIABLES});
  const {data: employeeData} = useQuery(EMPLOYEES_QUERY);

  const reports = (data?.allReports ?? []).filter((report): report is Report => report !== null);
  const employees = (employeeData?.allEmployees ?? []).filter((e): e is Employee => e !== null);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Reports</h1>
        <p className={styles.subtitle}>Incident and maintenance records raised against satellites and ground sites.</p>
      </header>

      <NewReportForm employees={employees} />

      <QueryState
        loading={loading && !data}
        error={error}
        hasData={Boolean(data)}
        empty={reports.length === 0}
        emptyMessage="No reports have been raised."
        onRetry={() => void refetch()}
      >
        <ul className={styles.reports}>
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} employees={employees} />
          ))}
        </ul>
      </QueryState>
    </section>
  );
}

/* New report form //////////////////////////////////////////////////////////////////////////////////////////////////// */

function NewReportForm({employees}: {employees: Employee[]}) {
  const satellitesQuery = useQuery(MAP_SATELLITES_QUERY, {variables: {perPage: 50, page: 0}});
  const stationsQuery = useQuery(GROUND_STATIONS_QUERY, {variables: {perPage: 50, page: 0}});
  const [createReport, {loading: saving, error: saveError}] = useMutation(CREATE_REPORT);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]>("Incident");
  // "sat:<id>" | "gs:<id>" | "" — one select covers both target kinds since a report takes either id.
  const [target, setTarget] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [content, setContent] = useState("");

  const satellites = (satellitesQuery.data?.allSatellites ?? []).filter((satellite) => satellite !== null);
  const stations = (stationsQuery.data?.allGroundStations ?? []).filter((station) => station !== null);

  const canSubmit = title.trim() !== "" && content.trim() !== "" && authorId !== "" && !saving;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const [targetKind, targetId] = target === "" ? [null, null] : (target.split(":") as [string, string]);
    const satelliteId = targetKind === "sat" ? targetId : null;
    const stationId = targetKind === "gs" ? targetId : null;

    // The detail pages read reports through the parent entity, so the matching activity query is
    // refetched too. Failure surfaces through `saveError`; catch keeps the rejection handled.
    createReport({
      variables: {
        title: title.trim(),
        type,
        content: content.trim(),
        date: new Date().toISOString(),
        employee_id: authorId,
        satellite_id: satelliteId,
        groundStation_id: stationId,
      },
      refetchQueries: [
        {query: REPORTS_QUERY, variables: REPORTS_VARIABLES},
        ...(satelliteId ? [{query: SATELLITE_ACTIVITY_QUERY, variables: {id: satelliteId}}] : []),
        ...(stationId ? [{query: GROUND_STATION_DETAIL_QUERY, variables: {id: stationId}}] : []),
      ],
      awaitRefetchQueries: true,
      onCompleted: () => {
        setTitle("");
        setTarget("");
        setContent("");
      },
    }).catch(() => {});
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <h2 className={styles.formTitle}>Raise report</h2>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Title</span>
          <input
            className={styles.input}
            value={title}
            placeholder="Short summary…"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Type</span>
          <select
            className={styles.select}
            value={type}
            onChange={(event) => setType(event.target.value as (typeof REPORT_TYPES)[number])}
          >
            {REPORT_TYPES.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Target</span>
          <select className={styles.select} value={target} onChange={(event) => setTarget(event.target.value)}>
            <option value="">No specific target</option>
            <optgroup label="Satellites">
              {satellites.map((satellite) => (
                <option key={satellite.id} value={`sat:${satellite.id}`}>
                  {satellite.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Ground stations">
              {stations.map((station) => (
                <option key={station.id} value={`gs:${station.id}`}>
                  {station.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Author</span>
          <select className={styles.select} value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
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
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Details</span>
        <textarea
          className={styles.textarea}
          value={content}
          placeholder="What happened…"
          rows={3}
          onChange={(event) => setContent(event.target.value)}
        />
      </label>

      <div className={styles.formFoot}>
        {saveError ? (
          <span className={styles.formError} role="alert">
            Could not raise the report: {saveError.message}
          </span>
        ) : (
          <span />
        )}
        <button className={styles.submit} type="submit" disabled={!canSubmit}>
          {saving ? "Raising…" : "Raise report"}
        </button>
      </div>
    </form>
  );
}

export default ReportsPage;
