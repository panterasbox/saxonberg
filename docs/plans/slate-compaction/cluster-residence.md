# Cluster-merge pass — residence

Branch `design/slate-cluster-merge`. Procedure:
`.claude/skills/compact-slate/SKILL.md` § The cluster-merge pass. Files in
scope (line counts at the start of this pass):

- `docs/slates/tails/residence-ladder-design-pack.md` (329)
- `docs/slates/tails/tenancy-design-pack.md` (285)
- `docs/slates/tails/dorm-warren-slate.md` (247)
- `docs/slates/builds/estate-nesting-slate.md` (101)
- `docs/slates/tails/household-design-pack.md` (425)
- `docs/slates/builds/bathroom-slate.md` (144)

Out of cluster, pointers only: `room-condition-design-pack.md` (owns the
`(actor, target, extent)` attribution constraint), `stewardship-slate.md`
(owns the blockers + § Premises), `property-slate.md` (owns the compute
economy), `water-design-pack.md` (its kept Part 4). No worktree is running
a residence build (`git worktree list`: economic-bootstrap · fishing ·
treatment · one detached), so the merge is not handed to a sweep.

## Canonicals — per SUBJECT, as the coordinator allowed

The skill's single-canonical rule does not fit this cluster, because the
six files are six subjects that share a substrate rather than six drafts
of one design. Two of them name a parent outright — the tenancy pack's
See-also calls the residence-ladder pack *"the rented rungs, and the
'landlord reference' it already names"*, the household pack calls it
*"the direct parent"* — so:

- **`residence-ladder-design-pack.md` is canonical for the LADDER** (the
  rungs, the condition aggregate, the ascent gate, the Stewardship
  Discipline, the neglect consequences).
- **`tenancy-design-pack.md` is canonical for TENURE** (rent, the deposit,
  eviction, sublet, common parts) — the ladder pack's own See-also defers
  the rented rungs' mechanics to it, and its `Left` is the only one that
  names rent and the lease's money leg as its own.
- **`dorm-warren-slate.md` is canonical for ROOM CUSTOMIZATION** (the
  bounded editor, custom prose, themes) — the only file whose subject is
  what a player may write onto a space they hold.
- `household-design-pack.md`, `estate-nesting-slate.md` and
  `bathroom-slate.md` each keep their own subject (the multi-occupant
  commons · the persistence shape of an estate entry · the bathroom's
  function). None is a stub.

Consequence: the ladder pack is canonical for the ladder **and a
secondary for tenure and customization** — its *"Deferred seams, salvaged
from the retired apartment plan"* list is a grab-bag salvaged from a
retired plan, and three of its bullets are another subject's open design.
Those three MOVE out, verbatim. Every heading of every file appears in
the tables below, the canonical's included, so a reviewer can diff each
table against `git show` of the file.

## What is NOT duplicated (read whole, left alone)

- **`estate-nesting-slate.md`** — cites none of the other five and none
  cites it; its four questions (what an estate entry carries · the 16 MB
  ceiling · container-vs-containable · the migration) appear nowhere else
  in the cluster. The ladder pack's *owner-index cache* seam is the
  CHATTEL owner index, not the estate slice's nested state — a different
  object. **Untouched.**
- **`bathroom-slate.md`** — read against `water-design-pack.md` Part 4 as
  instructed. Not a duplicate: the water pack's point 1 designs the WATER
  PRECONDITION on `bathe` (a tap or a filled vessel); the bathroom slate's
  function 2 designs the CLEANLINESS STATE the act produces. The water
  pack's point 2 (*running water as a residence-ladder rung feature*) is
  LADDER design the ladder pack lacks — but the water pack is out of
  cluster, so that is a coordinator note (below), not a move. The bathroom
  slate cites no cluster file and none cites it. **Untouched.**
- Between the household and tenancy packs, every apparent overlap is a
  citation, not a copy: the tenancy pack's Part 2 *"does not violate
  'aggregate, never report'"*, Part 4 *"the same substrate as the household
  pack's roommate agreement"* and Part 5 item 1 *"the household pack's
  safety property holds unchanged"* each name the household pack's rule in
  one sentence and then argue the TENANCY case. Kept on both sides.

## tenancy-design-pack.md — 285 → 303 · canonical for TENURE; secondary to the ladder pack for the ladder

Read whole. Gains two verbatim bullets from the ladder pack (MOVE, below);
loses one duplicated table. Not retired — its whole body is its own
subject.

### Conservation table — every heading of `tenancy-design-pack.md`

| heading | outcome | destination / note |
|---|---|---|
| title · status block · See-also | KEPT | status block re-stamped (below) |
| `## Part 0 — The gap, and why it is a coherence problem` → the 3-row rungs table | **DUPLICATE** | → `residence-ladder-design-pack.md § Part 2 — The ladder, and the two-part gate` (the 5-row table; same rows, same gates). One pointer line left, naming the row the surviving prose ("Read that third row carefully") refers to. The prose around it is KEPT untouched — it is the tenancy problem statement (the landlord reference concept vs mechanism; moral hazard) |
| `## Part 0` → the rest | KEPT | tenancy's own |
| `## Part 1 — The split already exists in the persistence model` | KEPT | already a shipped pointer + the *Habitability* paragraph (tenancy's own) |
| `## Part 2 — ⭐⭐⭐ Attribution is the mechanism, and it is already required` | KEPT | the tenancy APPLICATION of room-condition's constraint (the term-bounded query, `grantedAt` as the bound). Its two-line blockquote of the constraint is a citation of `room-condition-design-pack.md § Every deposit and every clear carries an ACTOR`, not a copy |
| `### ⚠ And it does not violate "aggregate, never report"` | KEPT | cites `household-design-pack.md § Part 3` in one sentence; the check-in-inventory argument is tenancy's own |
| `## Part 3 — ⭐⭐ Why a tenant tends: three incentives, three different kinds` | KEPT | its row 1 (`restQuality` · immunity) says what `residence-ladder § Part 5` item 1 says — a table row, below paragraph granularity; the three-kinds framing is tenancy's |
| `## Part 4 — The deposit: a contract with an escrow leg` | KEPT | tenancy's own instrument; the *"same substrate as the household pack's roommate agreement"* line is a citation |
| `## Part 5 — ⚠⚠ Eviction, and the tension with the property floor` | KEPT | tenancy's own; item 1 cites the household pack's safety property (`household § Part 5` blockquote) in one sentence, then adds the shelter floor and the knowable term |
| `## Part 6 — The commons, one scale up` | KEPT | common parts = the landlord's obligation; nowhere else |
| `## Part 7 — Designed to the format` | KEPT | |
| `## Part 8 — ⚠ Dangers` | KEPT | |
| `## Part 9 — Pedagogy` | KEPT | doctrine, labelled by the compaction pass |
| *(new)* `## Absorbed from residence-ladder-design-pack — Deferred seams: rent economics · co-lease / roommate` | **MOVED IN** | two bullets verbatim from the ladder pack (see that file's table) + a labelled provenance paragraph |
| `## Open questions` Q1 (resolved pointer) · Q2 · Q3 · Q4 · Q5 | KEPT | Q5 (sublet) is what the absorbed *co-lease* bullet asks in its earlier form — both kept, side by side |

### Status block
- Left: *room-condition attribution `(actor, target, extent)` · …* → *the term-bounded attribution query over room-condition's attributed events (the constraint itself is that pack's) · …* — the first item claimed a thing `room-condition-design-pack.md`'s `Left` owns (*the attributed `(actor, target, extent)` deposit/clear events*); what THIS pack builds over it is the query (Part 2, Part 7 row 2). Plus: *rent as a recurring money leg* → *… + the absorbed rent economics (schedules · sublease markets · the proprietor-as-Business P&L)*; new item *co-lease / sublet (Q5 + the absorbed seam)*
- Size: a wave → a wave (two bullets do not change the shape)
- Links: none re-pointed; nothing retired

## dorm-warren-slate.md — 247 → 267 · canonical for ROOM CUSTOMIZATION

Read whole. Gains one verbatim bullet from the ladder pack (MOVE). Nothing
cut — every section is its own subject (the dorm as the authoring on-ramp,
the bounded editor, the roommate NPC half, the sealed room). Its
"tier filter = the housing ladder" table is a customization-power ladder,
not the tenure ladder: a sibling axis to the ladder pack's Part 2, not a
copy of it (the compaction pass already flagged its tier names as stale).

### Conservation table — every heading of `dorm-warren-slate.md`

| heading | outcome | destination / note |
|---|---|---|
| title · status block | KEPT | status block re-stamped (below) |
| `## The reframe: two rooms, one system, two states` | KEPT | the sealed room — nowhere else in the cluster |
| `## The big idea: the dorm room is the first rung of the authoring ladder` | KEPT | its *compute-as-the-real-scarcity* clause names the rung placement; the compute economy itself is `property-slate` Phase 1 (out of cluster); the ladder pack's *compute-as-energy loop* seam is a pointer to the same place — neither is a copy of the other |
| `## The faculty (the system)` | KEPT | |
| `## How customization works: field-editing over the object's mixins` | KEPT | |
| `### The theme roster` | KEPT | |
| `### The field-value sources (what populates a half)` | KEPT | the *You — explicit field overrides* source is the room half of custom prose; the absorbed bullet below is the owned-goods half |
| `### The tier filter = the housing ladder` | KEPT | sibling axis to `residence-ladder § Part 2`, not a duplicate (see above) |
| `### The code` | KEPT | |
| *(new)* `## Absorbed from residence-ladder-design-pack — Deferred seams: prose-on-owned-items personalization` | **MOVED IN** | one bullet verbatim + a labelled provenance paragraph noting that `residence.md § Deferred` already records both halves of the custom-prose deferral and that the bullet's "needs chattel first" precondition is now met |
| `## The thematic payoff (keep it in view)` | KEPT | doctrine, labelled by the compaction pass |
| `## Open decisions / dials` 1–8 | KEPT | |
| `## Dependencies & deferrals` | KEPT | |
| `## Cross-references` | KEPT | |

### Status block
- Left: *hand-authored custom prose* → *hand-authored custom prose (+ the absorbed prose-on-owned-items seam: a `PROSE_FIELDS` allowlist over the spine, on a good)*; the other seven items unchanged
- Size: a wave → a wave
- Links: none re-pointed; nothing retired

## residence-ladder-design-pack.md — 329 → 324 · canonical for the LADDER; secondary for tenure + customization

Read whole. Nothing came IN: no secondary carries ladder design the
canonical lacks (the household pack's collective gate is the
multi-occupant variant and stays the household's; the dorm slate's tier
table is the customization axis; the water pack's *running water as a rung
feature* is out of cluster — coordinator note below). Three bullets went
OUT of its salvaged-seams list, verbatim, to the subject that owns them;
one-line pointers left in place.

### Conservation table — every heading of `residence-ladder-design-pack.md`

| heading | outcome | destination / note |
|---|---|---|
| title · status block · See-also | KEPT | status block re-stamped (below) |
| `## Part 0 — What it is: the gate is condition, not coin` | KEPT | canonical |
| `## Part 1 — Property condition: a derived read, Law-2-clean` | KEPT | canonical; the household pack's Part 2 restates its *freeze in absence* premise in two sentences inside an otherwise-household paragraph (below paragraph granularity; noted there) |
| `## Part 2 — The ladder, and the two-part gate` | KEPT | canonical — the tenancy pack's Part 0 table now points here |
| `## Part 3 — Designed to the format` | KEPT | canonical; row 4 (*premises obligations — rides designed slates*) already defers to `stewardship-slate § Premises` (out of cluster) |
| `## Part 4 — The Stewardship Discipline` | KEPT | canonical (overlap with `stewardship-slate § Stewardship — two things` is out of cluster; the compaction pass flagged it) |
| `## Part 5 — The consequence ladder of a neglected home` | KEPT | canonical; the tenancy pack's Part 3 row 1 is a one-row echo (kept there — a table row) |
| `## Part 6 — Pedagogy` | KEPT | doctrine, labelled by the compaction pass |
| `## Part 7 — Interop map` | KEPT | |
| `## Part 8 — Forks settled, and the blockers` | KEPT | the blockers are `stewardship-slate § Blockers`' (out of cluster); the household pack's blocker bullet 3 already points here |
| `## Open questions` Q1–Q5 | KEPT | Q2 (limiting-factor min) is cited by `household § Open questions` Q4, which asks a different question (weighting across OCCUPANTS) — a citation, not a copy |
| `## ⭐ Deferred seams, salvaged from the retired apartment plan` (the provenance paragraph) | KEPT | the *"Verbatim below"* claim now has three pointer lines in the list; the paragraph is left as written |
| `## Deferred seams (clean attach points, not stubs)` → *The compute-as-energy / stewardship loop* | KEPT | a pointer to `property-slate` Phase 1 (out of cluster) plus the *stewardship stays derived-on-read* rule; not duplicated in the cluster |
| `## Deferred seams` → **Rent economics** (3 lines) | **MOVED** | → `tenancy-design-pack.md § Absorbed from residence-ladder-design-pack — Deferred seams: rent economics · co-lease / roommate` (verbatim). The tenancy pack's `Left` named *rent as a recurring money leg* and its body designed none of the economics; this bullet is the only statement of them in the cluster. `holding.md § Deferred seams` already says *rent as a recurring charge — the contract substrate is where that belongs* |
| `## Deferred seams` → **Prose-on-owned-items personalization** (4 lines) | **MOVED** | → `dorm-warren-slate.md § Absorbed from residence-ladder-design-pack — Deferred seams: prose-on-owned-items personalization` (verbatim). The dorm slate's `Left` names *hand-authored custom prose*; `residence.md § Deferred` names both halves of the same deferral and calls this one *"the owned-goods personalization (prose at craft/buy) is the chattel path"* |
| `## Deferred seams` → *Shipped: the holodeck portal fixture · owned homes by title · pets as chattel* | KEPT | a pointer line the compaction pass left |
| `## Deferred seams` → **Co-lease / roommate** (2 lines) | **MOVED** | → the same tenancy section, beside its open question 5 (*does a subletting tenant become a landlord?* — the same question: *a use-grant of a use-grant*). The differing details (the `property-slate §K` citation; *v1 is single-leaseholder*) travel with the verbatim bullet rather than being dropped, which is why this is MOVE and not DUPLICATE. The roommate SHAPE (one owner + N grants) is `household § Part 1` and is already shipped substrate |
| `## Deferred seams` → *The owner-index as a persisted rebuildable cache* | KEPT | chattel's; nothing else in the cluster carries it (the estate-nesting slate is about the estate SLICE's nested state, a different object) |
| `## Deferred seams` → *Spatial-zone carve-outs on `subdivide`* | KEPT | parcel's; nowhere else in the cluster |
| `## Critical files for implementation` | KEPT | already a superseded pointer to `holding.md` |

### Status block
- Left: *… the salvaged apartment seams (rent economics · prose-on-owned-items · co-lease · the owner-index cache · spatial carve-outs) …* → *… the salvaged apartment seams still here (the compute-as-energy loop → property-slate · the owner-index cache · spatial carve-outs; rent economics + co-lease moved to tenancy, prose-on-owned-items to dorm-warren) …* — the compute-as-energy bullet was in the body and unrepresented; it is now named with its owner
- Size: a wave → a wave
- Links: none re-pointed; nothing retired

## household-design-pack.md — 425 → 416 · keeps its own subject (the multi-occupant commons)

Read whole. One DUPLICATE cut; nothing moved in or out. Not retired — the
multi-occupant case is nobody else's subject.

### Conservation table — every heading of `household-design-pack.md`

| heading | outcome | destination / note |
|---|---|---|
| title · status block · See-also | KEPT | status block re-stamped (below) |
| `## Part 0 — What it is: with one holder a mirror, with two a commons` | KEPT | doctrine (labelled by the compaction pass); cites `residence-ladder § Part 1` for the derived read — a citation |
| `## Part 1 — ⭐⭐⭐ The structural finding: two sets, not one, and both already exist` | KEPT | the household's own |
| `### The two shapes of household are the two shapes of tenure` | KEPT | the roommate SHAPE (one owner + N grants) — the ladder pack's moved *co-lease / roommate* bullet points here for it |
| `## Part 2 — ⭐⭐⭐ The commons, in three lines` | KEPT | the collective gate is the multi-occupant VARIANT of the ladder's gate, not a copy. ⚠ Its last three sentences (*"property condition's two biggest inputs are act-deposited and freeze in absence … Presence is still never the meter"*) restate `residence-ladder § Part 1`'s premise — the one the compaction pass flagged UNCERTAIN against the shipped calendar shell clock in BOTH files. Inside one paragraph with the exit clause → below paragraph granularity, kept; requirements reconcile it once, in the ladder pack |
| `## Part 3 — ⭐⭐ The who-did-what read: aggregate, never report` | KEPT | doctrine; cited by the tenancy pack's Part 2 subsection and by `room-condition § blame ledger` — citations |
| `## Part 4 — The money half is the contract substrate` | KEPT | the roommate agreement is the household's instrument; the tenancy pack's deposit is a different instrument on the same substrate (each cites the other). ⚠ Its first sentence lists *"utilities, parcel tax, the shared bill"* — a **parcel tax** is banned by `residence-ladder § Part 1`'s 2026-08-11 correction and the recurring-charge call (and `stewardship-slate § Premises` still lists *"Tax. The parcel tax (property Phase 1)"*). A three-way inconsistency across the cluster and its neighbour; not edited — coordinator note |
| `## Part 5 — Dissolution is already computed` | KEPT | the *SAFETY property* blockquote (evicted, never stripped) is doctrine the compaction pass labelled; the tenancy pack's Part 5 item 1 cites it in one sentence |
| `## Part 6 — Marriage: the same primitive, plus what you opted into` | KEPT | nowhere else |
| `## Part 7 — Designed to the format` | KEPT | |
| `## Part 8 — ⚠ Three dangers, stated so they are not discovered` | KEPT | |
| `## Part 9 — ⭐⭐⭐ The one hard constraint on the room-condition build` (22 lines) | **DUPLICATE** | → `room-condition-design-pack.md § ⭐⭐⭐ Every deposit and every clear carries an ACTOR` + `§ ⚠ And it must NOT become a blame ledger — the accountability shape, reused`. The section's own last paragraph says it *"✅ Landed 2026-08-06 in the room-condition pack Part 1"*; checked line by line — the constraint (both directions), *everything rests on it* (transcript · aggregate read · contract clause), *nearly free now / expensive to retrofit*, the only-the-clears trap (*"a record that knows who cleaned but not who made the mess"*), and the accountability guard are all there, and that pack's `Left` carries the item. Heading kept (Parts 0, 7 and the See-also refer to *Part 9*); body cut to a pointer that names every point it carried. The one phrase not in the destination — *"the half that flatters whoever tidies last"* — is rhetoric on the same point, recoverable from git |
| `## Part 10 — Pedagogy` | KEPT | doctrine, labelled |
| `## Interop map` | KEPT | |
| `## Forks settled, and the blockers` | KEPT | blocker 3 already points at the ladder pack |
| `## Open questions` Q1–Q5 | KEPT | Q4 cites `residence-ladder § Open questions` Q2 (the limiting-factor min) while asking a different question (weighting across OCCUPANTS); Q5 is the household variant of the gate's read — both the household's |

### Status block
- Left: dropped *the act-deposited condition producer with `(actor, target, extent)` attribution (room-condition-design-pack — …)* as an item — it was room-condition's `Left` item restated (the compaction pass added it and flagged it as *"the same open thing in three slates"*); it is now a ⚠ hard-dependency sentence at the end of the block, pointing at its owner. The other seven items unchanged
- Size: a wave → a wave
- Links: none re-pointed; nothing retired

## estate-nesting-slate.md — 101 → 101 · untouched

### Conservation table — every heading of `estate-nesting-slate.md`

| heading | outcome | note |
|---|---|---|
| title · status block · provenance quote · *Sits on* | KEPT | |
| `## The thing` | KEPT | the estate SLICE's nested captures — no other cluster file discusses it |
| `## ⭐ What the pets build already proved` | KEPT | a shipped pointer + the slate's own question |
| `## The questions` 1–4 | KEPT | |
| `## What is NOT in scope` | KEPT | |

Status block unchanged (UNBUILT · 4 items · a build). No file in the
cluster links to it and it links to none; it sits on `persistence.md` /
`chattel.md` / `furnishing.md`, not on the ladder. A thematic neighbour by
directory only.

## bathroom-slate.md — 144 → 144 · untouched

### Conservation table — every heading of `bathroom-slate.md`

| heading | outcome | note |
|---|---|---|
| title · status block · the toilet-paradox framing | KEPT | |
| `## Doctrine` | KEPT | |
| `## The four functions` | KEPT | function 2 (washing as a STATE) vs `water-design-pack § Part 4` point 1 (water as a PRECONDITION on `bathe`): the act's input vs the act's output — siblings, not a copy. Function 1's utility-metering half is already flagged UNCERTAIN against `watershed.md` by the compaction pass |
| `## The LOD ladder [DECIDED]` | KEPT | per-venue; `furnishing.md`'s is per-fixture |
| `## The water-tech gradient [DECIDED]` | KEPT | a venue's city-vs-frontier gradient; the water pack's *running water as a rung feature* is the LADDER's version of the same historical fact — related, not the same item, and the water pack is out of cluster |
| `## The archetype set — deferred to its own design session` | KEPT | |
| `## The bathroom debate — a designed obstacle course for the legislature` | KEPT | |
| `## Open questions (for the archetype session / requirements)` 1–5 | KEPT | |

Status block unchanged (PARTIAL · 9 items · a build). It cites no cluster
file and none cites it.

## Verification

- `git diff --stat`: four slates changed (ladder −5 · tenancy +18 ·
  dorm-warren +20 · household −9), plus this ledger. Net +24 lines across
  the cluster: three bullets moved with labelled provenance paragraphs
  (+), one table and one section cut to pointers (−). Nothing outside the
  cluster touched; no file retired; no link re-pointed (nothing was
  deleted, so nothing dangles).
- Every heading of every file is in a table above.
- Each re-stamped `Left` names only sections still in its body; each
  moved-in section is named in its new home's `Left`.
- Every `.md#anchor` written this pass follows the repo's existing slug
  convention (em dash → `--`, emoji-led heading → leading `-`).

## Notes for the coordinator

1. **Per-subject canonicals, not one.** The skill's rule 2 assumes a
   cluster is one design in several files; this one is six subjects on one
   substrate. The coordinator's brief allowed *"each file may keep its own
   subject"*, so three files are canonical for three subjects and the
   ladder pack is both a canonical and a secondary. If a single canonical
   is required after all, the ladder pack is it (both packs name it
   parent) — and the three moves would reverse direction, dragging tenure
   design into a ladder file whose See-also explicitly defers tenure out.
2. **The attribution constraint lives in THREE `Left`s no more.** After
   this pass it is `room-condition-design-pack.md`'s alone; the household
   pack points at it as a dependency and the tenancy pack names only the
   query it builds over it. Whoever runs the room-condition cluster should
   know the household pack's Part 9 is now a pointer into it.
3. **Out-of-cluster item that belongs to the ladder:**
   `water-design-pack.md § Part 4` point 2 — *"running water becomes a
   residence-ladder rung feature … a dorm has a corner tap; a frontier lot
   has a standpipe in the yard; the gap between them is the errand"* — is
   open LADDER design the ladder pack lacks (its `Left` even says *"waits
   on the residence-ladder pack"*). Candidate MOVE into
   `residence-ladder-design-pack.md` from whichever pass owns the water
   pack; not done here (pointers only).
4. **A three-way inconsistency on the parcel tax, left standing:**
   `residence-ladder § Part 1` (2026-08-11) and the recurring-charge call
   BAN a holding tax; `household § Part 4` lists *"parcel tax"* among
   premises obligations in passing; `stewardship-slate § Premises` (out of
   cluster) still lists *"Tax. The parcel tax (property Phase 1)"* as a
   line item. The ladder pack's open question 5 (*where a locality's
   revenue comes from now that holding tax is banned*) is the live end of
   it. A requirements pass on premises/utilities should settle which
   statement is current; a cluster pass must not.
5. **`residence-ladder § Part 1` and `household § Part 2` still both carry
   the *freeze in absence* premise** that the shipped calendar shell clock
   contradicts (flagged UNCERTAIN in both by the compaction pass). Left in
   both: the household's copy is two sentences inside a paragraph that is
   otherwise its own. Reconcile once, in the ladder pack.
6. **Overlaps flagged by earlier ledgers that are NOT in this cluster and
   were not acted on:** dorm-warren's roommate NPC half ↔
   `eternal-university-slate` (Rooms, roommates) + the narrative slate
   §17.H; the dorm's compute-quota rung + the ladder's compute-as-energy
   seam ↔ `property-slate` Phase 1; the Stewardship Discipline ↔
   `stewardship-slate § Stewardship — two things`; the blockers ↔
   `stewardship-slate § Blockers`.
