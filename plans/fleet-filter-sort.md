# Plan: fleet filter/sort (`/fleet`)

Implementation plan for filtering and sorting on the fleet table, plus two new
derived columns. This is the working document; DECISIONS.md carries only the
one-line decisions. This is setup for the follow-on feature: a UI to schedule a
contact with a satellite (separate plan when it starts).

## Goal

Let an ops user narrow the fleet to the satellites they care about (status,
constellation, customer, payload category, name) and order the table by the
questions they actually ask: how old is this bird, and when can I next talk to
it.

## Data changes

`SATELLITE_OVERVIEW_QUERY` grows:

- `Launch { date status }` — time since launch, and the pending-launch case.
- `Payloads { id category status Customer { id name } }` — customer and payload
  category are only reachable through the payload join; the satellite has no
  direct customer field.

No server or schema changes; `schema.graphql` snapshot already models these.

## Where filtering and sorting run: client-side

All filtering and sorting happens in the component over the polled result set.

Rationale:

- The two most valuable sort fields (time since launch, next contact) are
  **derived** — one from a joined `Launch.date`, one computed by SGP4 — so the
  API cannot sort on them.
- json-graphql-server's `filter` argument cannot reach through the payload
  join to customer, so the customer filter must be client-side regardless.
- The fleet is 7 rows polled every 5 s; there is no data volume to push down.

Rejected alternative: **server-side `sortField`/`filter` args** — they work for
scalar fields only, would split the logic across two layers, and buy nothing at
this scale. The query keeps its stable `sortField: "name"` as the base order.

## Where the UI state lives: URL search params

Filter and sort state goes in the URL via `useSearchParams`
(e.g. `/fleet?status=In+Orbit&customer=…&sort=launched&dir=desc`), not
component state.

Rationale: a filtered view becomes shareable and survives refresh — "look at
the decommissioned Starlinks" is a link, which is a real ops workflow. It also
keeps the "Apollo cache only, no client store" decision intact: the URL is the
store. Unknown or stale param values (a deleted constellation id) are ignored,
never thrown on.

## UI shape

A toolbar between the header and the table:

- **Selects** for status, constellation, customer, payload category. Options
  are derived from the loaded data (distinct values), not hardcoded enums, so
  they never drift from the API.
- **Text input** for name, substring match, case-insensitive.
- **Clear-filters** affordance, shown only when a filter is active.

Sorting via the column headers themselves: each sortable `<th>` wraps a button
toggling asc/desc, with `aria-sort` on the header and a visible direction
indicator. Sortable: name, status, altitude, time since launch, next contact.

Empty results from filtering get their own message with a clear-filters action
— distinct from the existing "no satellites registered" empty state, which
still means the query returned nothing.

## New columns

- **Launched** — time since `Launch.date`, humanized (e.g. "4.6 yr"), sortable.
  A satellite whose launch is still `Pending` shows "not launched" and sorts
  last in either direction, as do rows with no launch date.
- **Next contact** — time to next AOS over all online ground stations,
  reusing `findNextWindow` and the reachability bound from `lib/windows.ts`,
  same station/satellite inert-skipping rules as the map. Recomputed per poll
  inside a memo (the map already proved the cost is milliseconds), never per
  render. "—" for inert satellites, unusable TLEs, or no window inside the
  24 h horizon; those sort last. This column is the future link into the
  contact-scheduling flow.

Derivation helpers (time-since-launch formatting, next-AOS-per-satellite,
the filter/sort reducers over the row model) land in `lib/` as pure functions
with tests, per the existing testing decision; the component stays thin.

## Phases

1. **F1 — data + columns.** Query extension, Launched and Next contact
   columns, sortable headers.
2. **F2 — filters.** Toolbar, URL search params, filtered empty state.

## Scope exclusions

- **No server-side filtering or pagination** — see rationale above; revisit
  only if the fleet stops fitting in one page.
- **No manufacturer/bus-type/TLE-age filters or columns** — plausible ops
  asks, but breadth without a story here; the detail page already shows them
  (TLE age excepted). Add later if the contact flow wants them.
- **No saved views or persistence beyond the URL.**
- **No changes to the ground-track column** — it stays as-is.
- **Contact scheduling itself** — separate plan; this only leaves the hook
  (the Next contact column) for it.
