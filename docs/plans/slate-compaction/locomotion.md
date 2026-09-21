# Slate-compaction pass — locomotion batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `locomotion.md`
only. Line numbers below are the ORIGINAL file's. Originals saved under
the scratch dir `locomotion/orig/` for diffing. Code was verified in
`packages/server/src/mud/lib/locomotion/**`, `lib/spatial/Mobile.ts`,
`lib/boundary/Exit.ts`, `lib/behavior/*.ts`, `lib/hazard/**`,
`api/locomotion.ts` + `platform/idea/api/LocomotionLogic.ts`,
`platform/idea/cmd/movement/**`, the eleven
`packages/content/platform/content/platform/idea/LocomotionMode/*.yaml`
rows, and the transport pack's `packages/content/transport/src/lib/journey/**`.

Three batch-wide findings first:

1. **Both slates are almost entirely UNBUILT, and the batch is
   cut-light by design.** No `TraverseActivity` / `traverseSync` /
   `beginFor` / `defaultDurationMs` / `durationOverrideMs` / `crawl`;
   no `capacities` / `BlockerBehavior` / `guards` brain / `Pushable` /
   `push` anywhere under `src/mud` or any pack. `engageAround`,
   `traverseWithDefault` and `isTransientEngagement` are all still live
   (`api/locomotion.ts:295,316,357`; `LocomotionLogic.ts:406-465`) and
   `_engagedModePath` is still a private field on `Mobile`
   (`lib/spatial/Mobile.ts:170`). CLAUDE.md's antipattern table still
   recommends `engageAround` / `traverseWithDefault`. So the
   locomotion-as-activity `Left` is intact, and the collision `Left`
   grew.
2. **The one real graduation is the duration decision.** The vehicular
   half shipped in the transport pack as the Journey (`Journey.ts:404-423`:
   `edgeMinutes × 1/LocomotionMode.speed × loadFactor`, game minutes),
   over a kernel field `Exit.edgeMinutes` whose own comment says *nothing
   in the kernel reads this; `go north` stays instantaneous, and it must*
   (`lib/boundary/Exit.ts:155-172`). `logistics.md § The Journey` carries
   it; **`locomotion.md` — the doc both slates point at — did not**, and
   its *Future work → Pathfinder* bullet still names `defaultDurationMs`
   as "the natural ETA source", a field that does not exist. Graduated by
   INSERT (below); the stale bullet is flagged, not edited.
3. **Two shipped facts contradict kept design and are recorded under
   Uncertain, not cut:** `sneak` shipped as an *instant* traverse whose
   stealth edge is a per-observer concealment-band degrade
   (`stealth.md`), against the slate's premise that stealth needs a
   detection *window*; and `Exit.edgeMinutes` + the kernel's *must stay
   instantaneous* comment stand against the slate's *deferred, not
   foreclosed* framing of pedestrian durative movement.

⚠ Flags for the coordinator — statements in `locomotion.md` the code
proves stale, NOT edited (the batch rule is INSERT-only):
- Cast table: `LocomotionMode` is at `platform/idea/LocomotionMode.ts`,
  not `lib/locomotion/LocomotionMode.ts`; § Authoring's seed path
  `seeds/lib/locomotion/slither.yaml` → the rows live at
  `packages/content/platform/content/platform/idea/LocomotionMode/`.
- § Rejection emission: the gate union is now **ten** values, not eight
  — `terrain` and `breakaway` were added by haulage
  (`LocomotionControllerBase.ts:224-227,248-249`).
- § Future work → Pathfinder: `defaultDurationMs` does not exist; the
  shipped ETA source is `Exit.edgeMinutes × 1/speed` (see the insert).

---

## docs/slates/tails/collision-slate.md — 526 → 533 · Status PARTIAL → PARTIAL

Grew by seven lines: two small cuts, and a `Left` that the body forced
wider. Grep: `Exit.blocked` is a real persistent boolean
(`lib/boundary/Exit.ts:130,371,412-413,810-814`) rendered as *"The way
is blocked."* (`LocomotionControllerBase.ts:220`); there is **no**
third-party veto seam, no `capacities`/`actor-count`/`MaxOccupancy`/
`Crowded` on any Container, no `Pushable`/`PushActivity`/`PushController`,
no `push`/`shove`/`drag`/`lift` view under any `cmd/`, and no `guards`
brain (`lib/behavior/` has `enforces` — the bouncer, which ejects but
never vetoes a traverse — `patrols`, `wanders`, `wary`, and no blocker).

### Cut (SHIPPED · DOCUMENTED)
- none — nothing the slate designs has shipped as designed

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `### Slot capacity` (104–108, 5) — by the code: `SlotSpec.capacity`
  (default 1, authored up to 4 — `lib/slot/Slotted.ts:68,92`,
  `slot.md § Capacity`) replaced *"one occupant per slot in v1 stays
  unchanged"*. Heading + a one-line note left, preserving the
  demarcation (slot capacity ≠ containment-scope capacity, which is open)
- `### Shoving conscious actors — deferred` → the first paragraph
  (278–280, 3) — by the code: `shove` is a combat gambit
  (`lib/combat/Gambit.ts:109-111`; `cmd/combat/fight.yaml`;
  `combat.md` l.425, l.564). Heading + a one-line note left; the second
  paragraph (the unconscious body as `Pushable`) is KEPT — unbuilt

### Kept (UNBUILT)
- the canonical status block (re-stamped) · the *decomposed — not a
  standalone build* block — see Uncertain for why it stays despite the
  one-status-block rule · the two framing paragraphs · *See also* (every
  target exists: `design-philosophy.md`, `adjoining-systems.md` § 2 still
  says GRADUATED here)
- `## Principle` (the three concerns; *conscious-actor shoving deferred*
  is now stale inside a kept paragraph — see Uncertain)
- `## Concern 1 — Capacity` → `### Containment-scope capacity` + `### Capacity check timing` — no capacity field or validator exists; the completion re-check rides the shipped `preconditions-changed` abort reason (`lib/activity/Engaged.ts:60`)
- `## Concern 2 — Intentional blocking` whole (`BlockerBehavior` capability · block-validator chain · multi-blocker UX · block timing · per-actor exception lists) — the decision-half spec the `guards` brain implements; kept verbatim per the slate's own decomposition block (see Uncertain: two-slates overlap)
- `## Concern 3 — Pushing` → `### Pushable mixin` · `### Push verbs` · `### PushActivity` · the kept second paragraph of *Shoving* · `### "Sleeping body in the doorway"` (the shipped default IS *walk past trivially* — no capacity, no blocker — but the section's other half, the authored obstacle, is unbuilt; kept whole)
- `## Worked scenario — the gate guard` · `## Worked scenario — the cart in the way` — worked examples of unbuilt mechanics
- `## What this stresses for existing slates` (all four) — placement guidance for unbuilt classes; the neighbours it names (Wearable/Wieldable/Postured/Mountable/Drivable, the engagement-slot model, `Quantity<kg>`) shipped, `Pushable`/`PushActivity` did not
- `## Open questions` 1–12 — none resolved in code (see Uncertain for 7)
- `## Build order` · `## What this slate does NOT cover` · `## Once shaped into formal requirements` — the build surface

### Doctrine — kept, labelled
- `### "Sleeping body in the doorway"` → the three bullets (*no sub-room positioning · walk past trivially · description can flavor*) restate `design-philosophy.md`'s bag-of-stuff default; a coordinator could point them there. Kept with the section

### Uncertain — kept
- the second status block *"Status: decomposed — not a standalone build (resolved 2026-06-10)"* (10–30) — the one-status-block calibration says cut older blocks *that describe states that no longer hold*; this one still holds and is the slate's framing (the brain framing, the block-substrate seam, *~80% met by source-attributed rejection prose*). Kept; the coordinator may prefer it demoted to prose
- `## Concern 2` ↔ `builds/npc-behavior-slate.md` — two-slates overlap: the `guards` brain + the block-substrate seam are in npc-behavior's `Left` (its l.11, l.73-79, l.322) and that slate says it *absorbs* this concern; but the decision-half spec (targets · reason · unblock predicate · timing · multi-blocker UX · per-actor memory) exists only here. Kept in both; cluster pass decides the home
- the *"already-present-but-hollow `'blocked'` gate"* premise (decomposition block; npc-behavior-slate l.76) — the gate is not hollow: `Exit.blocked` is an authored persistent boolean that `Exit.canTraverse` refuses on (`Exit.ts:810-814`). What is missing is a *dynamic third-party* veto, which no field provides. Requirements should read the gate as *authored-static, not hollow*
- `### Pushable mixin` → `mass: Quantity<kg>` — `Tangible.getMass()` already exists (`lib/material/Tangible.ts:105`, read by encumbrance `LoadBearing.ts:167`); a `Pushable` should read it, not redeclare it. Kept verbatim; flagged for requirements
- `## Principle` → *"Conscious-actor shoving is combat-adjacent and deferred"* — stale inside a paragraph whose other sentence (sub-room positioning deferred) still holds; kept whole per the paragraph rule
- `## Open questions` Q7 *sub-room positioning — punted indefinitely* — combat shipped the `close·reach·near·far` band ladder inside a room (`ranged.md`), which is sub-room positioning for one verb family. Movement still has none. Kept; requirements should know the precedent exists
- `## What this slate does NOT cover` → *Conduit physical-passability gradient … refinement in the ranged-action slate* — ranged shipped with no physical-channel transmissivity (`transmissivity` exists only for sense channels: `Window.ts`, `Modality.ts`). The exclusion still stands; the forward pointer is stale
- Q2 *per-actor exception lists / memory storage* — the `enforces` brain keeps its 86-list as *a record in the venue's document-tree slice* (`lib/behavior/enforces.ts` header); that is the shipped precedent for *the guard remembers you*. Open in shape, but no longer a blank

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status line: added *conscious shoving shipped as the combat `shove` gambit; slot capacity as `SlotSpec.capacity`. Nothing else here is built.*
- Left: *the `guards` brain (agentive third-party blocking) · room capacity as a field + validator · the `push` verb and its activity* → *room capacity as a `capacities` field + validator, re-checked at activity completion · the `guards` brain's decision half (block targets · reason · unblock predicate over NPC memory · multi-blocker UX · start-and-completion timing — the brain itself is npc-behavior-slate's) · `Pushable` + the `push` verb + `PushActivity` · the unconscious-body-as-`Pushable` opt-in* (the body wins: the completion re-check, the decision-half spec and the unconscious-body opt-in were unrepresented; the brain itself is credited to its owner)
- Size: a tail → a tail

---

## docs/slates/tails/locomotion-as-activity-slate.md — 470 → 402 · Status PARTIAL → PARTIAL

The core design — `TraverseActivity`, `beginFor`, `traverseSync`, the
`engagedMode` migration, the three retirements, the controller refactor,
`crawl` — is UNBUILT end to end (batch finding 1). What left the slate is
the vehicular half (shipped as the Journey), the duration model (shipped
in a different shape), the `Exit` sync getter (already there), the trap
hook (rides `Mobile.traverse`), and two of three status blocks.

### Cut (SHIPPED · DOCUMENTED)
- the AUDIT block's *✅ The sneak mode shipped* bullet (15–20, 6) — code:
  `packages/content/platform/content/platform/idea/LocomotionMode/sneak.yaml`
  (`speed 0.5` · `noiseLevel quiet` · `bodyProfile crouched`),
  `cmd/movement/sneak.yaml`, `SneakController.ts`; doc: `locomotion.md
  § The care↔speed axis`, `stealth.md` l.80-88. The two ❌ bullets
  (`crawl` did not ship + its open question; the durative promotion did
  not happen + the CLAUDE.md antipattern-table consequence) are KEPT —
  both still true (`api/locomotion.ts:295,357`; CLAUDE.md's table still
  names `engageAround` and `traverseWithDefault`)
- the AUDIT block's *Remaining scope* paragraph (32–36, 5) — restated
  `Left` and still named *the duration model*; its one unique pointer
  (host-slot-activities' audit = live consumers to copy) moved into the
  re-stamped Status line
- the third status block *"Status: deferred for pedestrians"* (63–70, 8)
  — history under the one-status-block rule; its responsiveness argument
  is now `locomotion.md § Duration lives in the Journey` (the insert) and
  `logistics.md § The metronome and the score`; its three content
  triggers are `## When this earns its slot`, kept
- `## The sync/async traversal split` → the last paragraph *"The Exit
  needs a sync cached-destination getter…"* (201–205, 5) — code:
  `Exit.getDestination()` is the sync accessor and throws *"not yet
  loaded; await exit.resolveDestination() first"* when the cache is cold
  (`lib/boundary/Exit.ts:283-296,320`); doc: `boundary.md § Lazy Exit
  destination resolution`. One-line note left
- `## Once shaped into formal requirements` → the `Exit` sync getter
  bullet (454, 1) — same evidence; folded into the one replacement line
  below

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- the *⭐ UPDATE 2026-07-31 — the consumer arrived, and it is FREIGHT*
  block (48–61, 14) — code: `packages/content/transport/src/lib/journey/Journey.ts`
  (sustained engagement, per-leg `budgetFor` at :406, `modeFactor` reads
  `LocomotionApi.modeOf(mode).getSpeed()` at :419-423), `Exit.edgeMinutes`
  (`lib/boundary/Exit.ts:155-172`). The Journey mechanics (not a
  `DurativeActivity` · every beat issues the same `traverse` · the `hands`
  slot · arrival is a completion) were already `logistics.md § The
  Journey` l.153-215 — but the decision this slate needed stated in
  ITS doc — *pedestrian movement stays synchronous, and why; duration is
  the Journey's, over `edgeMinutes × 1/speed`; `speed` is a multiplier
  not m/s; the slate's fields were never built* — was in
  `logistics.md`/`Exit.ts` only → inserted at `locomotion.md` as a new
  `## Duration lives in the Journey, not the traverse` between
  § Engagement lifecycle and § Verb dispatch (17 lines). A 4-line pointer
  block left in the slate where the UPDATE stood

### Superseded — cut
- `## Duration source — time-based, not distance-based` (209–256, 48 +
  the rule) — by the code: the PRINCIPLE held (time not distance; no
  `Exit.length`; authored in time units — `Exit.ts:167-171` says *an
  event budget, not a metric*) but the FIELDS did not: no
  `LocomotionMode.defaultDurationMs`, no `Exit.durationOverrideMs`
  (grep: zero hits), `speed` stayed a relative multiplier (walk `1.0` ·
  run `2.0` · sneak `0.5` — `LocomotionMode.ts:81-82`, the three rows),
  not m/s, and it is now load-bearing (the Journey's `modeFactor`), not
  *descriptive metadata the framework does not enforce*. The v1 values
  table (m/s speeds, ms durations for nine modes incl. `crawl`) is dead.
  Heading + a note naming the shipped shape left →
  `locomotion.md § Duration lives in the Journey`, `logistics.md § The
  metronome and the score`
- `## Once shaped` → the `defaultDurationMs` / *reauthor `speed` as m/s*
  bullet (455–456) and the `Exit.durationOverrideMs` bullet (457) — same;
  the three cut bullets (with the getter) became one italic line
- `## Trap subsystem hook` (353–365, 13) — by the code: hazards shipped
  (`lib/hazard/{Hazard,HazardActivity,HazardDelivery}.ts`) and fire from
  `Mobile.traverse`'s post-move `onEntered` scan (`lib/spatial/Mobile.ts:521-532`),
  not from an activity's `onComplete`; `hazard.md § Trap + the trigger
  hook` (*fires on walked/ridden/conveyed entry only; teleport uses
  `autoSenseOnArrival`*). Heading + a note left, including the
  consequence for the unbuilt design (a `TraverseActivity` inherits the
  hook through `traverseSync`)
- `## What this slate doesn't cover` → *The trap subsystem — its own
  slate; integration point documented above* (440–441, 2) — same; the
  bullet would have pointed at a cut section

### Kept (UNBUILT)
- the canonical status block (re-stamped) · the AUDIT block's two ❌
  bullets · the two framing paragraphs · *See also* (all four targets
  exist; the `design-philosophy.md` line's rationale now names a cut
  section — left, since the target itself was not cut)
- `## When this earns its slot` — the three motivating content classes +
  the *chunk corridors* alternative; see Uncertain for #1
- `## Shape of the integration` — no `TraverseActivity` anywhere; the
  framework primitives it assumes all exist (`replaceableBy`,
  `'completed-sync'`, `'preconditions-changed'` — `api/scheduler.ts:77,93`,
  `lib/activity/Engaged.ts:60`). Its code comment *"exit override or mode
  default"* now names the superseded fields — left inside the kept block
- `## The sync/async traversal split` (minus the getter paragraph) — the
  three awaits are still there (`Mobile.ts:412` `resolveDestination`,
  `:483` rider ripple, the arrival sense); no `traverseSync`, no
  `beginFor`
- `## Migration consequences` whole — `_engagedModePath` still private on
  `Mobile` (`Mobile.ts:170-189`); `engageAround` / `traverseWithDefault` /
  `isTransientEngagement` all live and called (29 references outside
  tests); no shared `beginFor` controller shape; the *New modes: sneak
  and crawl* paragraph is mixed (see Uncertain)
- `## Open questions` Q1–Q5 — none answered in code (see Uncertain for
  Q3, Q4)
- `## What this slate doesn't cover` (minus the trap bullet) · `## Once
  shaped into formal requirements` (minus the three bullets) · the
  closing `cancel <type>` paragraph

### Doctrine — kept, labelled
- none beyond the responsiveness argument, which graduated with the
  duration section

### Uncertain — kept
- `## When this earns its slot` → #1 *Stealth as a mechanic — sneak only
  matters if there's a detection window during traversal* — **contradicted
  by the shipped sneak**: the stealth edge is a per-observer concealment-
  band degrade applied at the instant `Mobile.traverse`
  (`HidingMixin.degradeHide`: sneak holds, walk drops one band, run clears
  — `stealth.md` l.80-88; `movement.attention.{sneak,run}` for what YOU
  notice — `concealment.md`). Sneak is a mechanic with no window. Kept
  whole (a numbered list); requirements should not inherit #1 as a
  motivation. #2 (climb arcs) and #3 (pedestrian pursuit) have no code —
  though the Journey delivers #3 for vehicles (*the vehicle is genuinely
  present in every node it passes*, `logistics.md` l.163-165)
- the whole pedestrian-durative premise vs `Exit.ts:160-163` / `logistics.md`
  l.192-195 — *"`go north` stays instantaneous, and it MUST: a duration on
  ordinary movement would put a real-time toll on every step"*. The slate
  frames pedestrian duration as *deferred until content earns it*; the
  shipped comment reads as a foreclosure. Kept as designed; requirements
  must decide whether that comment is a permanent rule or the transport
  build's scope statement. Also: any pedestrian duration would now
  naturally be `edgeMinutes × 1/speed` in GAME minutes, not the slate's
  real-time ms — the unit changed underneath the design
- `## Migration consequences` → *New modes: `sneak` and `crawl`*
  paragraph — the sneak half shipped exactly as the paragraph's own
  escape hatch predicted (*"they could ship as instant verbs today"*) but
  with `noiseLevel: quiet`, not `silent`, and `speed 0.5` (multiplier),
  not the table's `0.6 m/s`; `bodyProfile: crouched` matched. The crawl
  half is open. Kept whole per the paragraph rule
- `### Q3. NPC-AI initiator pattern` — premise *"the NPC AI subsystem is
  paper"* is stale: brains shipped (`behavior.md`), and `wanders`
  moves NPCs through `LocomotionApi.traverseWithDefault(mob, exit)`
  (`lib/behavior/wanders.ts:40`). So the retirement of `traverseWithDefault`
  now has a live brain caller to migrate, and Q3's *"what it looks like"*
  is answerable by reading `wanders`. Kept; the question (is `beginFor`
  the right entry point for a brain) is still open. Same for the *NPC AI*
  bullet in *What this slate doesn't cover*
- `### Q4. Footstep cadence + emissions` — no `SoundEvent` anywhere
  (`grep -rn SoundEvent src/mud` = 0); the *Audible push* in
  `perception.md` and `SoundModality` exist as the hearing substrate but
  nothing emits footsteps. Kept as designed
- `### Q5. Server-restart lifecycle` — engagements are still runtime-only
  (`locomotion.md § Reference shapes`: *a reloaded actor wakes up
  unengaged*); no shutdown pass aborts engagements with `'restart'`. Open
- Overlaps for the cluster pass: `## Migration consequences`' controller
  refactor ↔ `tails/host-slot-activities-slate.md` l.189, l.368-370 (the
  same `beginFor` shape, and a sequencing question between the two); the
  `crawl` open question ↔ `locomotion.md § Future work` (*`Crawlable`
  mixin + `crawl` mode*, which cites this slate); `Q4` ↔ any sound slate

### Handoff (belongs in a doc outside my list)
- → `activity.md` l.655-668 (the *Forward-looking work → Locomotion as
  activity* bullet): it still says the physics-honest substrate is
  *"`speed` in m/s, `defaultDurationMs`, optional `Exit.durationOverrideMs`"*
  — those are the superseded fields. A one-clause correction belongs
  there, pointing at `locomotion.md § Duration lives in the Journey`. Not
  a graduation — a stale forward reference in a doc outside my list;
  verbatim text to point at is the inserted `locomotion.md` section
- → `spatial.md` — nothing; the slate's `Mobile.traverse` statements
  (three awaits, throws `ContainmentError` on gate rejection) are
  unchanged and documented there and in `locomotion.md § Mobile.traverse
  mode-gate`
- → `conveyance.md` — nothing

### Status block
- Status line: rewritten to name what shipped and where (sneak → the
  care↔speed axis; the vehicular half + the duration source → the
  Journey; the getter + the trap hook exist) and to carry the
  host-slot-activities pointer from the cut *Remaining scope* paragraph
- Left: *the durative `TraverseActivity` promotion · the sync/async split · the duration model · the `engagedMode` storage migration · the three retirements (and the CLAUDE.md antipattern-table edit they force) · `crawl`, if still wanted* → *the durative `TraverseActivity` promotion (mode-name as engagement type) · the sync/async split (`Mobile.traverseSync` + `TraverseActivity.beginFor`) · the `engagedMode` storage migration onto `EngagedMixin` · the three retirements (`engageAround` · `traverseWithDefault` · `isTransientEngagement`, and the CLAUDE.md antipattern-table edit they force) · the per-mode controller refactor to the shared `beginFor` shape · `crawl`, if still wanted · Q1–Q5 (the replacement set · cancel prose · the NPC-AI initiator · footstep emissions · the restart lifecycle)* — *the duration model* dropped (superseded); the controller refactor and the five open questions were in the body and unrepresented
- Size: a wave → a wave

---

## Batch totals

| slate | before → after | Status | Left items | Size |
|---|---|---|---|---|
| `tails/collision-slate.md` | 526 → 533 | PARTIAL → PARTIAL | 3 → 4 | a tail → a tail |
| `tails/locomotion-as-activity-slate.md` | 470 → 402 | PARTIAL → PARTIAL | 6 → 7 | a wave → a wave |

- Cut (SHIPPED · DOCUMENTED): 5 items, 25 lines
- Graduated: 1 item (14 lines → 17-line insert in `locomotion.md`)
- Superseded: 6 items (~78 lines cut, ~30 lines of notes left)
- Kept (UNBUILT): everything else — both slates are live design
- Uncertain: 8 (collision) + 7 (locomotion-as-activity)
- Handoff: 1 (`activity.md`'s stale forward reference)
- Subsystem doc: `locomotion.md` 386 → 403 (+17, one INSERT, no existing
  sentence changed; three stale statements flagged at the top)

### Hardest calls
1. **Cutting the duration-model section as SUPERSEDED rather than
   keeping it as UNBUILT for pedestrians.** The fields were never built
   and a different field (`edgeMinutes`, game minutes, per edge) now
   owns the concept; `speed`'s meaning (multiplier, not m/s) makes the
   section's table wrong, not merely unbuilt. The principle survived and
   is in the insert; the design is one `git show` away.
2. **Keeping the collision slate's decomposition block despite the
   one-status-block rule.** It is the slate's framing (the brain
   framing, the seam, the ~80% observation) and still holds; cutting it
   would leave the `BlockerBehavior` sections reading as a mixin to
   build. Flagged for the coordinator rather than decided here.
3. **Not cutting `## When this earns its slot` #1.** The shipped sneak
   contradicts it outright, but it sits in a numbered list with two
   live items; the paragraph rule and the *kept-but-contradicted →
   Uncertain* calibration both say keep and flag.
