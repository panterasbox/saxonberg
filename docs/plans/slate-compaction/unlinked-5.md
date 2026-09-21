# Slate-compaction pass — unlinked-5 batch ledger

Eight slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-5/orig/` for diffing.
`fishing-slate.md` is another worktree's (a fishing build is in flight);
it was read for overlaps only and not touched.

Batch-wide findings first (filled in as the batch ran; the per-slate
sections below are the evidence):

- **Seven of eight are what their stamps say — unbuilt design.** flowers ·
  patina · end-of-life · call-security-pass · map · incapacity · hunting
  have no code behind their proposals; the verification found substrate
  that shipped *beside* them (the `dying` clock, `Corpse`, `TrapKit`, the
  `wary` brain, `Durable`/`Keen`, `bornAt`) and stale status prose that
  claimed less or more than the tree holds. Each is recorded per slate.
- **explicit-targeting is the one BUILT slate** (`onFiltered`, commit
  `d0613c014`); it is compacted to the two pieces its own status block
  says are left, and the shipped mechanism is pointed at
  `command-routing.md`.
- **The second status block is kept where its status clause heads a
  framing paragraph** (the tradition precedent from unlinked-1): splitting
  a paragraph is below the granularity the procedure allows. Where the
  second block is a pure status/history paragraph it is cut. Each case is
  named per slate.

---

## docs/slates/builds/flowers-slate.md — 283 → 283 · Status UNBUILT → UNBUILT

Wholly unbuilt. `florist` / `floriograph` / `bouquet` / `tulip` / `wreath`
/ `garland` hit nothing under `packages/server/src`, `packages/content`,
`packages/client/src` or `packages/types/src` (one name-bank row aside);
`lawn` appears once, as room prose (`terminus/…/drove.yaml:40`). The
substrate the slate cites is where it says: the `_flowering` latch
(`lib/husbandry/Growing.ts:317`, `isFlowering()` at `:194`); `give` /
`place` / `wear` / crafting / retail / contracts / chronicle / wiki all
ship per their subsystem docs. Two claims in the substrate table are
softer than the slate states and are listed under *Uncertain*. Zero
cuts; the status block was re-read against the body and stands.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped in place — unchanged text; verified) · the
  second blockquote (15–27) — its status clause is the first sentence of
  the provenance paragraph (farmstead put clover / saffron / pollination
  / the dyestuffs into the *industrial* economy; the social half lives
  here) and the second paragraph is the slate's framing (*not really
  about flowers*); kept under the tradition precedent
- *See also* (every linked slate and doc exists at the linked path;
  the two farmstead links are already marked *retired artifact*)
- `## ⭐⭐⭐ Floriography — meaning is content, and PLAYERS author it` (no
  act record: `GiveController.ts` writes nothing to chronicle; no wiki
  subject type for a flower kind)
- `## What a flower is, mechanically — nearly all of it ships` (the
  table is accurate row by row except the two flagged below)
- `## The florist — the first trade whose demand is *constructed*`
  (`vocations.md` has no florist)
- `## Breeding ornamentals — where novelty itself is the value` (no
  `Genome` anywhere — `Seed.ts:7` names it as explicitly out of scope;
  ranching's parentage-seeding exists at
  `trade-ranching/src/idea/cmd/ranching/BreedController.ts`, for animals)
- `## ⭐ Lawns — a flower at field scale` + `### It has real politics,
  because zoning ships` (see Uncertain)
- `## ⚠⚠ Tulip mania — build the preconditions, NEVER the event` incl.
  the blocking banking question
- `## Open questions` — all seven still open; none is answered by code or
  a doc
- `## Scope guardrails`

### Doctrine — kept, labelled
- `## The frame — a costly signal, and the mechanism transfers intact` —
  Veblen / Spence / Zahavi; the D44 unification (a flower is the same
  costly signal aimed at a different receiver); *a flower must remain
  useless and perishable*. A candidate for `measurement.md`'s *layer 2*
  examples or `docs/design-philosophy.md`; not a backlog item
- `## What must not happen` — five guardrails (no meanings table, no
  `+regard`, no stat effect, nothing may require a flower, no scripted
  bubble). Guardrails for the build, not items in `Left`

### Uncertain — kept
- `## What a flower is, mechanically` → the **Wilts** row says the wilt
  is *the spoilage/freshness gauge*. `FreshnessMixin` composes on
  `platform/thing/Provision.ts:55` only (`spoilage.md`: FreshnessMixin on
  `Provision`); a cut flower is a `Plant`-shaped Thing, not a Provision.
  The gauge exists; whether a flower *is* a Provision, or the mixin moves,
  is a host-placement question the open-questions list already carries
  (*Lean: freshness*). Kept; flagged so requirements decide the host
- `## ⭐ Lawns` → *"it is one land use, no new mechanism"* / `Left`'s *the
  lawn as a land use (D69)*. The parcel vocabulary `LAND_USES`
  (`lib/parcel/LandUse.ts:71-78`) is the closed six — residential ·
  agricultural · commercial · industrial · civic · wild — with no amenity
  entry, and `soil.md § The sward, and the land uses nobody declares (D7)`
  decided *there is no `use` field on a `Field`* — crop / hay / graze /
  orchard fall out of what is standing and where the mouth is. The
  slate's own reduction (*a lawn is pasture whose harvest you throw
  away*) is **compatible** with D7 (a mown sward whose cut is discarded)
  but the phrase *one land use* is not — a lawn under D7 is a *practice*
  on a field, not a declared use, and the zoning fight (*no hens in this
  district*) rides the parcel's closed six, not a lawn entry. Requirements
  must reconcile the wording; the design stands
- Overlaps for the cluster pass: dye / scent ↔ `cosmetics-slate`; the
  `_flowering` latch + breeding ↔ `farming-slate`; the act-record-as-
  ledger question ↔ `chronicle.md` / `provenance.md` (Q4); the
  jewellery / heirloom / trophy generalization ↔ `patina-design-pack`
  (this batch — provenance on a durable is the same *meaning is the
  value* shape, arriving from the wear side)

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged (7 items) — every item corresponds to a body section
  and every UNBUILT section is represented
- Size: a build → a build

---

## docs/slates/tails/patina-design-pack.md — 283 → 283 · Status UNBUILT → UNBUILT

Wholly unbuilt. `Seasoned` / `Patina` / `takesPatina` / `WornIn` hit
nothing under `packages/server/src/mud` or `packages/content/*/src`
(`ThermalRegulation.ts` uses *seasoned* for acclimatization; the
cook-pot row's *seasoned black inside* is prose). No maintenance verb
carries a *used since last care?* state (`lastServiced` / `usedSince`
absent; the platform crafting verbs are `boil heat make pour repair
salvage stir wash`; `lib/craft/Serviceable.ts` is the venue's
washable-kit clean/dirty flag, not an accrual). The substrate the slate
cites is where it says: `lib/material/Durable.ts` + `Keen.ts`,
`lib/craft/Graded.ts`, `stackIdentity` (`stacks.md:66-80`, the
`tarnished` precedent at `:79`), `chattel.md`, the appraiser as a GAP
(`vocations.md:171`); `Material.fieldMeta` (`Material.ts:719`) has no
patina field. Every linked slate exists. Zero cuts.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (verified; unchanged) · the second blockquote (11–16)
  — its status clause heads the framing paragraph (*the stewardship
  pillar has no mechanic for anything improving*), kept under the
  tradition precedent · *See also*
- `## Part 1 — ⭐⭐ The mechanism: patina is the CYCLE, not the act`
- `## Part 2 — ⭐⭐ What it buys: failure modes removed, never power added`
- `## Part 3 — ⭐⭐⭐ Identity: the glob substrate already solves this`
  (describes shipped substrate — `stackIdentity`, chattel — but its
  design step, *mark the patina field `stackIdentity: true`*, is the
  unbuilt item; kept whole)
- `## Part 4 — Two quality axes, different authors` + `### ⭐ It inverts
  depreciation`
- `## Part 5 — Not everything takes it: a material property`
- `## Part 6 — Designed to the format` (the six-row work table is the
  `Left` list; every row is *new* / *update* — none shipped)
- `## Part 7 — ⚠ Dangers` · `## Part 8 — Pedagogy` · `## Interop map`
- `## Open questions` 1–5 — all still open

### Doctrine — kept, labelled
- `## Part 0 — The gap, stated from the doctrine's own words` — *a
  cast-iron pan does not merely fail to rot; it gets better*; the third
  reward `stewardship-doctrine.md` names with no mechanism. The argument
  for the build, not an item in `Left`
- Part 2's principle *patina narrows the distribution; it never moves the
  ceiling* — the objects-side restatement of `advancement.md`'s
  *precision and access, never a multiplier*; a candidate for the
  doctrine doc when the build lands

### Uncertain — kept
- Part 1 names *"whatever the larder's oiling verb turns out to be"* —
  no oiling verb exists anywhere (`hearth-and-larder-design-pack` is
  still a slate); the cycle rule would ride `repair` / `wash` today. Not
  a contradiction; a dependency the plan resolves
- Overlaps for the cluster pass: the seasoned pan ↔
  `hearth-and-larder-design-pack` (this slate says so); the appraiser ↔
  `vocations.md` GAP + any assay / instrumentation slate; *meaning as the
  value of a durable* ↔ `flowers-slate` (this batch, the heirloom
  generalization in its last open question)

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged (5 items) — matches Part 6's table one-to-one
- Size: a wave → a wave

---

## docs/slates/builds/end-of-life-slate.md — 276 → 265 · Status UNBUILT → UNBUILT

The three stages are unbuilt: no `monument` / `funeral` / `attendance` /
`remains` / `potter` class or verb anywhere under
`packages/server/src/mud` (the word hits are unrelated — `Condition.ts`,
`AirTank.ts`, retail); no `masonry` Discipline row under any pack's
`idea/Discipline/`; `chronicle.md` has no *monument*; no event /
attendance primitive. The substrate the status block names is where it
says: `Postmortem.interIn` (`lib/mortality/Postmortem.ts:82`, `interred`
at `:93-97`), `SERVICE_KINDS = repair · treatment · burial`
(`platform/thing/Tariff.ts:69`), the `forensics` Discipline
(`platform/…/idea/Discipline/forensics.yaml`), `analyze postmortem`
(`trade-medicine/src/idea/cmd/perception/AnalyzePostmortemController.ts`
+ the stanza on `platform/cmd/perception/analyze.yaml`), the necropolis
stub (125 lines today, inside Terminus), the monument mason as a GAP
(`vocations.md:281`). `mortality-slate.md:12` confirms custody / remains
/ the coroner economy were *moved out 2026-09-10* to this slate. Three
cuts + a `Left` re-stamp. **Overlap with the 2026-09-18
economic-bootstrap requirements** is narrower than it looks: that doc
decides a *departed* player's estate (active / dormant / escheated by
last-seen, debts first, situs, beneficiaries); this slate is about a
*body*, and a player's death is not estate-ending (the shade reembodies).
One bullet was decided there and is cut with a pointer; two questions
touch it and are flagged.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design surface, unbuilt… Spun out of the
  consequence build's MR review (MR!254, 2026-09-10)… what shipped is 122
  lines"* (13–16, 4) — history; the canonical block already names MR!254,
  and the stub is 125 lines now
- `## What already exists` → *"Verified against the tree at slate time"*
  + the twelve-row substrate table (73–88, 16) — every row shipped and
  documented: `mortality.md § The grave` (`interIn`, the eviction
  objection, `order burial` off a `Tariff`), `§ The corpse`, `§ The
  shade`, `chattel.md`, `chronicle.md`, `participation.md`,
  `smallholding.md`; `analyze postmortem` + `forensics` per the files
  above. A five-line pointer replaces it; the heading and the *Therefore*
  paragraph stay (they frame the three stages)

### Superseded — cut
- `## What this slate does NOT cover` → the *Inheritance and probate —
  needs kinship and a court, and has neither → lineage-slate,
  legal-code-slate* bullet (252–253) — by
  `docs/requirements/economic-bootstrap-requirements.md § Beneficiaries`
  + `§ Debts first, then situs`: a player names a beneficiary; at escheat
  the estate passes to them, debts first, the rest by situs; a dormant
  heir chains onward. Neither kinship nor a court is a precondition. The
  bullet was replaced by a pointer at the same spot

### Kept (UNBUILT)
- the status block (re-stamped) · `## The gap` (framing; see Uncertain
  for one soft claim) · `## What already exists` → the *Therefore*
  paragraph
- `## ⭐⭐ Stage 1 — custody: the body is property nobody owns` (no titled
  body; `chattel.md` is movables; `Postmortem` has no custody field;
  nothing models remains)
- `## ⭐⭐⭐ Stage 2 — the rite… ATTENDED` (no attendance primitive;
  `participation.md` records engagement, never *who was at an event*)
- `## ⭐⭐ Stage 3 — remembrance, and who could pay` (no monument, no
  chronicle hook, no `masonry`)
- `## ⭐ The money — and a burial club is the oldest insurance there is`
  (the coroner economy, potter's field, the burial club — all open;
  `insurance-slate` is unbuilt)
- `## ⚠ What must not happen` (five guardrails; `race.md:720-724` still
  says `lifespanMax` does not bite and must not be quietly finished)
- `## Open questions` 1–7 — all open (Q2 and Q3 touch the requirements;
  see Uncertain)
- `## What this slate does NOT cover` (five of six bullets; the sixth is
  the pointer above) · `## Cross-references` (every target exists;
  `towns-slate.md § The necropolis` at `:838`, the *chronicle entry you
  can stand in front of* line at `:848`)

### Doctrine — kept, labelled
- `## ⭐⭐⭐ There is no natural death, and it decides the shape` — the
  slate's frame: every death is sudden, so *end-of-life is OTHER PEOPLE'S
  WORK*; mortality is what happens to you, this is what your death costs
  everyone standing. Its first half restates `race.md`'s shipped decision
  (a constraint on the build, not an item); the one-liner is the design
  thesis. Not in `Left`

### Uncertain — kept
- `## The gap` → *"`Postmortem.interIn` sets a flag. What that flag does
  is the whole of it… Nobody is remembered."* — `mortality.md § The grave`
  says `interIn` does **three** things: moves the body into the grave,
  lands a **deed on the deceased's own chronicle**, and withdraws the
  eviction objection. So a buried body IS remembered in the ledger sense;
  what is missing is the *physical* remembrance (Stage 3) and the social
  one (Stage 2). The gap stands; the sentence overstates it. Kept
  verbatim
- Q2 *Who has standing to bury?* — lists kin (no kinship model) and
  fallbacks. The economic-bootstrap requirements give every player a
  **named beneficiary** (`§ Beneficiaries`) — a candidate answer for
  *standing* that needs no kinship model, but that doc grants the
  beneficiary the *estate*, not the body. Requirements for this slate
  should decide whether the same designation carries burial standing
- Q3 *What happens when nobody does anything?* + *the coroner economy*
  — the requirements' situs rule (*does leaving it unattended cost anyone
  nearby? yes → the locality*) is the same principle applied to an
  absentee's chattel and livestock; a corpse is a `Creature`, not in that
  table. The principle would put an unclaimed body on the **locality**,
  which is the coroner-economy question's likeliest answer. Not decided
  there; flagged so the two designs land on one rule
- Overlaps for the cluster pass: the necropolis as a locality ↔
  `towns-slate`; the re-embodiment vendors ↔ `mortality-slate`; the
  burial club ↔ `insurance-slate` (the mutual); the estate-freeze
  machinery ↔ `incapacity-slate` (this batch) — the requirements doc
  itself names incapacity's *impound on a claim* as *a cousin* of
  escheat (`economic-bootstrap-requirements.md:58`); kinship ↔
  `lineage-slate`; the rite's religion ↔ `altar-slate` / `faith-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: *custody of the body · the rite as an event people attend · the
  monument + the `masonry` Discipline that does not exist · potter's
  field and who pays · the coroner economy · what a death does to the
  people left standing* (6) → *custody of the body + terminal decay →
  remains · the rite as an event people attend (an ATTENDANCE primitive, a
  funeral its first consumer) · the monument (no `chronicle` hook exists)
  + the `masonry` Discipline that does not exist · potter's field and who
  pays · the coroner economy · the burial club · what a death does to the
  people left standing* (7) — the body wins: remains (Stage 1), the
  attendance primitive (Stage 2's actual deliverable), the chronicle hook
  (Stage 3's second gap) and the burial club (*The money*) were
  unrepresented
- Size: a build → a build

---

## docs/slates/builds/call-security-pass-slate.md — 259 → 231 · Status UNBUILT → UNBUILT

The pass is unbuilt: no `@Audited`, no `audit_events` (nothing under
`packages/server/src/schema/`), no `SelfSubject` in
`lib/security/SecurityPolicies.ts` (the self-subject `where` is still
copy-pasted — 22 `where: (caller` sites under `platform/idea/api/`), no
`FromIdentity`, no pack-manifest gate arms (`content-packs.md` has none).
The ungated + sealed set is still ungated + sealed — spot-checked
`Chattel.stampChattel` / `transferChattel` (`lib/chattel/Chattel.ts:248-257`,
`@Final @Unshadowable`, no `@CallSecurity`), `Stackable.split/absorb`,
`Advancement.creditDeed`, `Persona.recordDeed`, `Organization.appoint`,
`Bank.deposit`, `Caster.prepareCast`, `Burning.ignite`. `EXEMPT_APIS` is
still 57 entries (`scripts/check-object-verbs.ts`). The naming
projections are in `#BOUNDARY_EXEMPT_METHODS` (`api/security.ts:857-865`).
**One item shipped since the slate was written**: `FromTemplateMethod`,
by the world-scan build. ⚠ `call-security.md:980-992` **points at this
slate** for *the full inventory, the design position, and the future
gate primitives* — so the landscape sections are load-bearing for a doc
and are kept (the value-object-statics precedent from unlinked-1). One
cut + a `Left` re-stamp.

### Cut (SHIPPED · DOCUMENTED)
- `## Future gate primitives to design` → item 1 `FromTemplateMethod` +
  its 2026-09-08 correction, the `frames[n-2]` retraction, the
  attribution-is-a-guard paragraph and the *decided with the user*
  fail-closed / optional-module paragraph (168–205, 38) — code:
  `lib/security/SecurityPolicies.ts:154-215` (the docblock carries the
  frame-order finding, *an un-dispatched caller inherits the nearest
  dispatched frame*, *fails closed on five conditions*, the module term
  as *a disambiguator only*), consumers at `api/stuff.ts:88-105`; doc:
  `call-security.md:880` (the policies table row), `§ ⭐⭐ The calling
  function — FromTemplateMethod, and where the frame is` (`:890-920`),
  `:1010-1012` (fail closed). Replaced by a six-line pointer so items
  2–4 keep their numbers (item 4 says *via (3)*)

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the second blockquote (12–20) — no
  `Status:` prefix; it is the framing paragraph (*two jobs, one build*)
- `## What the OO sweep actually landed (the three postures)` and its
  three subsections — the landscape the doc defers to; posture 1's host
  list, the *possession is capability* analysis and the `FromMixin`
  marker note (see Handoff); posture 3's table is the merge-time
  snapshot the acceptance shape says to re-derive
- `## The audit rail — design sketch` (nothing built; the
  no-new-collections agreement is still the standing memory)
- `## Future gate primitives to design` items 2–4 (`FromIdentity` is
  still only the doctrine note at `call-security.md:972`; no pack gate
  arms; the openness mechanism undecided)
- `## Where everything lives (orientation for the pass)` (verified:
  `SecurityPolicies` export list at `:607-622`; `#BOUNDARY_EXEMPT_METHODS`
  at `security.ts:806`; `projectAcross` at `:1019`, documented at
  `sandbox.md § The read aperture` + `call-security.md:1952`;
  `EXEMPT_APIS` 57)
- `## Acceptance shape for the pass (sketch)` (see Uncertain for the
  stale clause in item 4)

### Doctrine — kept, labelled
- `## The design position (the user's, recorded 2026-09-02)` — the trust
  basis (template + function), the deliberate openness future, the
  posture until then, permit-and-watch as the object-tier instance of
  the resilience posture, *balance-stability is a first-class goal of the
  gate system*. The doc points at the slate for exactly this; a candidate
  for `call-security.md § Why` when the pass lands

### Uncertain — kept
- `## Acceptance shape` item 4 — *"Hoist `SelfSubject(argIndex)`; decide
  the FromMixin-marker question deliberately; add `FromTemplateMethod` if
  the frame change is cheap"* — the third clause is done (no frame change
  was needed); the other two are open. One list item; not split
- `## The design position` bullet 1 — the *"module check becomes
  redundant once template + function are checked"* position shipped as
  `FromTemplateMethod`'s optional `opts.module`; the bullet is now a
  shipped decision's rationale living in a doctrine section. Kept with
  the section
- ⚠ **Stale doc fact for the coordinator** (outside my list):
  `call-security.md:989-990` still lists `FromTemplateMethod` among *the
  future gate primitives* captured in this slate; it shipped and is
  documented 100 lines above in the same file (`:880`, `:890`)
- Overlaps for the cluster pass: `FromTemplateMethod`'s remaining Gate A
  arms ↔ `world-scan-perf-slate` (D3a); the openness mechanism ↔ any
  content-developer / pack-authoring slate; the resilience posture
  (memory: resilience-posture) is the doctrine the audit rail instances

### Handoff (belongs in a doc outside my list — ⚠ KEPT in the slate until inserted, because `call-security.md:989` points at the slate for it)
- → `call-security.md § Participant contracts`, after the three-way
  gate rule paragraph (`:964-970`), as *what the self-subject widen
  protects*, verbatim from the kept § 1:

  ⭐ **What this posture actually protects**: impersonation only. The
  chain is: ungated mixin forward → gated logic that admits *the subject
  itself*. So any code **holding a reference to the object** can invoke
  its public verbs through it — possession is capability. What the gate
  prevents is calling the logic *as an object you are not*. The
  "who initiates" question is answered only where participant contracts
  or controller-side checks remain.

  ⚠ **`FromMixin` matches the `_mixinName` marker, which a pack class can
  simply declare** — unlike `FromTemplate`, which reads the hard-private
  `#templatePath` stamp (unspoofable). The spoof is bounded by the
  self-subject `where`: a marker-claiming class can only act on ITSELF.
  That is accidentally the interface-openness future in embryo. The pass
  should either bless this (record it as the openness mechanism) or
  re-anchor the widens on `FromTemplate`/`FromClass` where the host set
  is enumerable.

  (The policies-table row for `FromMixin` at `:883` says *pure string
  identity* and *class composition only* but not that the marker is
  declarable by any class — the second paragraph is the missing why.)

### Status block
- Status: UNBUILT → UNBUILT
- Left: *the `@Audited` permit-and-watch rail · re-gating the ~35
  ungated-and-sealed mutators · a caller-template + caller-function trust
  primitive · the enumerated pass over every call-security site · the
  acceptance shape* (5) → *the `@Audited` permit-and-watch rail (+ the
  one `audit_events` collection, raised deliberately) · re-gating the ~35
  ungated-and-sealed mutators · the `FromMixin`-marker question (bless as
  the openness mechanism or re-anchor on `FromTemplate`/`FromClass`) ·
  hoisting the copy-pasted self-subject `where` into
  `SecurityPolicies.SelfSubject(argIndex)` · `FromIdentity` ·
  pack-contributed gate participants · interface-based admission · the
  enumerated pass over every call-security site · the acceptance shape*
  (9) — the trust primitive shipped and left; the body wins for the
  marker question, the hoist, `FromIdentity`, the pack gate arms and
  interface admission, all of which were unrepresented
- Size: a build → a build

---

## docs/slates/builds/map-slate.md — 259 → 259 · Status UNBUILT → UNBUILT

Wholly unbuilt. No `minimap` / `three.js` / `react-three` /
`InstancedMesh` / `dagre` / `elk` / `d3-force` anywhere in
`packages/client/src` or its `package.json` (the one `minimap` hit is
`CardBodies.tsx:1119`'s survey card saying it is *not a map and not a
minimap*); no `canPlace` on `lib/zone/SpatialZone.ts`, `Zone.ts` or
`platform/idea/location/SphericalZone.ts`, whose own header (`:28`)
says *"Multiple locations may share a key (nothing prevents overlap)"*
— the owed check is still owed; `zone.md` / `spatial.md` / `location.md`
have no overlap invariant. The premise holds: `CartesianZone` grids
with `cellSize`, `(x,y,z)` coords, explicit-only exits (`deriveExit` is
gone — the only hit is `FolderZone.test.ts:32` asserting it is
undefined). `cms.md` has no zone-editor canvas. Every *See also* target
exists. Zero cuts.

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (verified; unchanged) · the second blockquote (9–18)
  — its status clause (*direction set; 2D first, 3D earned*) heads the
  one-paragraph summary of the whole proposal; kept under the tradition
  precedent · the framing paragraph + the five load-bearing decisions ·
  *See also*
- `## Principle` · `## The model` and all five subsections (modes · two
  data sources · three consumers · the cost curve · spatial validity)
- `## Open questions` 1–7 — all open
- `## Build order` (Waves 1–3 + far future — none started)
- `## What this slate does NOT cover` · `## Once shaped into formal
  requirements` (a restatement of the body; kept verbatim — nothing in it
  shipped)

### Doctrine — kept, labelled
- decision 3 / Principle 3 *layered presentation for space* — the map as
  the spatial analog of *instruments reveal the physics*
  (`design-philosophy.md` Principle 3). Already housed in
  `design-philosophy.md`; the slate applies it

### Uncertain — kept
- The **game minimap** consumer vs a shipped decision in the same
  register: the mining build's survey card (`CardBodies.tsx:1119-1123`)
  ruled *"drawing the plane would hand over the inference the player is
  supposed to make"* and shipped a ledger instead of a picture. Not a
  contradiction — that ruling is about one inference puzzle — but Q1
  (*discovery-filtered*) should be decided knowing the tree already has
  one place where a map was refused on pedagogical grounds
- `## Spatial validity` says *"Cartesian gets this free (unique integer
  coords can't collide)"* — true of a single zone; nothing was found that
  enforces one-location-per-cell at a placement chokepoint either
  (`SpatialZone.ts` has no `canPlace`). The claim is about the model, not
  a gate; kept
- Overlaps for the cluster pass: the zone editor's canvas ↔ `cms-slate`;
  the minimap panel ↔ `client-cockpit-slate` (whose *Navigation* panel —
  compass / sketch map — is also unbuilt per the card-surface ledger);
  fog-of-war ↔ `senses-slate` / `fast-travel-slate`; `Warren` graphs (Q6)
  ↔ `location.md § The Warren elastic graph`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged (5 items) — each is a build-order wave or the owed
  invariant; every body section is represented
- Size: a build → a build

---

## docs/slates/tails/incapacity-slate.md — 246 → 246 · Status UNBUILT → UNBUILT

Unbuilt: no `impound` / `receiver` / `receivership` / `docket` anywhere
under `packages/server/src/mud` (the word hits are catalogue prose); no
`dormant` / `escheat` / last-seen state on a player (`Party.ts`'s
*dormant* is a crew state). The substrate it cites is where it says:
`contract.md § Expiry is lazy (observe-first)` (`:290`), `ContractLogic.ts:463-471`
(the two lazy expiries), `mortality.md`'s `passage` floor. **One `Left`
item was already shipped before the slate was written**: the
optional-expiry default is a dial — `contract.postingExpiryDefaultGameHours`
(`lib/config/AppSettings.ts:320`, commit `40a4dedd0`, 2026-07-23; doc
`contract.md § Dials`, `:345`), default `0 = never`. What remains of that
item is a *value*, not a mechanism. ⚠ **The slate's governing rule is
now contradicted for the departed-player case** by an agreed
requirements doc — see Uncertain. One cut + a `Left` re-stamp.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design conversation, captured. Not
  requirements. ⚠ No live case identified…"* (17–20, 4) — history; the
  canonical block carries the same retraction, and the *User's call*
  blockquote above it (15) is kept as the decision

### Superseded — cut
- none (see Uncertain for why the contradiction was kept rather than
  cut)

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured 2026-08-04…* · the *User's
  call* line · *Related* (every target exists)
- `# ⭐⭐⭐ There is no inheritance problem` + `## One problem in three
  costumes` (see Uncertain — the *linkdead* row is the one the
  requirements now decide)
- `# ⭐⭐ Half of it is already solved` (accurate: `governance.md` /
  `employment.md` — appointing authority appoints)
- `# ⭐⭐⭐⭐ The rule: impound on a CLAIM, never a clock` + `## ⚠ Guardrail`
  + `## ⭐ The receiver PRESERVES` + `## Return and reclaim` (see
  Uncertain)
- `# ⚠⚠ Confinement is NOT abandonment` (untouched by the requirements;
  `prison-slate` unbuilt)
- `# ⭐ The escalation path (still no clock)`
- `# ⚠⚠ RETRACTED — contracts already solve absence, and better` + `## ⭐⭐⭐
  And observe-first is the pattern this slate should COPY` + `## What is
  actually left in contracts: a dial, not a mechanism` (the retraction is
  itself a decision the slate records; the dial section — see the
  header: the dial exists, the value is 0)
- `# Open questions` 1–5 — kept; Q1, Q2, Q5 have candidate answers in the
  requirements doc for the departed-player case (below)

### Doctrine — kept, labelled
- `## ⭐⭐⭐ And observe-first is the pattern this slate should COPY` —
  *expire-on-touch and impound-on-claim are the same instinct, one layer
  apart*; the house pattern (contracts, banking quotas, residency). A
  candidate for `docs/antipatterns.md` beside the sweep rule, or
  `architecture.md`; not an item in `Left`

### Uncertain — kept
- ⚠⚠ **`# The rule: impound on a CLAIM, never a clock` is contradicted for
  a departed player** by `docs/requirements/economic-bootstrap-requirements.md
  § Three states of a player, derived from last-seen` (agreed 2026-09-18):
  *active / dormant / escheated, computed whenever anything asks — never
  by a sweep*; **dormant at 30 real days, escheat at 180** (Schedule
  rows); the account freezes, a position vacates on its own short clock,
  a business closes, escheat pays debts first then disposes by situs;
  money reclaimable forever. That IS a clock — a derive-on-read one, so
  reason 1 (*no sweep*) survives while the headline (*nothing happens
  automatically… until somebody is harmed and says so*) does not. The
  requirements doc names this slate as an **overlapping** one (*"impound
  on a claim — the estate-freeze machinery is a cousin"*, `:58`), not a
  superseded one, so the section is **kept verbatim and flagged** rather
  than cut. What plausibly survives for this slate: the **confinement**
  costume (a known, state-imposed absence is not dormancy), the
  claim-driven remedy **inside** the 30-day window (a harm today cannot
  wait for dormancy), and the *escalation IS a taking* doctrine, which the
  requirements' escheat (debts first, situs, reclaimable) is arguably an
  instance of. Requirements for this slate must reconcile
- `## One problem in three costumes` → the *linkdead* row (*unexplained,
  unknown end*) is exactly the case the requirements decide; the *death*
  row is untouched (a shade's estate is not dormant while the shade acts)
- Q1 *Does an absent holder keep earning? Leans: wages no, rent yes* — the
  requirements decide, for dormancy: the account freezes to inflows only
  (*only what the world owes lands in it*), a business closes (*no wages
  post*). Consistent with the lean; decided there for one costume only
- Q2 *a deputy in advance?* — the requirements' **beneficiary** is an
  advance designation, but for the estate at escheat, not for acting
  during absence. Partial
- Q5 *Does impound show up in the record?* — the requirements' escheat
  leaves *a durable claim record*; the docket entry for an impound is
  still open
- `## What is actually left in contracts` → *"the honest candidate is the
  optional-expiry DEFAULT — one dial"*: the dial shipped before the slate
  (`contract.postingExpiryDefaultGameHours`, 0 = never); the *board
  accumulating permanently open gigs* display filter is also unbuilt. The
  `Left` item was re-worded to *a non-zero value for the shipped dial*
- Overlaps for the cluster pass: dormancy / escheat ↔
  `economic-bootstrap-requirements.md` (agreed; a build will follow) and
  `credit-slate`; abandonment ↔ `sanitation-slate`; confinement ↔
  `prison-slate`; Amdt 25 ↔ `amendment-library-slate`; the standing
  ladder ↔ `balance-slate`; the body-side of absence ↔ `end-of-life-slate`
  (this batch)

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: *impound-on-a-claim · the preserving (never improving) receiver ·
  return and reclaim · the docket entry · the one honest shippable
  remnant, contracts' optional-expiry default dial* (5) →
  *impound-on-a-claim (⚠ contradicted for a DEPARTED player by
  `economic-bootstrap-requirements.md § Three states of a player` — a
  last-seen clock, dormant 30 / escheat 180 real days, derived on read) ·
  the harm-scoped remedy · the preserving (never improving) receiver ·
  return and reclaim · confinement answered by the confining authority ·
  the claim-driven escalation (the second proceeding IS a taking) · the
  docket entry · a non-zero value for the shipped
  `contract.postingExpiryDefaultGameHours` dial (0 = never today)* (8) —
  the body wins: the guardrail, confinement and escalation sections were
  unrepresented; the dial item was false as written (the dial exists)
- Size: a tail → a tail (the confinement + claim path is still small;
  the dormancy half now belongs to the economic-bootstrap build)

---

## docs/slates/builds/hunting-slate.md — 240 → 240 · Status UNBUILT → UNBUILT

Wholly unbuilt. No `hunt` / `track` / `poach` / `close season` / `ferae`
/ wild-population class or verb under `packages/server/src/mud`,
`packages/content/*/src` or any pack's `cmd/` (the word hits are retail /
employment prose; `Species.ts:534` says *a new huntable animal is ONE row*
— the species row carries the fields, and nothing hunts it). The
substrate is where the slate says: `platform/thing/TrapKit.ts` (+
`device/ArmController.ts`), `lib/behavior/wary.ts`, `stealth.md` /
`hazard.md` / `ranged.md` / `harm.md`; the butchering act ships twice —
`trade-ranching/…/cmd/ranching/butcher.yaml` and
`trade-cooking/…/cmd/crafting/butcher.yaml` (⚠ two views on one verb; the
consequence build's collision finding, not this slate's problem). Every
*See also* target exists. Zero cuts. **Fishing overlaps noted below; the
fishing slate was not touched.**

### Cut (SHIPPED · DOCUMENTED)
- none

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (verified; unchanged) · the second blockquote (10–24)
  — three paragraphs: the status clause heads the provenance paragraph
  (farmstead D60's pest pressure), then the *foraging is NOT here* scope
  cut and the *Owner: the Wardens* assignment. Framing; kept under the
  tradition precedent · *See also*
- `## ⭐⭐⭐ Ferae naturae — the property question the rest of the game lacks`
  (the water-rights precedent is shipped — `watershed.md` — and nothing
  applies it to game)
- `## ⭐⭐ Game law — and the ambiguity is the content` (`legal-code-slate`
  unbuilt)
- `## ⭐⭐ Depletion is shared whether you like it or not`
- `## The method ladder — and tracking is the fourth instance of the house
  pattern` (the ladder's three shipped rungs — stalk, traps, bow — are
  named as reuse; *sign* / *the stand* / *the dog's fourth job* are
  unbuilt; no `track` verb)
- `## What you get, and the ethic carries over` (the two `butcher` views
  already carry *the animal is used ENTIRELY*; the game-side inputs —
  hide, sinew, horn, feathers from a wild kill — do not exist)
- `## Taming is the same encounter with a different outcome` (`pets.md`
  shipped hand-feeding regard, not a taming encounter — see the pilot
  ledger)
- `## Seasonality falls out of the calendar` (photoperiod ships per
  `time.md` / `husbandry.md`; no close season)
- `## ⭐ A wild population is a record that materializes on encounter`
- `## What must not happen` · `## Open questions` (all six open) · `## Scope
  guardrails`

### Doctrine — kept, labelled
- `## The frame — the pest *is* the resource` — *you do not have a deer
  problem, you have a deer opportunity*; the argument for the slate
- `## ⭐⭐ Game law` → *it protects a resource by restricting WHO may take
  it, not HOW MUCH* + both readings true at once — civics doctrine, a
  candidate for `compact-political-science.md`'s examples
- the method-ladder paragraph *expertise is discrimination, and precision
  costs an act — fourth independent instance* — already the
  instrumentation doctrine (memory: instrumentation-slate); the slate
  says it should be house style rather than reinvented

### Uncertain — kept
- **Fishing overlap (not touched):** `fishing-slate.md` — in flight in
  another worktree — carries (a) a *method ladder — hand, rod, trap, net,
  spear* marked **[DECIDED]** (`:353`), whose *trap* and *spear* rungs are
  the same acts as this slate's *Traps and snares* and *The bow* rows on a
  different medium; (b) a *catch-distribution field* — the same *seeded
  character × derived state, materializes on encounter* shape as this
  slate's wild-population record; (c) *three water regimes* where this
  slate has *ferae naturae* + game law — Q5 here already asks whether *the
  rights half may want to be shared*. If fishing lands its field and
  ladder first, this slate's `## A wild population…` and `## The method
  ladder` become *the second consumer* of fishing's substrate rather than
  the first of their own. Flag for the cluster pass; nothing here is
  contradicted yet
- `## Taming is the same encounter` — cites *the pets slate's taming
  encounter*; the pets build shipped adoption as hand-feeding regard and
  *difficult, not feral* (`pets.md`; the pilot ledger's Uncertain). The
  *same approach, different outcome* unification is still open on both
  sides; the `pets-slate` text it points at is itself flagged there
- `## The method ladder` → *"the dog's fourth job after herding, guarding
  and deterring"* — herding / guarding / deterring roles: `ranching.md`
  has *three ROLES not three classes* for stock; whether a dog's roles
  shipped was not verified beyond `pets.md` (no `herd` role on a pet
  found). Kept as written
- Overlaps for the cluster pass: foraging ↔ `discovery-slate`; the
  Wardens ↔ `guild-slate`; forest law ↔ `forestry-slate` (*vert and
  venison*); enforcement ↔ `legal-code` / `policing` / `enforcement`
  slates; seeded × derived ↔ `field-substrate-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged (5 items) — every body section is represented (the
  yield section rides *the method ladder*'s butchering act; seasonality
  rides *close seasons*)
- Size: a build → a build

---

## docs/slates/tails/explicit-targeting-slate.md — 240 → 113 · Status BUILT → PARTIAL

The one BUILT slate in the batch. Verified against `d0613c014`
(*build(targeting): onFiltered — the KIND axis of ambiguity becomes
declarable*, 2026-09-14): `onFiltered` on `lib/command/CommandDefinition.ts`,
`api/command.ts`, `platform/idea/api/CommandLogic.ts`; `walkScopes`
(`CommandLogic.ts:437-455`) called from all four bind sites (`:1308`,
`:1377`, `:1480`, `:1541`); `applyFilteredPolicy` (`:467`); the
`candidates-filtered` note kind (`packages/types/src/index.ts:488`).
Doc: `command-spec.md § ⭐⭐ onFiltered: — what to do about a match you
discarded` (`:740-790`) carries the asymmetry table, `take` as default,
`warn` / `error`, no `prompt` arm, refused at load without `requires:`,
and *the scope chain is untouched, and that is deliberate*. **Not
shipped**: no `--strict` / `--loose` (no reserved option in
`CommandLogic.ts`); no content row declares `onFiltered:` yet (zero hits
under `packages/content`), so `warn` is on nowhere. The old status
block used `**Shipped:** / **Deferred:**` keys and no `**Left:**` — fixed
to the canonical key. Nine cuts, each replaced by a one-line pointer so
the spine's headings survive; one handoff.

### Cut (SHIPPED · DOCUMENTED)
- the status block's `BUILT` / `Shipped:` / `Deferred:` form (3–11) —
  re-stamped (below)
- `## ⭐⭐ The real defect is an ASYMMETRY, not the loop` (30–44, 15) —
  doc: `command-spec.md:753-767` (the count / kind table + *could not say
  "two matched and I discarded one"*). Pointer left
- `## What `requires:` does today, exactly` (46–75, 30) — the two
  artefacts (`_requirementTerms` + the synthesised validator) and the
  fall-through loop are the shipped `walkScopes` unchanged; doc:
  `command-spec.md § requires:` (`:700-735`, the synthesised validator +
  `MixinRefusals`), `§ onFiltered:` (`:783-790`, the chain's two jobs).
  The `talk dave` example and the *resolveOne disabled* cost are only in
  code (`CommandLogic.ts:412-415`, `:1375`) → Handoff. Pointer left
- `## What must NOT be lost` (101–112, 12) — held: `requires:` is still
  the slot's declaration of kind the affordance resolver reads; doc:
  `command-spec.md:736-738`, `command-routing.md § The candidate set is no
  longer purely syntactic — requires:` (`:1606`). Pointer left
- `## Open questions` 1–5 (146–158, 13) + `## The open questions,
  answered` (203–223, 21) — every answer is in the doc: Q1 `take`
  (`:766`) · Q2 the chain survives (`:783`) · Q3 per-slot (the yaml at
  `:745-750`; *mirroring `onExcess`* in the commit body) · Q4 the
  `candidates-filtered` note (`:770`; `types/index.ts:488`) · Q5 refused
  at load against `requires: any` (`:779`). One pointer left under the
  questions heading; the answers heading removed
- `# ✅ What actually shipped (2026-09-15)` (176–201, 26) — doc:
  `command-spec.md § onFiltered:` whole. Pointer left

### Graduated (SHIPPED · UNDOCUMENTED) — cut, text in Handoff
- `## ⭐ The thing worth keeping from the build` (225–232, 8) — code: the
  `walkScopes` docblock (`CommandLogic.ts:398-436`) carries it; no
  subsystem doc does (`command-routing.md` has no *walkScopes* / *four
  times* / *one function*). Pointer left; verbatim text → Handoff

### Superseded — cut
- `## The proposal` (77–99, 23) — by the code: *one pool, one filter* was
  NOT built; the chain stays as ordering and the discard is counted →
  `command-spec.md:783-790`. Pointer left
- `## The surface this touches` (124–144, 21) — by the shipped shape: no
  migration of the 60 chains / 183 slots; the `$focus`-is-a-preference
  warning became the doc's own reason (`command-spec.md:783-790`).
  Pointer left

### Kept (UNBUILT)
- the status block (re-stamped) · *Raised by* · `## The complaint` (the
  framing — the user's own statement of the problem)
- `## The per-invocation override` (the `--strict` / `--loose` design;
  deferred, not built)
- `## Cross-references` (⚠ four of its five links use `../subsystems/…`
  from `docs/slates/tails/`, which resolves to `docs/slates/subsystems/`
  — broken since the slate was written; not fixed, cuts only)
- `## Still deferred` (the two `Left` items)

### Doctrine — kept, labelled
- none (the asymmetry thesis graduated with the build and lives in
  `command-spec.md`)

### Uncertain — kept
- ⚠ **Stale doc fact for the coordinator** (outside my list):
  `command-routing.md § YAML scope[] is the explicit fallback chain`
  (`:985`) says *"tried in order; first non-empty result wins"*. Since
  `requires:` rode the chain that has been *first scope holding an
  ADMISSIBLE result wins* (the `talk dave` fall-through), and since
  `d0613c014` the discard is counted. The Handoff below is the paragraph
  that fixes it
- `CommandLogic.ts:1472` still carries the pre-collapse comment *"Same
  `requires:`-aware scan as the positional loop."* above a `walkScopes`
  call — a residual, not a fourth copy
- Overlaps: none — this was a change, and it landed

### Handoff (belongs in a doc outside my list)
- → `command-routing.md § YAML scope[] is the explicit fallback chain`,
  after *"…tried in order; first non-empty result wins"* (`:985`) — as
  the `requires:` half of the chain's semantics, verbatim from the two
  cut sections:

  With a `requires:` on the slot the rule is *first scope holding an
  **admissible** match wins*, not first non-empty. The shipped
  justification is `talk dave` where `$focus` is the room *"Dave's Bar"*:
  without the fall-through, the room binds, the validator refuses, and
  the barkeep is never reached.

  ⚠ Note what the fall-through costs: with a `requires:` the cheap
  `resolveOne` path is **disabled** — *"the top match may be the
  inadmissible one"* — so every constrained slot resolves its scope in
  full.

  The `requires:`-aware walk was written **four times** — the positional
  loop and the option loop, each with an `objects` branch and a singular
  branch, the last carrying the comment *"Same `requires:`-aware scan as
  the positional loop."* Four copies of a control-flow rule is how one of
  them acquires a different opinion. It is one function now
  (`walkScopes`, `CommandLogic.ts`), and that is most of why adding a
  policy to it was safe. What the walk discards is counted, and
  `onFiltered:` decides whether that is silent, spoken or refused →
  [command-spec.md § `onFiltered:`](command-spec.md).

### Status block
- Status: BUILT → PARTIAL (`BUILT` is not in the vocabulary; two deferred
  items remain, so not ABSORBED — *a slate whose Left is one trivial item
  is still PARTIAL*)
- Left: *(no `Left:` key — `Shipped:` + `Deferred:` "the reserved
  per-invocation override (`--strict`) · any migration of the 183 slots —
  none was needed")* → *the reserved per-invocation `--strict` /
  `--loose` option · turning `warn` on where a verb wants a voice (`open`
  · `close` · `unlock` — a content question, wants a live drive)* (2) —
  the false *migration* item dropped; `## Still deferred`'s second bullet
  was unrepresented
- Size: *"turned out to be a change, not a build"* → a tail

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `builds/flowers-slate.md` | 283 → 283 | UNBUILT → UNBUILT | 7 → 7 | a build → a build |
| `tails/patina-design-pack.md` | 283 → 283 | UNBUILT → UNBUILT | 5 → 5 | a wave → a wave |
| `builds/end-of-life-slate.md` | 276 → 265 | UNBUILT → UNBUILT | 6 → 7 | a build → a build |
| `builds/call-security-pass-slate.md` | 259 → 231 | UNBUILT → UNBUILT | 5 → 9 | a build → a build |
| `builds/map-slate.md` | 259 → 259 | UNBUILT → UNBUILT | 5 → 5 | a build → a build |
| `tails/incapacity-slate.md` | 246 → 246 | UNBUILT → UNBUILT | 5 → 8 | a tail → a tail |
| `builds/hunting-slate.md` | 240 → 240 | UNBUILT → UNBUILT | 5 → 5 | a build → a build |
| `tails/explicit-targeting-slate.md` | 240 → 113 | **BUILT → PARTIAL** | (no `Left:` key) → 2 | "a change" → a tail |

2,086 → 1,920 lines. Cut operations: 0 + 0 + 3 + 1 + 0 + 1 + 0 + 9 =
**14** (one superseded bullet in end-of-life; two superseded sections in
explicit-targeting; the rest SHIPPED · DOCUMENTED or history). Duplicate
status blocks: cut in end-of-life and incapacity (pure status
paragraphs); **kept** in flowers, patina, map and hunting, where the
status clause is the first sentence of a framing paragraph (the
tradition precedent — splitting a paragraph is below the granularity the
procedure allows); call-security's second blockquote has no `Status:`
key and is the framing. Handoffs: **2** (call-security → `call-security.md
§ Participant contracts`, *kept in the slate until inserted* because the
doc points at the slate; explicit-targeting → `command-routing.md § YAML
scope[] is the explicit fallback chain`). Four slates unchanged on disk
(flowers · patina · map · hunting) — verified unbuilt, `Left` already
honest.

Stale doc facts flagged for the coordinator (outside my list):
`call-security.md:989-990` still lists `FromTemplateMethod` among the
*future* gate primitives (it shipped; documented at `:880` / `:890` of
the same file); `command-routing.md:985` *"first non-empty result wins"*
omits the `requires:`-aware fall-through (the handoff paragraph fixes
it); `explicit-targeting-slate.md § Cross-references` has four links
with a wrong relative prefix (`../subsystems/` from `tails/`), left as
found.

Hardest calls:
1. **Incapacity's governing rule is contradicted by an agreed
   requirements doc and was KEPT, not cut.** The 2026-09-18
   economic-bootstrap requirements decide a departed player's estate by
   a last-seen clock (dormant 30 / escheat 180 real days, derive-on-read)
   — the opposite of *impound on a CLAIM, never a clock*. But that doc
   names incapacity as an *overlapping* slate whose machinery is *a
   cousin*, not a superseded one, and the confinement costume, the
   inside-the-window claim and *escalation IS a taking* plausibly
   survive. Kept verbatim; the contradiction is in the `Left` line and
   the Uncertain entry so requirements reconcile it rather than inherit
   either.
2. **End-of-life vs the same requirements doc — narrower than it
   looks.** A player's death is not estate-ending (the shade reembodies),
   so the requirements' estate life-cycle decides one bullet here
   (inheritance / probate → beneficiaries + situs; cut with a pointer)
   and only *touches* two questions (standing to bury; the unclaimed
   body's situs). Flagged, not cut.
3. **Call-security's landscape sections are load-bearing for a doc.**
   `call-security.md` explicitly points at the slate for the inventory,
   the design position and the primitives; cutting the shipped-but-
   undocumented *possession is capability* / `FromMixin`-marker analysis
   would have dangled that pointer. Kept in the slate AND handed off
   verbatim, with the ledger saying so.
4. **Explicit-targeting was compacted to its spine plus pointers rather
   than absorbed.** Everything the build decided is in
   `command-spec.md § onFiltered:`; two deferred items remain and the
   procedure says a small `Left` is still PARTIAL. The one-walk collapse
   is documented only in a code docblock, so it went to Handoff
   (`command-routing.md`).
5. **Flowers' *lawn as a land use* and *freshness gauge* rows** — both
   softer than the slate states (`LAND_USES` is the closed six with no
   amenity entry and `soil.md` D7 says land use is derived, never
   declared; `FreshnessMixin` sits on `Provision` only). Neither
   contradicts the design outright, so both are Uncertain entries rather
   than edits.
