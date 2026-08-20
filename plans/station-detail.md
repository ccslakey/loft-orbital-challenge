# Plan: ground-station detail page (`/ground-stations/:stationId`)

The ground-segment mirror of `plans/satellite-detail.md`. This is the working
document; DECISIONS.md carries only the one-line decisions.

## Goal

A station is half of every contact, but the ground segment had none of the
treatment the satellite side got: the `/ground-stations` cards linked nowhere,
station-targeted reports were unreachable from any station UI, and there was
no answer to "what is this site doing today?"

## What shipped

- **`/ground-stations/:stationId`** — breadcrumb, header with status chip and
  network/position line, "View contacts" action, and three sections:
  - **Site panel** — network, latitude, longitude.
  - **Upcoming passes (24 h)** — the pass search inverted: every serviceable
    satellite's windows over *this one station*, each row linking to the
    satellite and deep-linking into `/contacts/new` with satellite + station +
    AOS prefilled. Same `WindowsCache`/TTL pattern; inert satellites and null
    TLEs are skipped, and an inert *station* shows an "excluded from contact
    planning" note instead (matching `activeFleetStations` semantics
    everywhere else).
  - **Contacts** — the station's contacts via the `GroundStation.Contacts`
    reverse relation, same flat phase-sorted table as the satellite page,
    windows recovered from each contact's satellite TLE against this station's
    coordinates.
  - **Reports** — `GroundStation.Reports` rendered with the shared
    `ReportCard` (`hideTarget`), comment threads and form included.
- **`/ground-stations` cards** link their names to the detail page.
- **`/contacts?station=`** — the filter generalized from the satellite-only
  param to satellite AND station, one dismissible chip per active param.

## Data flow

One unpolled `GROUND_STATION_DETAIL_QUERY` carries the site plus its contacts
and reports. Unlike the satellite page there is no polling/static split:
stations don't move and their status changes rarely, so nothing on the page
needs a poll. `SATELLITE_OVERVIEW_QUERY` supplies the fleet TLEs for the pass
search and `EMPLOYEES_QUERY` feeds the comment form.

## Reuse

Everything structural comes from the satellite-detail work: `ReportCard`,
`useNow`, `formatUtcDateTime`, `getCachedWindows`/`findContactWindows`,
`recoverContactWindow`/`contactPhase`, and the same page/panel/table SCSS
patterns. No new lib code — hence no new unit tests; the page follows the
standing route-components-untested decision.

## Rejected alternatives

- **"Schedule contact" header action** — the scheduler has no station-only
  prefill (its contract is satellite ± station+AOS), and a bare link would
  land on an empty form. The per-pass Schedule links are the useful entry.
- **Polling the station query** — would re-fetch report threads for a status
  field that changes rarely; a manual refresh covers it.
