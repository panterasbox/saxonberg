# Slate compaction ledger — batch: char-gen

Agent scope: `docs/slates/builds/onboarding-slate.md`. Insertable
subsystem doc: `docs/subsystems/char-gen.md` only. All other
graduations go to Handoff, never written by this agent.

## Findings before cutting

Verified against code, not the slate's own ✅ markers:

- **`enroll` / char-gen intake** — fully shipped and fully documented in
  `docs/subsystems/char-gen.md` already (draft state machine, species
  dossier, commit/spawn atomicity). Nothing to graduate — char-gen.md
  already carries this in more depth than the slate ever did.
- **The lounge** (login-landing zone, bar, terminal) — shipped
  (`packages/server/src/mud/world/lounge/**`, content pack
  `saxonberg-lounge`) and documented in `docs/subsystems/fasttravel.md`
  and `docs/subsystems/location.md` — NOT in char-gen.md.
- **Katie's dorm handover / Duncan Hall** — shipped
  (`packages/content/eternal-university/**`, `Katie.ts`,
  `ProvisionController.ts`) and documented in
  `docs/subsystems/residence.md` §§ around line 220-350 — NOT in
  char-gen.md. (A prior batch already flagged the `requiresWizard` /
  Katie-is-not-a-wizard defect there; not re-litigated here.)
- **Dr. Limen** — grepped for `Limen` across `packages/server/src` and
  `packages/content`: **zero hits**. Not built. The whole "Dr. Limen —
  the Orientation guide" section is genuine UNBUILT design and is kept.
- **The `onboarded` flag / onboarding-progress `PropertiedMixin` flags /
  lounge-exit routing** — grepped `onboard` across server + content:
  **zero hits**. Not built. Kept.
- **The campus journey (crossing → gate → Eternal Way → Quad → Limbo
  Lane → Duncan)** — only the crossing exists
  (`packages/server/src/mud/platform/agent/Gus.ts`,
  `packages/content/terminus/content/world/terminus/university-avenue/**`).
  No Quad, Eternal Way, Silver Street or Limbo Lane content exists
  anywhere in `packages/content`. The slate's own "campus journey" /
  "curriculum + location mapping" sections describe a route that never
  got built in the shape they describe, and — separately — a **later,
  more authoritative design replaced them**:
  `docs/slates/builds/acquisition-slate.md` carries a section literally
  titled *"The first-login journey v2 (supersedes the onboarding
  slate's route)"*, and `docs/requirements/demo-content-requirements.md`
  (dated after this slate, all 15 non-held units marked ✓ at
  requirements depth) specs the actual campus geometry
  (Quad/Eternal-Way/Silver-Street/Limbo-Lane) unit by unit. Per the
  skill, a requirements doc is a valid superseding source even before
  it's built. So the old journey/curriculum content here is SUPERSEDED,
  not UNBUILT — cut, pointer left.
- **The demo augment / "TPA as implant software update" Health-Center
  beat** — explicitly killed in acquisition-slate.md: *"its TPA-update
  job is extinct three ways: no update exists; digitization is the
  TPA's; surgery isn't a walk-in demo."* SUPERSEDED, cut wherever it
  appears.
- **The embodied greeter fork** — resolved, not built: acquisition-slate
  decides "Gus formally absorbs the greeter role (no separate greeter
  carve)." Cut the open question with a pointer; Gus's own first-login
  variant is acquisition-slate's item to track, not duplicated here.
- **Scoped personal authoring** (the dorm-customization on-ramp) —
  grepped `shell-author.md`/`shell-workspace.md`/`access.md` for any
  mention of per-player scoped authoring: none. Not built. Kept, and
  added to `Left` (it wasn't listed there before, though the body and
  the Open Questions both call it out — the body wins).
- **`banking.onboardingStipend` / onboarding coin** — real and shipped
  (`docs/subsystems/fasttravel.md` "onboarding coin", `issueCash` at
  char-gen commit) but the slate never described a stipend, so nothing
  to cut there. Separately, `docs/requirements/economic-bootstrap-requirements.md`
  (2026-09-18) plans to replace the bare stipend with the **Enrollment
  Note**, signed at Katie's desk — noted for the record; the onboarding
  slate itself makes no stipend claim to correct.

## `docs/slates/builds/onboarding-slate.md` — 452 → 400 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `### The lounge` (7 lines) — code: `packages/server/src/mud/world/lounge/**`,
  `packages/content/saxonberg-lounge/**`; doc: `fasttravel.md` (login
  terminal + born-with floor), `location.md` (Lounge/Bar/GlassAlley
  zone). Neither is char-gen.md, so nothing graduated there.
- Old duplicate status block ("Status: flow set, mostly content...",
  7 lines) — the one-status-block rule; folded into the canonical block.
- Open question 3, *"Lounge 'waiting' mechanical or just a lobby?"* —
  answered by what shipped: a plain social lobby, no gating mechanic.
  Pointer left to fasttravel.md.

### Superseded — cut
- Reconciliation note (12 lines, 2026-07-28) — by
  `acquisition-slate.md`'s "first-login journey v2" section, which now
  carries this history in more current form.
- `### The campus journey (first login)`, first two paragraphs (the
  journey narration + "the born-with loadout + the clinic beat") — by
  `acquisition-slate.md`'s journey v2, which has a section literally
  titled *"supersedes the onboarding slate's route"*; the Health
  Center/TPA-software-update beat is explicitly retired there. The
  third paragraph (private-house suggestion) is unrelated to the route
  and kept.
- `## The curriculum + location mapping` — the `### The curriculum
  (C/S/D)` list and `### Location → Core-concept mapping` table (58
  lines) — by `docs/requirements/demo-content-requirements.md` (units
  1–15, all but the held unit 16 marked ✓ at requirements depth: the
  actual Quad/Eternal-Way/Silver-Street/Limbo-Lane geometry and
  per-location teaching content) and by `acquisition-slate.md`'s
  journey v2. The two caveat paragraphs above this table (task-vs-
  lesson, world-first doctrine) are NOT superseded and are kept.
- "The demo augment" bullet under *What this reveals* — by
  `acquisition-slate.md` ("its TPA-update job is extinct three ways").
- Open question 4, the Limen-vs-greeter fork — decided in
  `acquisition-slate.md`: Gus formally absorbs the greeter role.
- `## Build order` (Wave 1/2/3, 15 lines) — Wave 1's lounge/Duncan-Hall
  pieces shipped, Wave 2's route is `acquisition-slate.md`'s to
  sequence now; kept the residual "what's still open" as a one-line
  pointer to the restamped `Left`.
- "The economy" bullet under *What this slate does NOT cover* — moot,
  the demo augment it refers to is retired.
- The first-login-campus-journey bullet under *Once shaped into formal
  requirements* — its "optional embodied greeter" and "demo-augment
  install lesson" framing is superseded; Limen + signs (the parts that
  remain real) are already tracked in `Left` and the full Dr. Limen
  section.

### Kept (UNBUILT)
- `### Lounge-exit routing` — no `onboarded`-flag routing found
  anywhere in `packages/server/src/mud/world/lounge/**`.
- `## Dr. Limen — the Orientation guide` (the full section, ~130
  lines) — zero code hits for `Limen` anywhere in the tree.
- The private-house-suggestion paragraph (kept out of the cut campus-
  journey section) — no affiliation/house-nudge feature found in code.
- `### The dorm + customization (the climax)` — the physical
  lobby→room walk shipped (residence.md), but the paragraph's point is
  the still-unbuilt customization step; kept whole per the
  no-paragraph-splitting rule.
- `## What this reveals (the new system)` — scoped personal authoring,
  wayfinding/signs, the Orientation guide, and the lounge-routing
  bullets (minus the cut demo-augment bullet) — all still unbuilt.
- `## Open questions / forks` items 1–2 (scoped-authoring scope,
  returner routing) — still open.
- `## Once shaped into formal requirements` — kept whole apart from the
  one superseded bullet; see Uncertain below for its Tests bullet.
- Framing/spine: title, "Working slate for onboarding…" intro, "The
  load-bearing decisions" 1–4, "See also", `## Principle`, `## The
  flow` diagram, `## What this slate does NOT cover` (minus the one cut
  bullet).

### Uncertain — kept
- The Tests bullet at the end of *Once shaped into formal requirements*
  ("login spawns in the lounge; … the demo augment installs; a player
  can author their own dorm but not others'") mixes still-relevant
  unbuilt criteria (signs move you, Limen reads the flags, dorm
  ownership check) with one dead clause ("the demo augment installs").
  Kept whole — cutting mid-bullet would be rewriting, not cutting —
  flagged here for whoever converts this to real requirements to drop
  that one clause.
- The "Two modes, keyed on the `onboarded` flag" + "onboarding-progress
  … three booleans" design inside `## Dr. Limen` describes a checklist/
  flag model. `acquisition-slate.md`'s journey v2 says *"Onboarding
  dissolves; Limen goes quiet"* and reframes week one as "need-fired,
  no checklist" — this may contradict the flag-and-checklist model
  documented here. Neither slate resolves this explicitly; kept in both
  per the two-slates rule, flagged for reconciliation when the Limen
  build is actually planned.
- `## The flow` ASCII diagram still says "journey (signs + greeter, …
  demo augment)" — a term now retired per `acquisition-slate.md`. Left
  as-is (it's framing spine, and paragraph-level cuts don't reach into
  a diagram box), but worth a look when this slate is next touched.
- Whether "Gus's first-login greeter variant" (the old slate's own Left
  item) still belongs to this slate or has fully moved to
  `acquisition-slate.md`'s scope: dropped from this slate's `Left` on
  the read that acquisition-slate now owns Gus's build item explicitly
  (its own Left line names "the loadout change, journey v2, Limen …");
  no remaining body section here discusses Gus specifically.

### Handoff (belongs in a doc outside my list)
- None. Everything SHIPPED·UNDOCUMENTED-in-char-gen.md that this slate
  named already has a proper home doc (fasttravel.md, location.md,
  residence.md) — none of it is undocumented anywhere, so nothing
  needs graduating and nothing needs handing off.

### Status block
- Left: `the onboarded flag + lounge-exit routing · Dr. Limen (seat,
  model-backed brain, the reply contract) · the onboarding-progress
  flags and their subscription · Gus's first-login greeter variant ·
  the wayfinding signs` → `the onboarded flag + lounge-exit routing ·
  Dr. Limen (seat, model-backed brain, the reply contract) + the
  onboarding-progress flags and their subscription · scoped personal
  authoring (the dorm customization on-ramp) · the wayfinding signs ·
  the private-house affiliation nudge (rides Limen)`. Added scoped
  personal authoring (body-supported, wasn't listed before — the body
  wins) and the private-house nudge; dropped Gus's greeter variant
  (moved to acquisition-slate.md's scope, see Uncertain).
- Size: `a build` → `a build` (unchanged — Limen + flags + signs +
  scoped authoring is still real engineering work).
- Status: `PARTIAL` → `PARTIAL` (unchanged — `Left` is non-empty).
