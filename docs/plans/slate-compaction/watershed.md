# Slate-compaction pass — watershed batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Insertable doc: `docs/subsystems/watershed.md`
only. No prior `watershed.md` ledger existed in this directory at start.

Context: MR!219 (the water build) shipped the `/system/water` capability
pack and wrote `docs/subsystems/watershed.md` as its reference. Both
slates assigned here predate that build and were its design input. Code
verified in `packages/server/src/mud/lib/{husbandry,wetness,supply,zone}/**`,
`packages/server/src/mud/lib/husbandry/{Cultivable,Soil}.ts`,
`packages/content/water/**` (kernel-facing pack: `Watercourse`,
`WatercourseCatalogue`, `Conduit`, `ControlStructure`, `StorageNode`,
`WaterRightRegistry`, `fouled-water.yaml`), and
`packages/server/src/mud/platform/idea/cmd/crafting/WashController.ts`.

One finding worth flagging up front: **both packs turned out almost
entirely ABSORBED.** The build was designed directly from these two
packs (the supply pack's own header says the water pack's blocker "is
resolved by supply-design-pack § Part 4"), so nearly every open question
and design fork in both is now either shipped verbatim, shipped in a
more general shape than proposed (rivalry → the water-rights/quota
mechanism; the well/cistern depth tier → `StorageNode`), or answered by
a piece of code neither pack's author could have cited (the windowsill
pot: a pot's `landRequirementM2` is 0, so it catches no rain regardless
of location — no indoor/outdoor special case was ever needed).

---

## `docs/slates/tails/water-design-pack.md` — 347 → 59 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Older narrative status block (lines 10–26, the "⭐⭐ SHIPPED 2026-09-02"
  paragraph) — a second status block per the pilot calibration; the
  canonical one (lines 3–8) is kept and re-stamped.
- `## Part 0 — The correction: water is not thin, it is unconnected`
  (26 lines) — code: the whole `water` pack; doc: watershed.md's own
  intro ("Water already had physics everywhere and weather nowhere…
  What was missing was every connection between them") states the
  identical finding, nearly verbatim.
- `## Part 1 — The ∞ tap is a decision, not an oversight` (32 lines) —
  code: `UnboundedSourceMixin` unchanged; doc: watershed.md § *What this
  build deliberately did NOT do* — "Domestic metering. The mains stay
  effectively unlimited at the household tap."
- `## Part 2 — The call: scarcity comes from the SKY` (42 lines,
  including the Law-2 absence check) — code: `lib/husbandry/Cultivable.ts`
  + `lib/husbandry/Soil.ts` (`restampWatershed`); doc: watershed.md
  § *Rain reaches soil (W1)* and § *The unresolved ref, and why it has
  its own checkpoint* — the absence-integration guarantee is the same
  claim, same mechanism.
- `## Part 3 — The utility layer is SUPPLY FAILURE, not billing`
  (37 lines, table + two paragraphs) — code: `lib/supply/SupplyState.ts`,
  `Conduit`'s six-word vocabulary; doc: watershed.md § *The six-word
  failure vocabulary* (W5) + § *Contamination and the counterplay
  ladder* (W8). The "coverage is legal, connection is physical" line is
  verbatim in watershed.md § `Conduit` (W5). The John Snow / epidemiology
  payoff paragraph is graduated separately below, then cut.
- `## Part 5 — Designed to the format` (53 lines, the whole
  what-is-it/surfaces/verbs/persistence/seams/fault-line template) —
  code + doc: every row of the surfaces table now has a shipped answer
  in watershed.md (rain→soil = W1; water-available precondition = see
  Handoff; supply-ref = SupplyState/W5/W8; contaminated→disease = the
  shipped `ToxinTag`/dysentery route on `fouled-water.yaml`; the
  well/cistern depth tier = `StorageNode`, W6; metering declined = *What
  this build deliberately did NOT do*). The sync/async blocker this Part
  flags as "amended" is resolved verbatim by watershed.md's *cache
  identity, derive state* discipline (W1).
- `## Forks settled, and the blockers` (19 lines) — restates decisions
  1–6, all cut above; "blockers" (room-condition/disease/power-slate)
  are stale — the supply-ref and the contamination route shipped
  independent of those other packs.
- Open question 1 (rain rate/interval, already marked ✅ in-slate) —
  doc: watershed.md § *The precipitation integral (W1)*, verbatim
  segment-walk + `{liquid, frozen}` split.
- Open question 3 (windowsill pot indoor/sky-exposed ruling) — code:
  `lib/husbandry/Cultivable.ts` (a pot's `landRequirementM2` is `0`);
  doc: watershed.md § *Rain reaches soil (W1)* — "A pot catches nothing…
  A pot draws zero land." The ruling needed no indoor/outdoor case at
  all: a pot never catches rain regardless of where it sits, which
  answers the question more cleanly than either lean the slate offered.
- Open question 5 (should drought ever threaten drinking water) — doc:
  watershed.md § *What this build deliberately did NOT do* — domestic
  mains stay unlimited; matches the slate's own lean exactly.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Part 3`'s "The contamination payoff: this is John Snow" subsection
  (18 lines) + open question 4 ("does contaminated water need a visible
  tell?") (5 lines) — code: `packages/content/water/content/stuff/idea/material/bulk/fouled-water.yaml`
  ("Nothing about fouled water announces itself… the intake's POSITION
  is the thing that matters") — the mechanism shipped but watershed.md
  never stated the no-visible-tell decision or its epidemiological
  rationale. Inserted at watershed.md § *Contamination and the
  counterplay ladder (W8)*, new subsection "⭐ Contamination carries no
  sensory tell, on purpose" (11 lines).
- `## Part 6 — Pedagogy`'s water-cycle/Liebig bullets (8 of 13 lines;
  the epidemiology bullet is covered by the graduation above, the
  infrastructure-invisible-until-failure bullet folded in below) —
  shipped mechanism (`satWater` as a Liebig limiting factor was dead
  code before the rain edge; SupplyState's failure states) with no
  stated "why" in watershed.md. Inserted at watershed.md § *Rain reaches
  soil (W1)*, new paragraph "⭐ Why this edge is worth having,
  pedagogically" (9 lines).

### Kept (UNBUILT)
- `## Part 4 — Cleaning needs water AVAILABLE, not SPENT` — kept whole.
  Its precondition principle ("water is a PRECONDITION on the room, not
  a consumable on the act") already has a shipped precedent
  (`WashController.ts`: `wash` requires a reachable bulk water source,
  consumes nothing) — see Handoff — but the two things the section is
  actually arguing for are still open: **`bathe`/the bathroom's
  modelled function** (no `bathe` verb exists anywhere in the tree) and
  **"running water" as a residence-ladder rung feature** (no such
  concept in any subsystem doc). Kept verbatim because the frame and
  the two open bullets are one paragraph-group.

### Handoff (belongs in a doc outside my list)
- → `crafting.md` (or wherever `WashController` is documented) — the
  precedent, for whoever compacts room-condition or writes up crafting:
  `wash` (`packages/server/src/mud/platform/idea/cmd/crafting/WashController.ts`)
  already implements "water is a precondition on the room, not a
  consumable on the act" — it requires a reachable bulk holder whose
  matter is water and consumes none of it. Not inserted into
  watershed.md because the decision belongs to crafting, not the
  watershed subsystem.
- → `weather.md` — open question 2, verbatim: *"Does rain wet things
  other than soil? `Wet.ts` and puddles ship; whether an uncovered item
  left outside gets wet is a separate (and cheap) edge. Lean: yes, and
  it is a nice legibility win for `SkyExposed`."* Found already SHIPPED:
  `lib/wetness/Wet.ts` (`WetMixin`) is a cross-cutting per-object
  wetness gauge on any physical `Thing` (cloak, firewood, a body),
  source-indifferent (rain, procgen, authored feed the same number),
  reconcile-on-read drain with async weather-push accrual, banded
  `dry`/`damp`/`wet`/`soaked`. Shipped as "weather Wave 2" — a build
  independent of the water pack. Not inserted into watershed.md because
  the mechanism and its doc home are weather's, not watershed's.

### Status block
- Left: *open question 2 · open question 3 · Part 1's declined-billing
  record* → *the bathroom's modelled function (`bathe`) · "running
  water" as a residence-ladder rung feature*
- Size: a tail → a tail (unchanged; smaller remainder, same shape —
  both remaining items are waits on other packs, not new design here)

---

## `docs/slates/builds/supply-design-pack.md` — 324 → 86 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Older narrative status block (lines 11–28, the "design,
  planner-ready… PARTLY SHIPPED 2026-09-02" paragraph) — second status
  block per the pilot calibration; the canonical one is kept and
  re-stamped.
- `## Part 0 — What a "source" is today` (12 lines) — the baseline
  table's own "rain → nothing; unconnected" row is now false (W1
  shipped); superseded wholesale by watershed.md's *Where the code
  lives* table and the rain edge.
- `## Part 1 — The finding: two physics, one supply question`
  (23 lines) — code: `lib/supply/SupplyState.ts` shares only the
  vocabulary, never the mixin; doc: watershed.md § *`SupplyState`'s
  second speaker* — "Only the VOCABULARY is shared… `ManaPoweredMixin`
  deliberately does NOT implement `SupplyReporting`."
- `## Part 2 — The five axes, and the three nobody models` (13 lines,
  table + 2 lines) — every axis the table calls unmodelled now ships:
  **Depth** (finite-regenerating) → `StorageNode`, doc § *Storage and
  control (W6)*; **Gate** (switchable/seasonal/conditional) →
  `ControlStructure`'s `passFraction`/`divertsTo` + `SwitchableMixin`
  on `Conduit`, doc § W5/W6; **Dependency** (fed-by-upstream) →
  `Conduit.resolveHead()` + the withdrawal/outfall scan, doc § W5/W6;
  **Rivalry** → Rights (W7), see next cut. **Yield** (unify refused)
  matches Part 1's refusal, already cut above.
- `## Part 3 — The missing axis is RIVALRY` (29 lines) — SUPERSEDED by
  a more general shipped mechanism: not a generic shared-source object
  with a LEASE/QUOTA choice, but the water-**rights** substrate (prior
  appropriation + riparian, a volume-per-window plus a priority date)
  with the quota keyed on the *right* — doc § *Rights (W7)*, § *The
  quota rides the RIGHT, not the source*. The "aggregate, never report"
  principle this Part borrows from the household pack is the literal
  design of `quotaRemainingM3(right, drawn)` (pure over two arguments,
  consults no register). The `⚠ apply the recurring-charge call first`
  guard matches doc § *What this build deliberately did NOT do* —
  *"Domestic metering. The mains stay effectively unlimited… rivalry
  lives at agricultural and industrial scale."*
- `## Part 4 — The load-bearing mechanism: cache the IDENTITY, derive
  the STATE` (55 lines, including the "unresolved ref must read UNKNOWN
  never ZERO" subsection) — code: `lib/husbandry/Soil.ts`
  (`resolveWatershedRef`, `rainClockStamp`, `_rainResolved`); doc:
  watershed.md § *Rain reaches soil (W1)* → *The unresolved ref, and why
  it has its own checkpoint* — same three-part discipline, same
  three-states-not-two rule, verbatim in substance.
- Rain paragraph of `## Part 6 — The two instances` (7 lines) — doc:
  watershed.md § *Rain reaches soil (W1)*, identical mechanism
  (`weatherAt` × `getLandRequirementM2()`).
- `## Part 7 — Designed to the format` (39 lines) — every surfaces-table
  row now has a shipped answer (supply ref+checkpoint = W1; closed
  failure vocabulary = W5/W8; rivalry/quota = Rights W7, different
  shape, see above; regenerating source = `StorageNode` W6; `analyze
  <source>` = shipped, kept in Part 5 below; unified mixin = refused,
  cut above). Its "MIXIN + VOCABULARY, NO NEW API" placement decision is
  confirmed by the code (`grep` finds no `SupplyApi` anywhere) and its
  *why* (the layer spans bulk, electricity and now mana) is the same
  reasoning watershed.md § *`SupplyState`'s second speaker* already
  gives — no new insert needed, cut with that pointer.
- `## Part 8 — Dangers` (19 lines, all four items) — #1 restates Part
  1's refusal (cut above); #2 restates the domestic-metering decline
  (cut above); #3 (the silent unresolved ref) is watershed.md's own
  highest-risk item, documented at length in § *The unresolved ref…*;
  #4 (quota as a grief surface, "per-window not first-come") matches
  doc § *Rights (W7) → Allocation* — filed rights sort by priority date
  and serve in full until exhausted, which is per-window and
  priority-ordered, not first-come.
- Open question 1 (where does the supply layer live — ✅ already
  decided in-slate) — confirmed by the code (no `SupplyApi` exists).
- Open question 3 (is rain's source the locality or the sky? Lean:
  locality now) — shipped exactly as leaned: `_rainLocalityPath` caches
  the locality's template path (`lib/husbandry/Soil.ts`).
- Open question 5 (does a source know its drawers? Lean: aggregate,
  never report) — shipped exactly as leaned, see Part 3's cut above.

### Kept (UNBUILT)
- `## Part 5 — The uniform experience: two acts, one read, six
  failures` — kept whole. The **Draw** act, the **one read**
  (`analyze <source>`, shipped as `analyze water`/`analyze power`) and
  the **six-word failure vocabulary** are all shipped and documented
  elsewhere in watershed.md (§ W1/W5/W8) — but the **Connect** act
  (`plug`/`unplug`, binding a consumer to a source) has no code
  anywhere (`grep` for `plug`/`unplug` across the kernel and content
  finds nothing) and still rides the fridge pack. Kept whole rather
  than surgically trimming the table, per the paragraph-granularity
  rule.
- Power paragraph of `## Part 6` — kept. Unlike rain, no `Energized`
  fixture in the tree yet declares an upstream `SupplyReporting` ref;
  `analyze power` (the water pack's `AnalyzePowerController`) reads
  `generationW`/`availablePowerW` **duck-typed**, waiting for such a
  consumer, but none is composed yet for household electricity — the
  literal "substation, socket" content is still the power-utility
  slate's job. (Mana/TPA has adopted the shared vocabulary — doc § *
  `SupplyState`'s second speaker* — which is evidence the
  generalization works, but that is not the electricity case this
  paragraph describes.)
- Open question 4 (`conjure-water` — lean: out of scope, a
  magic-economy question) — kept verbatim; nothing in the water build
  touched it, and it is not clearly this pack's decision to make.

### Uncertain — kept
- None beyond the item above; it is kept as UNBUILT rather than listed
  here because the lean is unfalsified, not contradicted.

### Handoff (belongs in a doc outside my list)
- None. The one item that touches another pack (Connect/`plug`/`unplug`
  → the fridge pack) is a dependency, not a decision to graduate
  anywhere — nothing has shipped for it yet.

### Note — a lean the code contradicted (logged per the skill's
"statement proven false" rule, no doc edit needed since watershed.md
already documents the shipped behaviour correctly)
- Open question 2 asked *"does the cached ref persist, or re-resolve
  per boot?"* and leaned **transient, re-resolved**. The shipped code
  does the opposite: `rainClockStamp`, `_rainLocalityPath`,
  `_rainSkyExposed` and `_rainResolved` are all `{ persistent: true }`
  (`lib/husbandry/Soil.ts:288-291`) — the ref is cached durably across
  restarts, with the backlog-safe checkpoint handling staleness rather
  than a fresh per-boot walk. Cut (the question is answered, just not
  as leaned); watershed.md's own account needs no correction since it
  never repeated the lean.

### Status block
- Left: *the unified source model over tap/well/standpipe/rain · the
  rivalry axis (household commons) · the power half — substation,
  socket, one shared `supplyReport` read* → *the Connect act
  (`plug`/`unplug`, rides the fridge pack) · the power/electricity
  instance of the supply layer (waits on the power-utility slate) ·
  whether `conjure-water` should answer to any of this*. Note the old
  first item ("unified source model") was already stale on arrival —
  Part 1 had *already refused* that unification; it was never actually
  Left.
- Size: a build → a tail (nearly everything designed here shipped or
  rides another pack's build; nothing remaining is this pack's own
  cycle of work)

---

---

## Coordinator (2026-09-20) — handoffs applied

- `weather.md` — no insert: its header already names the cross-cutting
  wetness substrate as Wave 2 (l.10-12).
- `crafting.md § wash` — the *precondition, not a consumable* paragraph
  inserted after the keyword-vs-identity note.
