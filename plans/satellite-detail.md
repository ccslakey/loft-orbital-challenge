# Plan: satellite detail page (`/fleet/:satelliteId`)

Implementation plan for turning the satellite detail page from a static spec
sheet into an operator surface. This is the working document; DECISIONS.md
carries only the one-line decisions.

## Goal

An operator landing on a satellite's page should see what the bird is *doing*
and be able to act: upcoming passes with one-click scheduling, the contacts
already booked against it, its incident/maintenance reports (with the comment
thread), and enough orbit context to judge whether the predictions on screen
can be trusted.

## What was missing

The page showed position, spacecraft, launch, raw TLE, and payloads — all
static identity. No contacts, no reports, no pass predictions, and the only
link out was the breadcrumb. Every ingredient already existed elsewhere:
`Satellite.Contacts` / `Satellite.Reports` reverse relations in the schema,
the window math in `lib/fleet.ts` / `lib/windows.ts` / `lib/contacts.ts`, and
the scheduler's deep-link contract
(`/contacts/new?satellite=…&station=…&aos=…`).

## What shipped

- **Header quick actions** — "Schedule contact" (prefilled scheduler link;
  rendered disabled for Decommissioned satellites, which the scheduler filters
  out) and "View contacts" (`/contacts?satellite=<id>`).
- **Upcoming passes** — 24 h horizon over operational stations, AOS/LOS,
  duration, max elevation, per-row Schedule link. Same module-level
  `WindowsCache` pattern as the fleet page; satrec memoized off the TLE field
  so the 5 s position poll never recomputes windows.
- **Contacts** — the satellite's scheduled contacts as one flat table
  (in-progress → upcoming → past), phase chip per row, window recovered from
  the current TLE exactly like `/contacts`. Footer links to the filtered
  contacts page.
- **Orbit** — derived elements (`lib/orbit.ts`: inclination, period,
  apogee/perigee, eccentricity, epoch) above the raw TLE, with a caution chip
  when the epoch is older than `TLE_STALE_DAYS` (14).
- **Reports** — full report cards with comment threads and the comment form,
  via `ReportCard` extracted from `/reports` into `components/ui/`; the
  `createComment` optimistic update targets the normalized `Report` entity,
  so it works identically from either page.
- **`/contacts?satellite=`** — new filter param with a dismissible chip, so
  the detail page (and future callers) can link to one satellite's schedule.

## Data flow

`SATELLITE_DETAIL_QUERY` keeps its 5 s poll for position/status. A second
query, `SATELLITE_ACTIVITY_QUERY`, fetches `Contacts` and `Reports` through
the reverse relations **without** polling — otherwise every position tick
would re-fetch report threads and fight the optimistic comment writes. Both
normalize into the same `Satellite:<id>` cache entity. Stations and employees
reuse the existing `GROUND_STATIONS_QUERY` / `EMPLOYEES_QUERY`.

Secondary queries do not gate the page: each panel renders its own
loading/empty note inside the already-mounted layout, so position never waits
on reports.

## Shared extractions (done as part of this)

- `formatUtcDateTime` promoted from `ContactsPage` into `lib/format.ts`.
- `useNow` promoted from `ContactsPage` into `hooks/useNow.ts`.
- `activeFleetStations` extracted into `lib/fleet.ts` from the identical
  memo bodies in `FleetPage` and `ScheduleContactPage`.
- `ReportCard` + `CommentForm` extracted to `components/ui/ReportCard.tsx`
  with a structural report type (accepts both `allReports` and
  `Satellite.Reports` shapes) and a `hideTarget` prop — the target chip is
  redundant on the target's own page.

## Rejected alternatives

- **Extending `SATELLITE_DETAIL_QUERY` with the relations** — one query, but
  the 5 s poll would re-fetch contacts/reports every tick.
- **Three grouped contact sections like `/contacts`** — per-satellite counts
  are a handful; the grouping would render mostly empty states.
- **Compact read-only report rows linking to `/reports`** — pushes the
  operator off-page to comment on the incident they're looking at.
- **`/map?satellite=` focus param** — deliberately out of scope this pass;
  the map has no selection state to hang it on yet.

## Testing

`lib/__tests__/orbit.test.ts` (derived elements + epoch against the seeded
Starlink-1 TLE, staleness math), plus new cases in `format.test.ts`
(`formatUtcDateTime`) and `fleet.test.ts` (`activeFleetStations`). Route
components stay untested per the standing testing decision.
