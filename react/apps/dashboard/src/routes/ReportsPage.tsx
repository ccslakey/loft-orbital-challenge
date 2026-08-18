/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import styles from "./ReportsPage.module.scss";

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// SCAFFOLD: routed and styled, but intentionally left unimplemented. `allReports` exposes reports with their author,
// affected satellite or ground station, and threaded comments — including a `createComment` mutation, which is the
// natural place to demonstrate writes and optimistic cache updates.

function ReportsPage() {
  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.title}>Reports</h1>
        <p className={styles.subtitle}>Incident and maintenance records raised against satellites and ground sites.</p>
      </header>

      <div className={styles.placeholder}>
        <p className={styles.placeholderTitle}>Not built yet</p>
        <p className={styles.placeholderBody}>
          This route is wired up and inherits the shell, but the reports view has not been implemented.
        </p>
      </div>
    </section>
  );
}

export default ReportsPage;
