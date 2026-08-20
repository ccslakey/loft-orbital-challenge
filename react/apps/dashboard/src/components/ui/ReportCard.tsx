/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useState} from "react";
import {gql} from "@apollo/client";
import {useMutation} from "@apollo/client/react";

import {CREATE_COMMENT} from "@/api/operations.js";
import type {CreateCommentMutation} from "@/gql/graphql.js";
import StatusChip from "@/components/ui/StatusChip.js";
import {formatDate} from "@/lib/format.js";
import {getGroundStationState, getSatelliteState} from "@/lib/status.js";

import styles from "./ReportCard.module.scss";

/* Types //////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Structural, so reports fetched via allReports and via the Satellite.Reports relation both fit.

interface ReportAuthor {
  name: string;
  role: string;
}

interface ReportComment {
  id: string;
  date: string;
  content: string;
  Employee: ReportAuthor | null;
}

export interface ReportCardReport {
  id: string;
  type: string;
  title: string;
  content: string;
  date: string;
  Employee: ReportAuthor | null;
  Comments: ReadonlyArray<ReportComment | null> | null;
  Satellite?: {name: string; status: string} | null;
  GroundStation?: {name: string; status: string} | null;
}

export interface CommentAuthor {
  id: string;
  name: string;
  role: string;
}

/* Report card ////////////////////////////////////////////////////////////////////////////////////////////////////// */

function ReportCard({
  report,
  employees,
  hideTarget = false,
}: {
  report: ReportCardReport;
  employees: CommentAuthor[];
  // The target chip is noise on the target's own detail page.
  hideTarget?: boolean;
}) {
  const comments = (report.Comments ?? []).filter((comment) => comment !== null);
  const target = hideTarget ? null : reportTarget(report);

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

function CommentForm({reportId, employees}: {reportId: string; employees: CommentAuthor[]}) {
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
        aria-label="Add a comment"
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
function reportTarget(report: ReportCardReport): {label: string; state: ReturnType<typeof getSatelliteState>} | null {
  if (report.Satellite) {
    return {label: report.Satellite.name, state: getSatelliteState(report.Satellite.status)};
  }
  if (report.GroundStation) {
    return {label: report.GroundStation.name, state: getGroundStationState(report.GroundStation.status)};
  }
  return null;
}

/* Fragments //////////////////////////////////////////////////////////////////////////////////////////////////////// */

// Matches the Comment shape read back by the report queries, so the cached optimistic entry renders identically.
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

export default ReportCard;
