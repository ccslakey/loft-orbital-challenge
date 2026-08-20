/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useQuery} from "@apollo/client/react";

import {EMPLOYEES_QUERY, REPORTS_QUERY} from "@/api/operations.js";
import type {EmployeesQuery, ReportsQuery} from "@/gql/graphql.js";
import QueryState from "@/components/ui/QueryState.js";
import ReportCard from "@/components/ui/ReportCard.js";

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

export default ReportsPage;
