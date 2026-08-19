/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useState} from "react";
import {gql} from "@apollo/client";
import {useMutation, useQuery} from "@apollo/client/react";

import {CREATE_COMMENT, EMPLOYEES_QUERY, REPORTS_QUERY} from "@/api/operations.js";
import type {CreateCommentMutation, EmployeesQuery, ReportsQuery} from "@/gql/graphql.js";
import StatusChip from "@/components/ui/StatusChip.js";
import QueryState from "@/components/ui/QueryState.js";
import {formatDate} from "@/lib/format.js";
import {getGroundStationState, getSatelliteState} from "@/lib/status.js";

import styles from "./ReportsPage.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */

type Report = NonNullable<NonNullable<ReportsQuery["allReports"]>[number]>;
type Employee = NonNullable<NonNullable<EmployeesQuery["allEmployees"]>[number]>;

/* Page ///////////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ReportsPage() {
  const {data, loading, error, refetch} = useQuery(REPORTS_QUERY, {
    variables: {perPage: 50, page: 0, sortField: "date", sortOrder: "desc"},
  });
  const {data: employeeData} = useQuery(EMPLOYEES_QUERY);

  const reports = (data?.allReports ?? []).filter((report): report is Report => report !== null);
  const employees = (employeeData?.allEmployees ?? []).filter((e): e is Employee => e !== null);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Reports</h1>
        <p className={styles.subtitle}>Incident and maintenance records raised against satellites and ground sites.</p>
      </header>

      <QueryState
        loading={loading && !data}
        error={error}
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

/* Report card ////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ReportCard({report, employees}: {report: Report; employees: Employee[]}) {
  const comments = (report.Comments ?? []).filter((comment) => comment !== null);
  const target = reportTarget(report);

  return (
    <li className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.headText}>
          <span className={styles.type}>{report.type}</span>
          <h2 className={styles.reportTitle}>{report.title}</h2>
        </div>
        {target ? <StatusChip label={target.label} state={target.state} /> : null}
      </div>

      <p className={styles.content}>{report.content}</p>

      <p className={styles.byline}>
        {report.Employee?.name ?? "Unknown"}
        {report.Employee?.role ? ` · ${report.Employee.role}` : ""} — {formatDate(report.date)}
      </p>

      <div className={styles.thread}>
        <p className={styles.threadLabel}>Comments ({comments.length})</p>
        {comments.map((comment) => (
          <div className={styles.comment} key={comment.id}>
            <p className={styles.commentMeta}>
              {comment.Employee?.name ?? "Unknown"}
              {comment.Employee?.role ? ` · ${comment.Employee.role}` : ""} — {formatDate(comment.date)}
            </p>
            <p className={styles.commentBody}>{comment.content}</p>
          </div>
        ))}

        <CommentForm reportId={report.id} employees={employees} />
      </div>
    </li>
  );
}

/* Comment form ///////////////////////////////////////////////////////////////////////////////////////////////////// */

function CommentForm({reportId, employees}: {reportId: string; employees: Employee[]}) {
  const [authorId, setAuthorId] = useState("");
  const [content, setContent] = useState("");
  const [createComment, {loading, error}] = useMutation(CREATE_COMMENT);

  const author = employees.find((e) => e.id === authorId);
  const canSubmit = Boolean(author) && content.trim().length > 0 && !loading;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!author) return;

    const date = new Date().toISOString();

    // Failure surfaces through the `error` tuple below; catch keeps the rejected promise from going unhandled.
    createComment({
      variables: {content: content.trim(), date, employee_id: author.id, report_id: reportId},
      // Show the comment immediately; Apollo rolls this back if the write fails. __typename is required at
      // runtime for cache normalization but stripped from the generated types, hence the cast.
      optimisticResponse: {
        createComment: {
          __typename: "Comment",
          id: `optimistic-${author.id}-${date}`,
          content: content.trim(),
          date,
          report_id: reportId,
          Employee: {__typename: "Employee", id: author.id, name: author.name, role: author.role},
        },
      } as CreateCommentMutation,
      // Splice the created comment into the parent report's Comments list in the cache.
      update: (cache, {data}) => {
        const created = data?.createComment;
        if (!created) return;

        cache.modify({
          id: cache.identify({__typename: "Report", id: reportId}),
          fields: {
            Comments(existing = [], {readField}) {
              const ref = cache.writeFragment({data: created, fragment: COMMENT_FRAGMENT});
              const list = Array.isArray(existing) ? existing : [];
              if (!ref || list.some((c) => readField("id", c) === created.id)) return existing;
              return [...list, ref];
            },
          },
        });
      },
      onCompleted: () => setContent(""),
    }).catch(() => {});
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formRow}>
        <label className={styles.srOnly} htmlFor={`author-${reportId}`}>
          Comment author
        </label>
        <select
          id={`author-${reportId}`}
          className={styles.select}
          value={authorId}
          onChange={(event) => setAuthorId(event.target.value)}
        >
          <option value="" disabled>
            Author…
          </option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} · {employee.role}
            </option>
          ))}
        </select>
      </div>

      <textarea
        className={styles.textarea}
        value={content}
        placeholder="Add a comment…"
        rows={2}
        onChange={(event) => setContent(event.target.value)}
      />

      <div className={styles.formFoot}>
        {error ? <span className={styles.formError}>Could not post: {error.message}</span> : <span />}
        <button className={styles.submit} type="submit" disabled={!canSubmit}>
          {loading ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}

/* Helpers ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

// A report targets a satellite or a ground station, sometimes neither. Map whichever is present to its own state.
function reportTarget(report: Report): {label: string; state: ReturnType<typeof getSatelliteState>} | null {
  if (report.Satellite) {
    return {label: report.Satellite.name, state: getSatelliteState(report.Satellite.status)};
  }
  if (report.GroundStation) {
    return {label: report.GroundStation.name, state: getGroundStationState(report.GroundStation.status)};
  }
  return null;
}

/* Fragments //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Matches the Comment shape read back by REPORTS_QUERY, so the cached optimistic entry renders identically.
const COMMENT_FRAGMENT = gql`
  fragment NewComment on Comment {
    id
    date
    content
    Employee {
      id
      name
      role
    }
  }
`;

export default ReportsPage;
