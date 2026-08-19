# Plan: contact scheduling (`/contacts`)

Implementation plan for the operator-facing contact-scheduling feature. This is
the working document; DECISIONS.md carries only the one-line decisions.

## Goal

Let an operator act on a contact request: pick the satellite, pick a real
visibility window at a contracted ground station, attach the task (customer
payload work or maintenance), and record the scheduled contact through the
API's `createContact` mutation. This is the feature the fleet page's Next
contact column and pass timeline were built to feed.

## Scope framing

The customer request itself is **out of scope**: we assume the request has
already arrived by some outside channel (email, phone, a system we don't
model). The API has no Request entity, so none is faked — the scheduling form
*is* the fulfillment step, and the operator transcribes the request's substance
(satellite, payload, script, config) into it. Request intake/queueing can bolt
on later as a producer of prefilled scheduler links.

## Where it lives

A top-level **`/contacts`** route under the existing "Planning" nav group
(beside Contact map), with two views:

- **`/contacts`** — the schedule: all contacts from `allContacts`, upcoming
  first, with satellite, station, type, payload/customer, operator, and date.
  Scheduling without a record of what is already scheduled is planning blind.
- **`/contacts/new`** — the scheduling flow. Prefill arrives via URL search
  params (`?satellite=…&station=…&aos=…`), reusing the fleet page's
  URL-as-store pattern, so fleet cells can deep-link into a half-completed
  form and the link is shareable.

Entry points: the nav; the fleet table's pass-timeline segments and Next
contact cell, which link to `/contacts/new` prefilled with satellite + window.

Rejected alternatives:

- **Modal over the fleet page** — the flow has too much content (window list,
  script, config) for a modal, and a modal can't be linked to or refreshed.
- **Section on the satellite detail page** — buries a cross-cutting planning
  task inside a single asset's page; the schedule list would have no home.

## What the operator needs to see to make contact

In dependency order — each item gates the next:

1. **The satellite and its fitness**: status (a decommissioned bird can't be
   contacted — excluded), constellation, and whether its TLE propagates (no
   TLE → no windows → the flow says so instead of showing an empty list).
2. **The task**: contact type (Customer Task / Maintenance). A customer task
   needs the payload — and the payload row must show its customer and status,
   because an Inactive payload is a thing the operator should see before
   committing (warn, don't block: reactivating a payload may be the task).
   Maintenance needs no payload (`payload_id` is optional in the schema).
3. **Candidate windows**: every upcoming pass in the next 24 h over
   operational stations — station name, AOS/LOS in UTC, duration, and max
   elevation (higher elevation = better link margin; an operator picks 60°
   over 12° when both fit the request). Reuses `findContactWindows`.
   Stations that are offline/in error are already excluded by the fleet's
   station filtering.
4. **Execution details**: the script to run and its configuration
   (key → value pairs, stored in the JSON `configuration` field, matching the
   seed data's env-var shape).
5. **Who is scheduling**: an explicit employee picker — the API has no
   current-user concept, so no faked auth, same decision as report comments.
6. **What's already booked**: another contact at the same station near the
   same time is a double-booked antenna, and the same satellite can't service
   two contacts at once. Both are interval checks against `allContacts` — see
   "Contact duration and conflicts" below.

## User flow

Single page, three sections that unlock top-to-bottom (a router-driven wizard
is ceremony this size of form doesn't need; disabled sections communicate the
dependency order just as well):

1. **Target & task** — satellite select (prefilled from URL; decommissioned
   excluded), type toggle, payload select (customer tasks only; shows
   customer + status, warns on Inactive).
2. **Window** — table of upcoming windows for the chosen satellite (station,
   AOS, LOS, duration, max elevation, all UTC), radio-select one. Prefilled
   selection when `station`+`aos` params match a computed window; if the
   prefilled window has passed by the time the form loads, it's simply not in
   the list and the operator picks another.
3. **Execution & confirm** — script textarea, config key/value rows, employee
   select, then a review line ("YAM-3 via KSAT Svalbard, 20:39–20:45 UTC,
   Customer Task for Google") and **Schedule contact** → `createContact` →
   navigate to `/contacts` with the new row visible (refetch; optimistic
   insert not needed since we navigate).

Validation: window in the future at submit time, script non-empty, employee
chosen, payload chosen when type is Customer Task. Errors surface inline the
way the comment form does.

## Data notes

- `createContact(configuration, date, employee_id, executionScript,
  groundStation_id, payload_id?, satellite_id, type)` — exists already,
  no server changes.
- **`date` stores the window's AOS; LOS is always recomputed, never stored.**
  AOS and LOS are different in kind: the AOS is the operational commitment
  (the antenna is booked at 20:39 — a fact about the plan), while the LOS is
  pure physics — a derived value, a function of (TLE, station, mask, AOS).
  Persisting a derived value creates a second copy that goes stale: TLEs are
  refreshed continually, and a pass predicted days ahead drifts by seconds to
  minutes as the element set updates (SGP4 error is dominated by along-track
  drift, which shifts pass timing). Recomputing against the current TLE is
  self-correcting; a stored LOS is frozen at whatever the TLE said on
  scheduling day. The only place the schema could hold an LOS is inside
  `configuration`, and that field is the execution script's env config in the
  seed data — smuggling window metadata into it mixes two unrelated concerns
  in one untyped blob. Same philosophy as client-side propagation: store the
  commitment, derive the physics.
- Contact type strings come from the seed enum: "Customer Task",
  "Maintenance".

## Contact duration and conflicts

A LEO contact is bounded by its visibility window (4–10 min above the 10°
mask for this fleet), and real reservation systems book the antenna for the
whole pass plus pre/post-pass buffers. So a contact's cost is deterministic
and recoverable from the stored AOS:

```
window = findNextWindow(satrec, station, from = contact.date)
         // a pass in progress reports aos = from, so this returns the
         // window containing the stored AOS
busy   = [contact.date − PASS_PAD_MS, window.los + PASS_PAD_MS]
```

`PASS_PAD_MS` is a named fleet-wide constant (~2 min each side, mirroring
commercial pre/post-pass reservation buffers), like the default elevation
mask. "When does the satellite/station free up" is `window.los + pad`.

The conflict check is interval intersection between the candidate window and
every existing contact's busy interval, filtered to same station (shared
antenna — the data models one array per station) or same satellite (one bird,
one link). Rendered as a **warning on the affected window row**
("AWS Dublin committed to Starlink-2 until 21:04 UTC"), never a block: the
data can't prove antenna counts, and the operator may know better.

Caveats recorded honestly: the task's actual runtime inside the window is
unknowable (a script may finish in seconds or need more passes), so the whole
window is booked — as real reservations do; and when a contact's TLE no
longer propagates, its busy interval falls back to a worst-case ~15 min
window rather than silently dropping out of the check.

## Phases

1. **C1 — schedule list.** `/contacts` route + nav entry, `allContacts`
   query with joins, upcoming/past grouping.
2. **C2 — scheduling flow.** `/contacts/new`, the three sections, window
   computation, conflict warnings on window rows, `createContact`, URL
   prefill.
3. **C3 — fleet integration.** Pass segments and the Next contact cell become
   links into the prefilled scheduler.

## Scope exclusions

- **Customer request intake** — see scope framing above.
- **No edit or cancel** of scheduled contacts — the API generates
  `updateContact`/`removeContact`, but one honest write path is the pattern
  (as with reports); revisit if a real workflow needs it.
- **No execution or telemetry** — scheduling records a plan; nothing pretends
  to run the script or show a live link.
- **No station capacity model** — beyond the stretch double-booking warning,
  antennas-per-station and setup/teardown gaps are not modelled.
- **No recurrence** — one request, one contact.
