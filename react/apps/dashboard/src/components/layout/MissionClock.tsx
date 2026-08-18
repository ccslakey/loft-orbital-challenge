/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useEffect, useState} from "react";

/* Component //////////////////////////////////////////////////////////////////////////////////////////////////////// */
// Operations run on UTC, so the shell shows UTC rather than the viewer's local time. Displaying local time here would
// be actively misleading when reading a contact window.

function MissionClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(timer);
  }, []);

  const stamp = now.toISOString().slice(11, 19);

  return (
    <time dateTime={now.toISOString()}>
      {stamp} <abbr title="Coordinated Universal Time">UTC</abbr>
    </time>
  );
}

export default MissionClock;
