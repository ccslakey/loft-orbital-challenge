/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useEffect, useState} from "react";

/* Hook ///////////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Time-derived UI (contact phases, pass countdowns) changes with no data change, so rendering needs a clock.

export const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
};
