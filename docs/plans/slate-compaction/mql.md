# Slate-compaction pass — mql batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `mql.md` only
(three inserts, 36 lines). Line numbers below are the ORIGINAL file's.
Originals saved under the scratch dir `mql/orig/` for diffing. Code was
verified in `packages/server/src/mud/api/mql/**`, `api/stuff.ts`,
`api/mixin.ts`, `api/perception.ts`, `lib/command/validators/**`,
`platform/idea/api/CommandLogic.ts`, `platform/idea/modalities/**`,
`packages/content/residence/src/**`, `packages/content/platform/content/
platform/cmd/**`, and `scripts/check-world-scan.ts` /
`check-whole-table.ts`.

Three things a reviewer should know first:

1. **Two of world-scan's four `Left` items were false on arrival.** *The
   `flat` seed (also `getAllObjects`)* — there is no `flat` seed and never
   was: `candidatesForFlat` (`mql/scope-walk.ts:259`) is a candidate
   builder over an array, and the one `getAllObjects` path through it —
   `resolver.ts:634` at the slate's own baseline `ae891fa52` — WAS the
   `world` **scope keyword**, now `wholeRegistry("scope 'world'")`
   (`resolver.ts:762`), gated. *An engine-side `world:` subscription if
   one is ever added* — cannot be added: the grant is planted only by
   `CompactApi.readWorldAs`, whose sole caller is the binder's one-shot
   retry (`CommandLogic.ts:382`); `MqlSubscriptionRegistry` has no grant
   path and classifies the refusal as `'permission'` (`:360,:483,:855`).
   `governance.md § What else the seat confers` states it; `mql.md` did
   not → inserted (below). `Left` shrinks to the two speculative tails.
2. **The world-scan build's measurements are not superseded — they are
   the doc.** The boot-time build and the residency sweeps did not
   re-measure the registry; the slate's n = 1,785 / 2,060 is what
   `antipatterns.md § Bespoke Object-Search Algorithms` cites, and the
   live counter is `StuffApi.#registryReads` (`api/stuff.ts:1469–1500`,
   `lib/stuff/RegistryReadStat.ts`), which nothing documents outside
   code. Not a design gap; noted for the coordinator.
3. **Scope-modality is UNBUILT but its premise is now contradicted by a
   shipped decision.** The slate wants sight and reach to cross a
   container boundary by *different* rules (a clear case passes sight,
   blocks reach). What shipped is ONE rule for both: `MixinApi.
   isOpenContainer` is asked by `canReach`, the `peers` walk,
   `mustBeInLocation` AND `VisionModality` (`VisionModality.ts:161–171`)
   *"so what you can name, see and touch cannot drift apart"*
   (`perception.md § canReach`). A shut `Sealable` is opaque to sight
   today. Kept verbatim; flagged under Uncertain so requirements
   reconcile rather than inherit.

---

## docs/slates/tails/world-scan-perf-slate.md — 741 → 222 · Status PARTIAL → PARTIAL

Everything except D5 shipped in MR !252 and is documented across
`mql.md` / `antipatterns.md` / `lint-family.md` / `call-security.md` /
`command-routing.md` / `governance.md` / `residence.md` / `slot.md`. The
grep: `resolver.ts:224,317` throw `MqlPermissionError(WORLD_REFUSED)`;
`ExecutionContextApi.getWorldReadGrant` (`execution-context.ts:730`);
`CompactApi.readWorldAs` (`compact.ts:155`); `StuffApi.findByMixin` +
`#indexes.byMixin` behind `RegistryWideReaders` (`stuff.ts:86–139,
1422`); `MixinApi.#lowercaseMemo` WeakMap (`mixin.ts:313–314`);
`FromTemplateMethod` (`lib/security/SecurityPolicies.ts`); `RegistryScan`
+ the `registry-scan` note (`mql/types.ts:216`, `CommandLogic.ts:388`,
`CommandGiver.ts:116`); `lint:world-scan` (three allowlist homes, water
gone) + `lint:whole-table` (ceiling 0); no `world:[` string outside
comments/tests in kernel or packs; the only `commandGiver: null` calls
left are `CompactLogic.ts:187` and `MqlGroupProvider.ts:44` (`online`,
not `world`). Headings were kept as pointer stubs so the slate stays
navigable; every stub names the doc section.

### Cut (SHIPPED · DOCUMENTED)
- the `> ## ✅ SHIPPED 2026-09-08` blockquote's paragraphs 1, 2 and 4 (20–31, 39–42, 16) — history (*"Part 3's D1–D5 all shipped"*, *"D3b's SHAPE was superseded"*, *"call sites… historical inventory"*); paragraph 3, the *Where the shipped truth lives now* pointer list, is KEPT as the See-also
- `## Part 0 — ⚠⚠ The doctrine reversal` body (87–116, 30) — doc: `antipatterns.md § Bespoke Object-Search Algorithms` (the ⚠⚠ *"taught the defect for a year"* paragraph; the per-tick CPU-core post-mortem), `lint-family.md § lint:world-scan` (*"This gate used to point offenders AT the second pattern"*). Heading + pointer left
- `## Part 1 — ⭐⭐ The crux` body (122–142, 21) — doc: `antipatterns.md` INSTEAD 1 (*Ask the owner* — `flowSplitsFor` → `employeesOf`), INSTEAD 3 (*global AND selective*). Heading + pointer left
- `## Part 2 — The inventory, triaged` body incl. Buckets A/B/C + *Benign frequency* (146–205, 60) — history; every site verified remediated: `resolveScreen` glob, `branchOf`, `allPoints`, `allBusinesses`/`employeesOf`/`findOrganization`, `holdsAnyPublishingPosition`, `takeCensus`/`spawnNow`, `decoyNameFor`, `captureAtShutdown` on the pair list (`stuff.ts:86–139`); `TitleController.books` → `ResidenceCatalogue.platBooks()` (`TitleController.ts:140`); `OuterWarren.admitFor` + `maintains.holdingsUnder` → `ResidenceCatalogue.holdingsUnder` (`OuterWarren.ts:427`, `residence/src/behavior/maintains.ts:128`); `Slottable.occupiedSlots` → `_occupancy` back-ref (`Slottable.ts:181`, `slot.md § The occupancy back-reference`); `allModes` → `findByPathGlob('/platform/idea/LocomotionMode/*')` (`LocomotionLogic.ts:143`); `holdersByPositionImpl` reads `getRosterAssignments()` (`EmploymentLogic.ts:201`). Heading + pointer left
- `### D1` body (211–232, 22) — code as above; doc: `mql.md § The registry-read grant` (*The composition index*, composed-only), `antipatterns.md` INSTEAD 3. The WHY was undocumented → graduated (below). Heading + pointer left
- `### D2` body (236–299, 64) — rungs 1–2 + the order: `antipatterns.md` INSTEAD 1–2 (*a path glob is very often the cheapest honest rung — `allModes` is eleven rows*); rung 3 *memoize, never warm*: `residence.md § ResidenceCatalogue` (*lazy, self-loading, never warmed; the memo holds ROW PATHS*); the water allowlist entry retired: `lint-family.md § lint:world-scan` (*when an allowlist entry's REASON expires, the entry goes*), `check-world-scan.ts` header; the kernel→pack layering smell: `residence.md § ResidenceCatalogue` para 1. Rung 2's mechanism is Superseded (below). Heading + pointer left
- `### D3 — Two gates` → Gate A + the ⛔ not-an-actor-check + *a VERB with a seat* paragraphs (303–345, 43) — code: `resolver.ts:224,317`, `RegistryWideReaders`; doc: `mql.md § The registry-read grant` (*The engine's registry reads are not here*; the rejected-shapes table), `mql-grammar.md § There is no world seed`, `antipatterns.md` (*A null giver is not a grant*). Heading + pointer left
- `### D3a` body (349–408, 60) — code: `SecurityPolicies.FromTemplateMethod`, `lib/security/__tests__/FromTemplateMethod.test.ts`; doc: `call-security.md § The calling function — FromTemplateMethod, and where the frame is` (policy before push → top frame is the caller's; nearest-dispatched-frame doctrine incl. the brain `act()` and `Root` cases; the five fail-closed conditions; `opts.module` a disambiguator only — table row l.880). Heading + pointer left
- `### D3b` body incl. its two user blockquotes, the arms table, the binder/async paragraph, the ⛔ `MqlContext` flag, the warning degrade, the no-subscriptions decision (422–498, 77) — code: `CommandLogic.ts:368–392` (catch → `readWorldAs` → retry → `registry-scan` note), `compact.ts:155`; doc: `governance.md § What else the seat confers` (derived never stored · the executive decides in one method · told what it cost · typed queries only), `mql.md § The registry-read grant` (the two rejected shapes — `permission:` on `MqlContext`, `resolveWorldForSeat`), `command-routing.md § The world arm — catch, ask the executive, retry`, `antipatterns.md` (*the exemption is not a second door*). The no-subscriptions clause was missing from `mql.md` → graduated (below). Heading + pointer left
- `### D4` body (502–526, 25) — code: `scripts/check-whole-table.ts` (ceiling 0, `EXEMPT` empty), no `allBusinesses().find` / `allRecords()` / `allPages()` callers remain; doc: `antipatterns.md § An Api May Not Hand Back Its Table` (the three tests, *grows with the world*), `lint-family.md § lint:whole-table` (self-receiver exemption). Heading + pointer left
- `## Part 4 — Remediation order` body (578–619, 42) — history; steps 1–11 all verified landed (the Part 2 evidence, `lint:whole-table`, the inverted antipatterns entry). Heading + one line left
- `## Part 5 — The rule this leaves behind` body (625–638, 14) — doc: `lint-family.md § lint:world-scan` (*you may not be handed the world*), `antipatterns.md` (*The rule now: you may not be handed the world; you may ask it a question*). Heading + pointer left
- `## Lens pass` body (644–656, 13) — the one live check (authored `world:` cases served by scoped seeds) was done at requirements: `mql-grammar.md § There is no world seed` carries the replacement table (path glob · `reachable` · `person` · `online` · `:members`). Heading + pointer left
- `## Open questions` intro + Q1–Q6 (661–719, 59) — all closed; one pointer line each left: Q1 → `mql.md § The registry-read grant` (composed-only; the `[active.X]` residue stays on the line); Q2 → `call-security.md` + `command-routing.md § The world arm`; Q3 → `residence.md § ResidenceCatalogue` (row shape, neither class); Q4 → the pair list (`takeCensus`, `holdsAnyPublishingPosition`); Q5 → `antipatterns.md` (1,785); Q6 → `lint-family.md § lint:whole-table`
- `## What this slate does NOT cover` → bullet 1 (allowlist homes, 725–729) → `check-world-scan.ts` header + `lint-family.md`; bullet 4 (subscription re-resolve cost, 735–741) → `governance.md § What else the seat confers` + the new `mql.md` paragraph. One line each left; the api-normalization bullet is KEPT verbatim

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### D1` → *Legitimate because it is an axis of the substrate, not a slice of the taxonomy* + ⛔ *No `byClassName` index* + *Enabling fact: pure functions of the constructor → memoize `queryMixins` on a `WeakMap<ctor, …>`* (216–232) — code: `stuff.ts` `#indexes.byMixin`, `mixin.ts:313–314` `#mixinMemo`/`#lowercaseMemo` → inserted at `mql.md § The registry-read grant`, after *The composition index* paragraph, as **⭐ Why one index, and why it is composition** (15 lines: the substrate-axis test, the rejected class index and where the class readers went, the per-class memo, and the rejected event bus)
- `### ⛔ Rejected — a global event bus that pushes objects into caches` (537–572, 36) — the two reasons (fan-out taxes creation; the cold-start hole IS the scan) are the last two sentences of the same insert. The logistics precedent (`onContractSettled`) and the *`postRegister` is the push hook* paragraph are not carried — the first is history, the second is `residence.md`'s *a push cannot be inherited* in shipped form. Heading + pointer left
- `### D3b` → *Decided — the seat arm does NOT extend to MQL subscriptions* (491–498) — code: `readWorldAs`'s only caller is the binder's one-shot retry; `MqlSubscriptionRegistry` has no grant path → inserted at `mql.md § The registry-read grant`, after the catch-and-retry paragraph, as **⚠ The grant is one-shot by construction** (6 lines, pointing at `governance.md`)

### Superseded — cut
- `### D3` → **Gate B — what** (410–418, 9) — by the code: for engine code the shape gate became the *parameter type* of `StuffApi.findByMixin` (*"That used to be a runtime check inside the resolver; a signature is better"* — `antipatterns.md`, `stuff.ts:1411–1415`); for the seat *any* shape resolves and the `registry-scan` note carries `indexed: false` (`resolver.ts:319`). Note left under D3a
- `### D2` → **Rung 2 — the owner's keyed map, filled at `postRegister`**, pack half (261–273) — by `residence.md § ResidenceCatalogue`: the catalogue derives from the ROW's `parentExtent`, lazy, never warmed, *"because institution classes span packs and a push at `postRegister` cannot be inherited from a base the pack does not own"*. Named in the D2 pointer
- `## What this slate does NOT cover` → *The `flat` seed* (730–731) — by the code: no such seed exists (see reviewer note 1). One-line note left

### Kept (UNBUILT)
- the status block (re-stamped) · *Captured / Decided* framing · the *Where the shipped truth lives now* pointer list · *Provenance* (the user's five quotes — framing, kept whole) · *Sits on*
- `### D5 — MQL grammar for the specialized slices: later, if at all` — no seed or filter namespace over an owner's roster exists; `:members` (residences D16) is the nearest thing and is keyed-member, not a roster lift
- the `[active.X]` residue on the Q1 pointer line — no `active.` namespace in `predicates.ts` / `resolver.ts`; `findByMixin` is composed-only by design
- `## What this slate does NOT cover` → the api-normalization-slate pointer

### Uncertain — kept
- *Sits on* → *"(§ Bespoke Object-Search Algorithms — ⚠ **this build inverts it**)"* and *"(⚠ a pack cannot ship an Api — Part 3 D2)"* — both annotations are now history (the entry IS inverted; D2 is a stub), but they sit inside the kept See-also paragraph (paragraph rule). Cosmetic
- nothing else

### Doctrine
- none — the slate's doctrine (*you may not be handed the world*) is shipped as a gate and documented in `lint-family.md` / `antipatterns.md`

### Handoff (belongs in a doc outside my list)
- none. ⚠ For the coordinator, not a handoff: `StuffApi.#registryReads` / `RegistryReadStat` (*what each registry-wide reader has read this process*, `maxReturned` the load-bearing column, process-local) is a shipped instrument with no doc mention anywhere; its natural home is `residency.md` or `lint-family.md § lint:world-scan`. Code comment is thorough; flagging only

### Status block
- Status line: appended *"compacted 2026-09-19 (ledger: …)"*
- Left: *the `flat` seed (the deep-contents scan …) · an engine-side `world:` subscription if one is ever added · MQL grammar for the specialized rosters (D5) · an active-mixin selector `[active.X]`* → *MQL grammar for the specialized rosters (D5, "later if at all") · an active-mixin selector `[active.X]` if anything ever wants one (Q1's residue)* — two items were false on arrival (reviewer note 1)
- Size: a tail → a tail

---

## docs/slates/tails/scope-modality-slate.md — 196 → 176 · Status PARTIAL → PARTIAL

Almost entirely UNBUILT. Grep: no `modality` key in any view under
`packages/content/*/content/*/cmd/**`; the `requires{Hearing,Touch,Taste,
Smell,VerbalESP,EmotiveESP}` validators test the ACTOR's sensorium, not
a target scope; the `Modality` singletons (`platform/idea/modalities/*`)
are perception channels (`senses.md`), not a verb axis; no
`transparent` / see-through field on any container (`lib/spatial`,
`lib/boundary`, all content YAML — the two `transparent` hits are
`forum.yaml` / `office.yaml` prose); `VisionModality.ts:161–171` crosses a
container boundary by `MixinApi.isOpenContainer` — the SAME rule as
reach — so a shut `Sealable` is opaque to sight. What did ship is the
reach half of Principle 2: `PerceptionApi.canReach` (`api/perception.ts:
259`, one level into an open container, doors on exits, `viaExit`), the
`canReach` validator (`lib/command/validators/canReach.ts`, 22 views),
`reachableAmong` for loops, and `perception.md § canReach` as the doc.
⚠ `eat.yaml` — the slate's motivating case — declares `scope:
"reachable"` + `mustBeEdible` and NO `canReach`, and `EatController` does
not ask reach either; `tally.yaml` carries `canReach` and answers the
shut-lid case as *"a watch with its lid shut reads as nothing"* — a
readable-state answer, not a sight-permeability one.

### Cut (SHIPPED · DOCUMENTED)
- the second `> **Status:** slate (design captured, build deferred-until-pulled).` line (10, 1) — history; ⚠ a second `**Status:**` key in the file. The rest of that blockquote (*Surfaced by* · *Touches* · *Sequencing*) is the framing + See-also and is KEPT
- `## Sequencing` → *The resolution-vs-feasibility discipline is cross-cutting and worth landing as a stated rule the moment any verb starts accepting explicit MQL targets* (173–175, 3) — code: `canReach.ts` (header: *"MQL's `scope:` declaration is a search hint, not a security gate"*); doc: the new `mql.md` paragraph (below) + `perception.md § canReach`. One-line note left in the list

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Principle 2 — resolution ≠ feasibility` → the two definition bullets + *The scope try-list is a convenience default… the per-verb feasibility validator is the contract* + *Validators return a reason, not a boolean — because the prose lives there* + `### The corrected pipeline` (83–114, 32) — code: `canReach.ts` (the doctrine lived only in its header comment), `PerceptionApi.canReach`, `command-routing.md`'s `validator-failed { detail }` note; `mql.md § Resolving is not permission` carried the *permission* flavour (*"what that guest may then do with a match is decided by the verb"*) but not the *feasibility* one → inserted at `mql.md § Resolving is not permission`, after its first paragraph, as **Nor is resolving feasibility** (12 lines: `scope:` is a search hint (first non-empty wins), explicit MQL bypasses it, the validator is the contract and assumes nothing about how the target was named, `canReach` the exemplar, a reason string because the prose lives there, pointer to `perception.md`). Heading + pointer left; the pointer says the modality-general half stays open

### Superseded — cut
- none

### Kept (UNBUILT)
- the status block (re-stamped) · the *Surfaced by / Touches / Sequencing* blockquote · `## The premise` (spine; its two questions are still the open cases)
- `## Principle 1 — modality-scoped scope, per-modality permeability` (the table + *one scope-walk* paragraph) — see Uncertain
- `### The scope logic is used two ways` — see Uncertain
- `## What this needs built` — all four bullets. Bullet 2's *"reach-into-open-containers may largely exist for `get`"* is confirmed (`perception.md § canReach`, one level); bullet 4's reach instance shipped (`canReach`), its modality-general form did not; adoption is incomplete (`eat`)
- `### Likely already-there vs. gap (verify at planning)` — verified 2026-09-19: *There / partial* is all present (try-list: `command-spec.md § scope:`; viewer-aware perception: `mql.md § Scope-walk`; reach into open containers: `perception.md`; validators + cardinality: `command-routing.md`); of *Gap / new*, the first three remain gaps and *the hard resolution-vs-feasibility discipline* shipped (graduated above). Kept as the planning checklist
- `## Consumers` · `## Sequencing` (bullets 1–2, the trigger paragraph) · `## Open questions` Q1–Q4

### Uncertain — kept
- `## Principle 1` — **kept-but-contradicted.** The slate's sight row (*clear case passes; a shut hunter lid is a tiny opaque box*) needs sight and reach to differ at a boundary. The shipped decision is the opposite: `isOpenContainer` is *"the single rule four things ask — `canReach`, the MQL `peers` scope walk, `mustBeInLocation`, and `VisionModality` — so what you can name, see and touch cannot drift apart"* (`perception.md § canReach`; `VisionModality.ts:161`). A per-modality permeability would split that rule deliberately; requirements must say so rather than inherit both
- `### The scope logic is used two ways` — the reach instance shipped in a **different shape**: not one walk called twice but one RULE (`isOpenContainer`) with two deliberately distinct consumers — the `peers`/`reachable` candidate pool (search, attention-scored) and `PerceptionApi.canReach` (a membership predicate that also counts attached doors and the `viaExit` binding). `api/perception.ts:238–251` argues the two must NOT be one walk (*"the wrong shape and the wrong cost"*). Kept because the modality-general claim is still open; flagged because its *same walk* premise is contradicted for reach
- `## Sequencing` → *Trigger to graduate: … Today that's `tally` (sight) and a real `eat` (reach)* — stale: both verbs shipped without modality scope (`tally` answers the shut lid as a readable state; `eat` has no reach validator at all). The trigger rule itself still stands; the example verbs do not
- `## Open questions` Q4 (*generic per-modality validator driven by the declared modality vs hand-rolled per controller*) — partially answered by the code: `canReach` is a generic validator referenced by PATH from each view (neither of the slate's two options), and nothing derives it from a declared modality. Kept; the modality-driven half is exactly the open design
- `## What this needs built` bullet 3 → *"The light substrate already has the boundary pieces (`Window`, `Conduit`, glass)"* — `lib/boundary/Conduit.ts` has no transparency notion (grep `transparen` empty); `light.md` should be re-read at requirements before leaning on it (Q3's *reuse the boundary substrate* lean rests on this). Kept inside the bullet
- Overlaps for the cluster pass: transparent containers ↔ `light.md`'s boundary model; the reach one-level bound ↔ `perception.md` (shipped — a per-modality design must start from it)

### Doctrine
- `## The premise` → *"resolution and feasibility are different layers"* — now shipped and stated (`mql.md`); the sentence stays as the slate's framing, not as backlog

### Handoff (belongs in a doc outside my list)
- → `perception.md § canReach` (a one-line *Deferred* note, if the coordinator wants the contradiction recorded on the doc side): *A per-modality permeability (sight through a transparent container while reach is blocked) is designed but unbuilt — `scope-modality-slate.md`; it would split the one-rule guarantee above deliberately.*
- → `command-routing.md` (the validators section): nothing — the shipped rule is now in `mql.md`; if the coordinator prefers it beside `runValidators`, move the **Nor is resolving feasibility** paragraph rather than duplicate it

### Status block
- Status line: appended the shipped reach definition + `perception.md` pointer, and the compaction note
- Left: *modality as a per-verb scope axis · per-modality container permeability · transparent containers (sight-through walls) · feasibility validators that assume nothing about resolution* → *modality as a per-verb scope axis · per-modality container permeability (⚠ today ONE `isOpenContainer` rule serves reach AND sight) · transparent containers (sight-through walls) · the modality-general feasibility validator + its adoption (`eat`, the slate's own case, carries no reach validator)* — the fourth item narrowed: the reach validator ships, the modality-general one and its adoption do not
- Size: a wave → a wave

---

## Totals

- world-scan-perf: 741 → 222 (−519). Cut SHIPPED·DOCUMENTED 15 sections/bodies · Graduated 3 (two into one insert) · Superseded 3 · Kept 4 · Uncertain 1 (cosmetic)
- scope-modality: 196 → 176 (−20). Cut 2 · Graduated 1 · Superseded 0 · Kept 8 · Uncertain 5 · Doctrine 1
- `mql.md`: +36 lines, three inserts (§ The registry-read grant ×2, § Resolving is not permission ×1); no existing sentence changed
- Handoff: 1 optional line → `perception.md`; 1 coordinator flag (`#registryReads` undocumented)

### Hardest calls
1. **The `flat` seed.** Cutting a `Left` item as a phantom is the most aggressive move in the batch. Verified at two commits (HEAD and the slate's own baseline `ae891fa52`): there was never a `flat` seed; `candidatesForFlat(StuffApi.getAllObjects())` at baseline `resolver.ts:634` was the `world` **scope keyword** arm — the exact line the build closed. Recoverable from git if wrong.
2. **Principle 2 as SHIPPED.** The mechanism exists and 22 verbs use it, but `eat` — the slate's own example — does not. Decided the *principle* shipped (graduated) and the *adoption gap* is what stays, named in `Left` and in the kept fourth bullet, rather than keeping 32 lines of a decided design.
3. **Principle 1 as kept-but-contradicted rather than Superseded.** The one-rule guarantee in `perception.md` is a shipped decision that a per-modality design would have to overturn on purpose. It is not "shipped in a different shape" — the modality axis does not exist — so it stays UNBUILT, with the contradiction on record.
4. **Where D1's rationale lives.** The composition index is `StuffApi`'s, not MQL's, but `mql.md` already carried *The composition index* and was the only doc in my list; the insert sits beside that paragraph. A later pass may prefer `residency.md` or an `architecture.md` registry section.
