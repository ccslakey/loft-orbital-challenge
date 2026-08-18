/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {Link} from "react-router-dom";

import styles from "./NotFoundPage.module.scss";

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */

function NotFoundPage() {
  return (
    <section className={styles.page}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>No such record</h1>
      <p className={styles.body}>That address does not correspond to anything this console tracks.</p>
      <Link className={styles.back} to="/fleet">
        Back to satellites
      </Link>
    </section>
  );
}

export default NotFoundPage;

