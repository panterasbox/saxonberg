# Slate-compaction ledger — batch `press`

Agent scope: `docs/slates/builds/press-slate.md`,
`docs/slates/builds/gazette-slate.md`. Insertable doc:
`docs/subsystems/press.md` only. Graduations belonging elsewhere go to
Handoff, never written into another doc.

## Findings (before cutting)

Verified against code, not against the slates' own markers:

- `PublisherMixin` / `OrganizationMixin` / `mayPublishAs` /
  `holdsPublishingPosition` / appointing-authority-appoints-position-
  publishes / `/feed/<publisher>/` in the document tree / the anonymous
  press room (`GET /api/press/releases`) / `PressRoom.tsx` on the start
  screen / graceful degradation (three terminal states) / no-CORS-needed
  — all confirmed shipped **and already fully documented** in
  `docs/subsystems/press.md` (decisions 1–3, the client section, the
  anonymous-press-room section). This is the bulk of both slates' now-
  redundant material.
- The `bulletins`/`documents` collection reset policy
  (`packages/server/src/schema/documents.yaml`) confirms releases
  (`kind: 'release'`) are exempted from the nightly wipe — Wave 0's
  "bulletins must survive the nightly wipe" ask is shipped, documented in
  the schema doc (not press.md, but a canonical subsystem-adjacent
  source).
- NOT found anywhere in `packages/server/src/mud/**`,
  `packages/client/src/**`, `packages/content/**`: subscription/push
  (`NotifyPolicy` has no press tie-in), bylines/newsroom roster, a
  credibility/reputation track record for the press, a paywall, FOIA,
  classification/sealing, source protection, a recording/"witness"
  instrument, a journalism Discipline, a "docket" in the governance-
  register sense (only UI-shelf "docket" widgets exist, unrelated), an
  events-not-significance structural enforcement, locality-scoped
  gazette content beyond the two seeded Compact publishers, a "stance"
  action on a ticker, or a comments-link field on `Release`. All of
  these remain genuinely UNBUILT — kept verbatim.
- `PressLogic`'s `archive`/`recentWindow` sort chronologically
  (`publishedAt`-desc, pins first) with no ranking — consistent with the
  slate's "no algorithm" doctrine, but left as a kept bullet (not
  graduated) since it isn't stated as an explicit commitment anywhere
  and the cost of leaving it is near zero.
- `press.md` already explicitly carries, in its own words, the material
  both slates spend paragraphs re-deriving: "not the forums" (one-
  directional/chronological), "a release is one item" (unit = post, not
  issue), the organization/position split, the doc-tree storage
  rationale, the struck "herald" seat, and the newsroom-roster shape
  still to come. Where a slate section restates one of these, it is cut
  with a pointer rather than re-argued.

---

## docs/slates/builds/press-slate.md — 510 → 457 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## ⭐ A newspaper is an ORGANIZATION that trades and publishes` (41
  lines) — code: `lib/press/Publisher.ts`, `lib/employment/*`
  (`EmploymentApi.holdersOf`); doc: `press.md` §§ *The three decisions*,
  *A press office is not a newsroom*. Replaced with a 9-line pointer
  paragraph (kept the "still unbuilt" tail verbatim).
- Two bullets under `### The form, decomposed`: "the unit is the POST,
  not the issue" and "a publication does NOT ride the forums' Subject
  layer" (+ its 3-row reasons table) (26 lines) — code:
  `lib/press/Release.ts` (a release is a standalone `StoredDocument`,
  never bundled), `PressRoutes.ts`/`PressLogic.ts` (tree-backed, no
  Subject/thread involvement); doc: `press.md`'s opening paragraph ("a
  release is one item… published by an organization") and its
  "Deliberately not the forums" paragraph. Cut silently (redundant with
  a kept sibling bullet immediately after); revision-note preamble
  above this subsection (9 lines, "Revised 2026-08-02…") replaced by a
  2-line pointer since it argued for exactly these two now-shipped
  decisions.
- The `bulletins → /feed/<publisher>/ … no new mechanism` paragraph
  inside `## ⚠ The structural threat` (7 lines) — code:
  `lib/press/Publisher.ts` (`feedPath`), the seeded `/compact/press` +
  `/compact/executive` organizations; doc: `press.md` §§ *A release
  lives in the document tree*, *The seeded publishers*. Replaced with a
  4-line pointer noting the rest of that section (events-not-
  significance rule, docket, stance action) is unaffected.

### Superseded — cut
- `## What a publication is` bullet "The bulletin system is the
  staff-side sibling… the press is the player-side one" — by the
  `bulletin` → `press` rename (`press.md`'s "The rename inventory").
  One-line note left in place.

### Kept (UNBUILT)
- `## Why journalism is a real activity here (the evidence firewall)` —
  doctrine/spine, not a backlog item.
- `### ⭐⭐⭐⭐⭐ The real evolution is PULL → PUSH` (table + doctrine) —
  the docket layer it describes is still missing; overlaps
  `gazette-slate.md`'s identical table (noted in Uncertain).
- Remaining `### The form, decomposed` bullets: Document-at-a-path (kept
  whole because its second sentence, "comments LINK, they do not
  merge," is unbuilt — no such field on `Release`), subscription-as-
  NotifyPolicy, aether delivery, masthead-is-a-person/credibility,
  free/paid tiers, no-algorithm, cadence-as-a-visible-promise.
- `### ⭐⭐⭐ Three overlapping systems, three different shapes` — doctrine
  comparing forums/wiki/press.
- `### ⭐⭐⭐ The paywall is the press's own contradiction` — still-open
  design (no paywall/recurring-contract code found).
- `### ⭐⭐ The piece most worth stealing` (subscriber-list ownership) —
  unbuilt, ties to subscription.
- `## ⚠ The structural threat` — the events-not-significance rule (no
  structural enforcement found anywhere) and the record/docket/ticker
  table; the "stance action" paragraph (no `stance` verb/field found on
  a ticker/release anywhere in code).
- `## Press freedom — and the emergent that teaches it` — speculative
  emergent-gameplay doctrine, nothing press-specific built.
- `## Discipline or reputation? Both` — no journalism Discipline found
  in any catalogue/content pack.
- `## Secrecy — seal, don't hide` — no classification/sealing mechanism
  found.
- `## FOIA — a complete loop…` + `### What "you can see something is
  there" actually requires: the docket` — no FOIA code; docket doesn't
  exist (confirmed absent — the only "docket" hits in the repo are an
  unrelated cockpit-shelf UI concept).
- `## Secrecy creates journalism (the reframe)` — no leak/source-
  protection mechanism.
- `## The recording instrument — analyze's sibling` — no
  witness/recording-instrument code anywhere.
- `## Open questions` items 1, 2, 4, 5, 6, 7 — all still open (no
  distribution/economics/source-protection/seal-authority/leak-
  traceability/pedagogy-Discipline code exists). Item 3 (retraction &
  correction) kept **verbatim though half-answered**: `retract()` and
  `edit()` ship (soft delete, change-only-what-you-pass — see
  `press.md` §§ *`PressApi`/`PressLogic`*), but "does a correction
  repair standing" depends on the still-nonexistent credibility track
  record, so the question's live half survives.
- `## The pedagogy pass — deliberately deferred` — unbuilt, explicitly
  deferred by the user.

### Uncertain — kept
- The PULL→PUSH record/docket/ticker table appears near-verbatim in
  both `press-slate.md` and `gazette-slate.md`. Kept in both per the
  pilot's "two slates say the same open thing" rule; a future cluster
  pass should merge them into one doctrine home (likely `press.md`'s
  intro, once the docket ships and there's a real § to hang it on).

### Status block
- Left: *newspaper-as-org + newsroom roster · subscription/push ·
  bylines · credibility · paywall · sealing+FOIA docket · source
  protection · recording instrument · retraction & correction ·
  pedagogy pass* → *newsroom roster (org substrate now shipped) ·
  bylines · subscription/push (aether) · credibility + correction-
  repairs-standing · paywall · classification/sealing + FOIA loop
  (needs docket) · source protection + leak traceability · recording
  instrument · journalism Discipline · pedagogy pass*
- Size: a build → a build (unchanged — still substantial)

---

## docs/slates/builds/gazette-slate.md — 225 → 174 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## ⚠ The launch problem, stated precisely` + `## ⭐⭐⭐ The seams are
  already cut` (28 lines) — code: `PressRoutes.ts` (`GET
  /api/press/releases`, no `requireAuth`), `PressRoom.tsx` (start-
  screen consumer); doc: `press.md` §§ *The anonymous press room*,
  *The client*, *A press office is not a newsroom* (herald),
  *`PublisherMixin`* (`realm` field). Replaced with a 13-line "RESOLVED"
  pointer block, heading kept so the diagnosis stays legible.
- `# Wave 0 — make it visible. Launch-critical.` (26 lines, the full
  bullet list + non-goals) — code: `PressRoutes.ts` (anonymous route +
  the "no CORS change" comment block verified against `Server.
  setupRoutes`), `PressRoom.tsx` (pre-login surface + 3-terminal-state
  degradation, checked against its test file), `packages/server/src/
  schema/documents.yaml` (`reset: wipe-except, keep: declared-document-
  kinds`, explicitly naming "the gazette design requires bulletins to
  outlive the night"); doc: `press.md` §§ *The anonymous press room*,
  *The client*, *No CORS change is needed*. Replaced with an 8-line
  pointer block; heading kept as `# ~~Wave 0~~ · SHIPPED`.
- `# ~~Wave 1 — the gazette~~ · STRUCK, and partly built`'s "What
  shipped instead" bullets (28 lines) + the closing "The OOC realm
  stays exactly as it is" paragraph (5 lines) — code:
  `lib/press/Publisher.ts`, `EmploymentApi.holdersOf`,
  `mayPublishAs`; doc: `press.md` §§ *The three decisions*, *A press
  office is not a newsroom*. Replaced with an 11-line pointer block;
  section retitled `# Wave 1 — still open` since only the open half
  remains.
- The `/feed/<publisher>/` bullet under `# Wave 2 — the press` — code:
  `lib/press/Publisher.ts` `feedPath`, the seeded `/compact/press` +
  `/compact/executive`; doc: `press.md` § *A release lives in the
  document tree*. Cut with an inline parenthetical pointer rather than
  a whole paragraph (the section's remaining bullets need the intro
  sentence intact).
- Open questions 1, 2, 4, 5 — each resolved by shipped, documented
  behavior:
  - Q1 (where Wave 0 lands): resolved to "start screen only";
    homepage is `press.md`'s own stated non-goal.
  - Q2 (reuse archive vs own endpoint): resolved — own endpoint,
    `PressRoutes.ts`.
  - Q4 (automatic vs seat-holder publish): resolved on its published
    half (`mayPublishAs` requires a position-holder; no automatic-
    publish code path found anywhere) — the docket-automation half is
    unaffected and stays tracked under Wave 1's kept bullets.
  - Q5 (locality with no herald): resolved — `press.md` § *The
    appointing authority appoints* ("an organization with no comms
    director publishes nothing").
  Each replaced with a 2–4 line "Resolved" note + pointer in place of
  the original leaning/question text.
- The un-headed "Status: sequencing plan…" narrative line (2 lines,
  just under the intro) — stale: Wave 0 already shipped and Wave 1 is
  struck, so "Wave 0 is launch-critical… Waves 1–2 wait on the
  refactor" no longer describes anything live. Deleted outright (no
  pointer needed — it was pure sequencing narrative, not a design
  decision).

### Kept (UNBUILT)
- `## ⭐⭐⭐⭐ And press-slate already protects the vocation` (full
  section, including `### And the docket being PULL is by design`) —
  the record/docket/ticker table's docket row is still "missing — the
  gap" (confirmed: no docket code anywhere); kept as the slate's core
  remaining argument.
- `# Wave 1 — still open`'s three bullets: events-not-significance
  enforcement (nothing found), the docket (nothing found),
  locality-scoped gazette content (only the two Compact-level
  publishers exist; no locality/city-scoped press org in any content
  pack).
- `# Wave 2 — the press`'s remaining bullets: subscription, the
  stance action, the three source paths + recording instrument — none
  found in code; this wave is explicitly press-slate's to size, kept
  as a pointer-only stub here.
- Open question 3 (docket: new surface or projection?) — fully open,
  the docket doesn't exist yet.

### Uncertain — kept
- The record/docket/ticker three-layer table duplicates
  `press-slate.md`'s `### PULL → PUSH` table near-verbatim — see the
  matching Uncertain note in that slate's ledger entry above. Same
  disposition: kept in both, flagged for a future merge.

### Handoff (belongs in a doc outside my list)
- None. All shipped material this slate names is press-substrate and
  belongs in `press.md`, which is in scope for this batch.

### Status block
- Left (unchanged by this pass — the body already matched it): the
  docket · the events-not-significance rule enforced structurally ·
  locality-scoped gazettes as shipped content · Wave 2 (press-slate's).
- Status: PARTIAL → PARTIAL (Wave 0 fully shipped, Wave 1 fully struck/
  shipped except its two named bullets — the remaining PARTIAL is
  entirely "the docket + Wave 2", both substantial).
- Size: *a build* → *a build*, reworded to say explicitly that Wave 0/1
  are done and what's left (the docket, cross-jurisdictional and not
  small) is not a tail.
