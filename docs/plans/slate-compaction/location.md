# Slate-compaction pass — location batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `docs/subsystems/location.md`.
Line numbers below are the ORIGINAL file's (413 lines) unless noted.

A prior batch (`pilot.md`) already had write access to `location.md` and
inserted `§ Where the terminal stands, and why` (from a *different*
slate — the lounge revisit). This batch is the first to compact
`multilocation-slate.md` itself.

---

## docs/slates/builds/multilocation-slate.md — 413 → 314 · Status PARTIAL → PARTIAL

The status block (already re-stamped by an earlier "sort the backlog"
pass, commit `720d9db06`) was directionally right but the body still
described 2026-08's design conversation as if none of it had shipped.
Verified against `packages/server/src/mud/lib/location/{Warren,InnerWarren,OuterWarren,WarrenMember}.ts`,
`packages/server/src/mud/world/lounge/idea/LoungeWarren.ts`,
`packages/content/saxonberg-lounge/content/world/lounge.yaml` (the
`CartesianZone` — "EVERY LOCATION PLOTS"), `docs/subsystems/location.md`
§§ MultiLocation / The pieces / Core model / Base mechanism vs lounge
policy / Concurrency, `docs/subsystems/holding.md` § Every warren is
inner or outer, `docs/subsystems/zone.md` § Cardinal-only-intra-zone
exit invariant. **Both requirements + plan docs this slate produced
(`multilocation-lounge-requirements.md`, `multilocation-lounge-plan.md`)
are gone from the tree** — retired per the workflow's rules, confirming
the "Once shaped into formal requirements" section is pure history now.

Three findings changed the shape of the compaction from a plain
SHIPPED-cut pass:

1. **The generalization axis that shipped is not the one this slate
   designed.** The slate's "roles + cardinality" model (a Warren as a
   data-driven catalog of `(template × cardinality × attachment)` roles,
   so a dungeon's boss/corridors/chambers are one Warren) was **not
   built**. What shipped instead is a **tier split** — `InnerWarren`
   (members are rooms) vs `OuterWarren` (members are warrens) — a
   different axis entirely, reused by `LoungeWarren`, `DormWarren`,
   `BuildingWarren`, `PlatWarren`, `MineWarren`. The base today has
   exactly ONE elastic role + a host; there is no multi-role catalog.
   This is why decision 4 and `### Roles + cardinality`'s catalog
   framing are kept UNBUILT rather than cut.
2. **The `route`/`seedMember` override surface never shipped.**
   `LoungeWarren` overrides `admitArrival` (least-full only — no
   matchmaking), `attachmentFor`, `wireHostFixtures`, `reconcile`,
   `createMember` — not `route()`/`seedMember()`. There is no per-member
   flavor-seeding hook at all. Every passage naming `route`/`seedMember`
   as what shipped is now wrong and is cut as SUPERSEDED, not
   SHIPPED·DOCUMENTED.
3. **"Merging drains, it does not slam" (decision 6) shipped simpler
   than designed.** `LoungeWarren.reconcile()` is a passive
   occupancy-watch: a satellite under the merge watermark gets a delayed
   reap timer, re-checked at fire time. Nothing stops new arrivals from
   landing in it while the timer runs — least-full routing can in fact
   *prefer* a low-occupancy room pending reap. There is no admission
   block and no active straggler rerouting. `location.md` never claims
   more than this, so it's a build gap, not a doc gap; recorded as a new
   `Left` item rather than silently dropped.

Three open questions resolved **differently than their stated lean**
(SUPERSEDED, not answered-as-guessed): Q1 (abstract tier split, not
concrete-with-defaults), Q2 (zero host mixins + one member mixin, not
"probably two"), Q3 (the lounge **is** a `CartesianZone` — "every
location plots" — not a geography-less social pocket; the
cardinal-only-intra-zone invariant never bites because the star-to-host
doorways are cardinal exits, not semantic labels). Two resolved as
guessed: Q4 (`queueMicrotask` debounce), Q5 (tunable code constants).
Q6 and Q7 are still open and fold into `Left`.

### Cut (SHIPPED · DOCUMENTED)
- Decisions 1–3 (32–51, 20 lines) — Zone/Warren orthogonality, the
  Warren's definition, host→Warren→members — code:
  `lib/location/Warren.ts` (class doc + `_hostMember`/`_members`);
  doc: `location.md § Core model`, `§ The pieces`. Replaced by a
  4-line pointer (one of the three graduated below)
- `### host → Warren → members`'s intro + table + "un-reapable" para
  (129–144 orig, 16 lines) — same doc sections. Replaced by a pointer;
  the "host owns *when*" bullets (lounge vs dungeon) are KEPT (below)
- `### Lifecycle, persistence, refs`'s main body (158–170 orig, 13
  lines) — code: `Warren.ts` (`_hostInFlight`, ref discipline
  comments); doc: `location.md § Core model` ("Lazy + runtime-only"),
  `§ Concurrency`. The closing "honest general definition" parenthetical
  is KEPT (feeds the summoned-graph-host `Left` item)
- `### Roles + cardinality`'s "Membership discriminator" subsection
  (190–198 orig, 9 lines) — code: `world/lounge/location/bar.yaml` +
  `LoungeWarren`'s member set (Dave's Bar never joins it); doc:
  graduated to `location.md § Core model` (see Graduated, below)
- `### The Warren class hierarchy`'s "hierarchy stays shallow" framing
  paragraph — kept (it's still true and still forward-looking); no cut
  here beyond the diagram (see Superseded)
- `## Module taxonomy fit` (296–308 orig minus the host-mixin bullet,
  ~9 lines) — code + doc: `location.md § The pieces`. Replaced by a
  4-line pointer that also carries the host-mixin resolution (folds
  the Superseded item below into one note)
- `## Build order`'s Wave 1 paragraph (341–346 orig, 6 lines) — code:
  `LoungeWarren.ts`, `DormWarren.ts`, `BuildingWarren.ts`,
  `PlatWarren.ts`, `MineWarren.ts`; doc: `location.md § The pieces`.
  Wave 2+ (the dungeon/desert family) is KEPT verbatim — it is this
  slate's `Left` item 1
- `## Once shaped into formal requirements` (373–404 orig, 32 lines) —
  history: the requirements + plan docs this section restates were
  written, used, and retired (neither exists in the tree). Replaced by
  a 6-line pointer naming both retired docs + `location.md`'s promotion
  line

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- Decision 1 / `### Zone is orthogonal — and stays out` (113–125 orig,
  13 lines) — code: `Warren.ts` has no `Zone` import/coupling; doc had
  no explicit statement of *why* → inserted at `location.md § Core
  model` as a new first bullet, **"Orthogonal to `Zone`, not owned by
  it"** (9 lines)
- `### Roles + cardinality`'s "Membership discriminator" (190–198 orig,
  9 lines) — code: `Bar.ts`/`bar.yaml` never join `LoungeWarren`'s
  member set; doc had no generalized statement → inserted at
  `location.md § Core model` as a new bullet, **"The membership
  discriminator"** (7 lines)
- Open question 4, reconcile debounce (326–328 orig, 3 lines) — code:
  `Warren.ts:450-455` (`_reconcilePending` + `queueMicrotask`); doc's
  `§ Concurrency` listed 3 coalescing points but not this one →
  inserted a 4th bullet (5 lines)

### Superseded — cut
- Decision 5's specific claim about `LoungeWarren` overriding `route`/
  `seedMember` (part of 60–63 orig) — by
  `LoungeWarren.admitArrival`/`attachmentFor`/`wireHostFixtures`/
  `reconcile`/`createMember` (no `route`/`seedMember` exist). The
  general claim (thin subclasses over a working base) is TRUE and MORE
  validated than envisioned (5 consumers, not 1) — kept in the same
  note, cut from the slate body with both halves recorded
- Decision 6, "merging drains, it does not slam" (65–69 orig, 5 lines)
  — by `LoungeWarren.reconcile()` (a passive occupancy-watch + timed
  reap, no admission block, no active rerouting). Noted, not silently
  dropped — folds into a new `Left` item
- `### The Warren class hierarchy`'s ASCII diagram + "touches exactly
  two seams" paragraph (228–242 orig, 15 lines) — by the same
  `route`/`seedMember` absence. Pointer left to the decision-5 note
  rather than repeating it
- `### Bud / merge mechanics`'s "Merging = drain-then-collapse"
  subsection (263–268 orig, 6 lines) — by the same reconcile finding.
  Pointer left to the decision-6 note. The hysteresis + budding
  subsections above it (255–262 orig, 8 lines) ARE shipped and are
  folded into the same cut, pointed at `location.md § Base mechanism
  vs lounge policy`
- Module taxonomy's "host mixin + member mixin — open whether one or
  two" bullet — by `WarrenMember.ts` (`WarrenMemberMixin`) being the
  ONLY warren-side mixin; there is no host mixin. Folded into the
  Module-taxonomy pointer above rather than cut separately
- Open question 1, concrete-with-defaults vs abstract+`OverflowWarren`
  — by `Warren.ts` being abstract with an abstract `InnerWarren`/
  `OuterWarren` tier split (`holding.md § Every warren is inner or
  outer`) — an axis this slate never named. Noted in place
- Open question 2, one/two mixins — by zero host mixins + one
  `WarrenMemberMixin`. Noted in place
- Open question 3, exit kind + the cardinal-only-intra-zone invariant
  — by `packages/content/saxonberg-lounge/content/world/lounge.yaml`
  (`class: /platform/idea/location/CartesianZone`, "EVERY LOCATION
  PLOTS" doctrine comment) and `zone.md § Cardinal-only-intra-zone exit
  invariant` (cardinal exits are unconditional within one zone). The
  slate's own lean — "the lounge isn't on a Cartesian frame at all" —
  is the opposite of what shipped; the invariant never bites because
  the star-to-host doorways are ordinary compass directions, not
  semantic labels. Noted in place
- Open question 5, watermark values — by `LoungeWarren.ts`'s
  `DEFAULT_BUD_THRESHOLD`/`DEFAULT_MERGE_WATERMARK`/`getReapGraceMs`
  (tunable code constants, "headed to app settings" per
  `location.md § Base mechanism vs lounge policy`, not yet moved).
  Noted in place

### Kept (UNBUILT)
- the status block (re-stamped) · the intro paragraphs (17–29 orig, the
  slate's framing) · `See also` (one stale annotation fixed — see
  below)
- `## Principle` (all six, kept as Doctrine — see below)
- Decision 4, the roles + cardinality model (39–44 in the new file) —
  the generic multi-role catalog a dungeon needs was NOT built; only a
  single elastic role + a host shipped
- `### Roles + cardinality`'s catalog framing (154–163, 173 new) —
  same reason; the lounge-vs-dungeon object-shape example is kept as
  illustrative of the still-unbuilt mechanism
- `### The Warren class hierarchy` — the base/varies table (still
  states the target shape even though two of its three "varies"
  rows — role catalog, `seedMember` — are unbuilt) and the
  "hierarchy stays shallow on purpose" paragraph
- `## Worked scenario — the lounge graph over an evening` (all six
  steps) — see Uncertain: steps 1/2/6 already work, 3/4/5 describe
  matchmaking/active-drain behavior that hasn't shipped. Kept whole
  rather than fragmenting a six-step narrative
- Open questions 6 (summoned-graph host) and 7 (host/commons
  participation in matchmaking) — both still open
- `## Build order`'s Wave 2+ paragraph — the dungeon/desert family,
  unchanged
- `## What this slate does NOT cover` (all five bullets) — scope
  pointers to other slates/docs, still accurate (see Uncertain on the
  onboarding bullet)

### Doctrine — kept, labelled
- `## Principle` (six one-line restatements of the load-bearing
  decisions) — kept whole rather than split, since 4 of 6 line up with
  cut/superseded decisions and 2 (items 4 and 6) still describe
  UNBUILT/superseded mechanism. Flagged in Uncertain rather than edited
  — a thesis statement, not itself a backlog item

### Uncertain — kept
- `## Worked scenario` — steps 1 (quiet night), 2 (bud), 6 (restart)
  match what shipped; steps 3 (`LoungeWarren.route` matchmaking
  clustering) and 4–5 (a room "stops receiving arrivals" and
  "stragglers drift back") describe behavior that either doesn't exist
  (`route`) or doesn't work that way (`reconcile` is a passive timer).
  Kept as the aspirational end-state rather than cut, since it still
  usefully illustrates the target shape for `lounge-slate.md` and the
  active-drain gap
- `## Principle` items 4 and 6 — no longer full descriptions of the
  shipped mechanism (see the Doctrine note above and the two Superseded
  entries for decisions 4/6's siblings)
- `## What this slate does NOT cover` → *"Onboarding's use of the
  lounge… the lounge slate will amend that to an elastic Warren"* —
  checked `onboarding-slate.md` (outside my write list): it **still**
  describes the lounge as *"a self-contained mini-zone (no foot
  exits)"* (`:44`) — this bullet is NOT stale, the cross-reference is
  still owed. Flagged for the coordinator; not this batch's file to fix
- Overlaps for a future cluster pass: the dungeon/desert family has no
  slate file of its own yet (only forward references here and in
  `hunting-slate.md`'s Uncertain, per `unlinked-5.md`); the lounge's
  matchmaking math is `lounge-slate.md`'s own `Left` item, duplicated
  here as a pointer rather than designed twice

### Handoff (belongs in a doc outside my list)
- none — every graduation targeted `location.md`, which is my
  write-list doc. `zone.md`'s cardinal-invariant section and
  `holding.md`'s inner/outer section were only READ (cited by pointer,
  not edited)

### Status block
- Status: PARTIAL → PARTIAL (not ABSORBED — the generic role/cardinality
  catalog, the summoned-graph host, the lounge matchmaking, and the
  active-drain gap are all real, undesigned-further remainders)
- Left: *the procedural-spatial consumers (the dungeon, the desert) ·
  the summoned-graph host · the lounge's preference-vector matchmaking
  math* (3, terse) → *the procedural-spatial Warren family (the dungeon,
  the desert) — including the generic multi-role/cardinality catalog a
  heterogeneous graph needs · the summoned-graph host (v1 only handles
  the persistent-room case) · the lounge's preference-vector matchmaking
  (owned by `lounge-slate.md`) · an active drain for a room pending
  merge (today's `reconcile` is a passive occupancy-watch + timed reap)*
  (4, and each now says WHY) — the body wins: the role-catalog gap and
  the active-drain gap were real but unstated; the old wording implied
  the dungeon/desert item was purely "someone else's future slate" when
  it also names a real gap in today's base (the catalog)
- Size: a build → a build (unchanged — the dungeon/desert family alone
  is its own build; nothing here shrank to a wave or a tail)

### Minor fixes (code proves a slate statement false, not a design cut)
- `See also` → the `lounge-slate.md` link's `*(forthcoming)*` annotation
  — the slate exists now (`docs/slates/builds/lounge-slate.md`, status
  PARTIAL). Corrected in place per the "statement the code proves
  false" allowance, noted here

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `builds/multilocation-slate.md` | 413 → 314 | PARTIAL → PARTIAL | 3 → 4 | a build → a build |

`docs/subsystems/location.md`: +21 lines (3 graduated inserts — Zone
orthogonality, the membership discriminator, the reconcile-debounce
concurrency bullet — into `§ Core model` ×2 and `§ Concurrency` ×1).
No other file touched.
