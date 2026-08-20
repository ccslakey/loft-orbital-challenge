/* Imports ////////////////////////////////////////////////////////////////////////////////////////////////////////// */

import {useNow} from "@/hooks/useNow.js";

function MissionClock() {
  const now = useNow(1000);

  const stamp = now.toISOString().slice(11, 19);

  return (
    <time dateTime={now.toISOString()}>
      {stamp} <abbr title="Coordinated Universal Time">UTC</abbr>
    </time>
  );
}

export default MissionClock;
