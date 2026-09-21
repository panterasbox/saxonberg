# Slate-compaction pass — unlinked-1 batch ledger

Seven slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-1/orig/` for diffing.
`fishing-slate.md` was excluded from this batch (a fishing build is in
flight in another worktree).

Batch-wide findings first:

- **These slates are mostly what their stamps say — unbuilt design.** The
  verification found substrate that shipped *beside* a slate rather than
  *from* it: the age DATE under lineage (`OrganismMixin.bornAt`, the pets /
  farmstead builds), and the September statics sweep under
  value-object-statics. Both are recorded per slate below.
- **The OO sweep renamed the seams several slates cite.**
  `TraitApi.seedClaims` → `host.seedTraitClaims`
  (`lib/trait/Dispositioned.ts:377`), `ChronicleApi.seedClaims` →
  `avatar.seedChronicleClaims` (`lib/character/Persona.ts:323`),
  `TraitApi.regardBaseline` → `regardBaselineToward`. The mechanisms are
  unchanged; the names in kept UNBUILT text are stale. Listed under
  *Uncertain* where they occur, never rewritten.

---

## docs/slates/builds/lineage-slate.md — 1708 → 1684 · Status UNBUILT → PARTIAL

Lineage is unbuilt: `EnrollController.FIELDS` still holds exactly
`species · sex · name · pronouns · aspiration`
(`platform/idea/cmd/charactergen/EnrollController.ts:235-395`);
`CharGenFieldKind` is still `'choose-one' | 'text'`
(`packages/types/src/index.ts:3418`); no `gallery` / `household` / person
record anywhere under `packages/server/src/mud` or `packages/content/*/src`;
no eye / hair / skin on a character; `char-gen.md § Forward compatibility`
says lineage *does not exist*. The one thing the tree contradicts is the
**aging** section: `refactor(race): age is a DATE` (`730ed7128`) replaced
the inert `age` counter with `bornAt` (`lib/species/Organism.ts:148`),
`getAgeDays()` derived on read, `getLifeStage()` `null` for a played body,
and `enroll confirm` stamps `overlay.bornAt` (`EnrollController.ts:709`).
Three cuts.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design proposed, nothing built… Decided in this pass… Companion: blood-slate"* (11–22, 12) — history; its three decisions (no hybrids · same-species parents · the three sinks) are all still sections in the body, and the blood-slate pointer is in *Cross-references*
- `### ⚠⚠ Do not let lifespan bound the player` body (1167–1182, 16) — code: `Organism.ts:71-75` (`getLifeStage()` *always `null` for a body somebody plays — a player's age is seniority and must never be an input to a capability*), `reconcileSenescence` *non-sentient animals only*; doc: `race.md § Age is a DATE` (the player / NPC / livestock table: player → *nothing, ever*; NPC → *never death*). Heading + pointer left. The slate's **why** (lifespan as the most rankable stat — 750 vs 120 years of play has no countervailing cost) is not the doc's why (nothing to farm) → Handoff below

### Superseded — cut
- `### The slot exists and is inert` body (1142–1151, 10) — by the code: there is no `age: number` slot any more; age is `now − bornAt`, derived, and char-gen already sets it → `race.md § OrganismMixin — runtime biology`, `§ Age is a DATE`. Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · `## The gap` (still exactly true: five declared fields, `aspiration` produces `claimSeeds` + `bioSeed` and nothing else)
- `## The gallery` and every subsection: the person record as a `Document` (nothing at any document kind — `DocumentKinds` has no person / household), the consistency rule, the form rendered two ways, *say what the PARENTS are*, the typed hook + its two columns + *inherited as REGARD*, comparable-means-optimizable, the balance mechanism + `both gone` + liquidity, the two generation constraints, truth vs belief, `### Controls` (the pin, the sort, the surviving controls, species pinnable), `### Reroll is priced` (the disconnect reset, the escalating price, unpinnable cells, `Means` never finances the shuffle)
- `## ⭐ One budget, three sinks` — body composition (`Creature.getMass()` is one number; no fat/muscle/bone split anywhere), *the world already charges*, faculty (`Species.facultyProfile` exists, `Species.ts:455`; no player-side allocation), capital (`bank_supply` collection exists; no conversion table)
- `## Species — decision A: no hybrids` + `### Why blending was rejected` + `### The decision` — `semieldarinus.yaml` / `semiorcus.yaml` are still shipped rows under `packages/content/species-and-names/…/homo/`, and nothing stores a parent species
- `### ⭐⭐⭐ Adoption` and all seven subsections (no role flags, no birth/raising split anywhere)
- `### ⚠ Traits from lineage are upbringing, not genes` + circumstance-not-trade + `#### What adopting a household actually WRITES` + the advancement seeder + `##### The when on a seeded claim` + the valence dial — see Uncertain for the stale names; the transcript seeder is still missing (`lib/advancement/`: only a test writes `kind: "claim"`); the `when` fix is still not built (`ClaimSeed` at `Dispositioned.ts:64` has no `when`; `buildAndSave` at :153 defaults `when` to the clock for every kind; `Behaved._seedDispositions` at `lib/behavior/Behaved.ts:183` still skips when any claim row exists)
- `### The migration` (the hybrid rows are still listed — see Uncertain for the *insert-only seeder* clause)
- `## Age, aging, and healthspan` intro · `### The birthday` (the date exists; the *occasion* — chronicle beat, *your mother sent word* — does not; the clock-scale caveat is Q7) · `### ⭐⭐ Healthspan, not lifespan` (see Uncertain) · `### The longevity industry — noted, not designed`
- `## Friction — check the funnel first` (`Login.mintRandomGuestAvatar` at `Login.ts:232` — accurate)
- `## ⭐⭐ Build phasing` and every subsection — *Two facts that set the estimate* verified (no appearance model; `CharGenFieldKind` two-valued; `CharGenOption` flat) · Phase 1 · the phase-1 card · `Place` does not set spawn (see Uncertain) · what does not make phase 1 (no `Patron` object — `alignment-slate` unbuilt; 23 non-magic Disciplines not re-counted) · the five fields · appearance describable-never-selectable (`MQL_PREDICATES` closed — accurate) · inherited-only + the dial · no production chain · Phase 2 · the three seams · the copy guardrail · what phase 1 does not prove
- `## Open questions` 1–22 — all still open. Q17 is marked ✅ but is resolved by the slate's own § *Controls*, not by code or a doc, so it stays (nothing to point at)
- `## What this slate does NOT cover` · `## Cross-references` (every linked slate exists at the linked path)

### Doctrine — kept, labelled
- `## ⭐⭐ The story char-gen tells: your majority day` — the fiction char-gen should tell; not a backlog item
- `## ⭐ The four kinds of value` — the *endowed* category and *endow what creates a relationship, never a ranking*; consumed by blood-slate too
- `#### ⭐⭐⭐ Where the game states its opinion on nature vs nurture` — *nature fixes what you ARE, nurture sets where you START, everything that decides what you DO is earned*; the slate itself says the mechanics *already fully implement* the position, which is a claim about shipped design, not a build item. A candidate for `docs/design-philosophy.md` or `race.md § Why`

### Uncertain — kept
- `### ⭐⭐ Healthspan, not lifespan` (1183–1208) — proposes *aging is real and brings decline* for a player character (the age curve, non-terminal). `race.md § Age is a DATE` decided the opposite for players: *we do not model a player character's biological arc*; `getLifeStage()` is `null` for any played body, so no decline either. The **never-terminal** half is shipped; the **decline + longevity-restores-vigor** half now contradicts the shipped decision. Requirements must reconcile before the longevity industry is designed on it; `### The longevity industry` is contingent on the same premise
- `#### ⚠⚠ What adopting a household actually WRITES` table (1027–1044) — names `ChronicleApi.seedClaims` / `EnrollController:753` / `TraitApi.seedClaims`; the OO sweep moved these onto the hosts (`avatar.seedChronicleClaims` at `EnrollController.ts:764`, `host.seedTraitClaims` at `Behaved.ts:189`). Mechanism unchanged, names stale. Same for `TraitApi.regardBaseline` in the phase-1 card table (1331) → `regardBaselineToward`
- `### The migration` (1121–1131) — *"the seeder is insert-only — editing the rows does nothing"* predates the pack installer, which reconciles by `sourcePack` stamp (`content-packs.md § The installer`). *Unlist before you delete* is still the right order; the premise for it is stale
- `#### ⚠ Place does NOT set where you spawn` (1343–1350) — *"everyone spawns in the lounge, always"*: the spawn is now the `defaultStartLocation` app setting (`EnrollController.ts:683`) and `residence.md` gives a first home; the conclusion (the cell is descriptive, not mechanical) still holds
- `### ⭐ Say what the PARENTS are` (266) — *"17 disposition axes"*; `trait.md:31` counts **19** opposed pairs
- `### The slot exists and is inert` also cited `Species.lifespanMin/Max` (still present, `Species.ts:371`) and *"vitals.md reserves room for a later age-curve"* — the curve now exists as `Species.ageCurve` (`Species.ts:402`) with `senescentAt`, for NPCs and livestock only
- Overlaps for the cluster pass: the endowed category ↔ `blood-slate`; the antecedents budget ↔ `antecedents-slate`; equilibrium vs expressed ↔ `trait-slate`; the trade roster / `Places` column direction (Q11) ↔ `trade-roster-slate`; cosmetics' production chain ↔ `cosmetics-slate`; the hybrid rows ↔ `species-expansion-slate`

### Handoff (belongs in a doc outside my list)
- → `race.md § ⭐⭐ Age is a DATE, and what it confers is the whole design` (as a second *why* under the player row of the table), verbatim from the cut section:

  > **If aging is real *and* terminal, lifespan becomes the most rankable
  > stat in the game.**

  An elf gets 750 years of play; a human gets 120. Single scale, strictly
  ordered, and **no countervailing cost can exist** — you cannot make "more
  playtime" incomparable with "less playtime." It would be the cleanest
  violation of the [species slate](./species-slate.md)'s doctrine anywhere
  in the design.

  **So lifespan describes the world, not the player.** Keep it for NPC
  generations, family trees, and *elves remember the founding*. Never put a
  clock on a player character.

### Status block
- Status: UNBUILT → PARTIAL (the age date shipped; the status line says so and points at race.md)
- Left: *person + household records · a `kind: 'gallery'` field + row payload · the gallery UI (grid/detail/reroll/lock) · endowed appearance that actually renders · surname inheritance · the adopt/commit path · phase 2's real procgen* → *person + household records · a `kind: 'gallery'` field + row payload · the gallery UI (grid / detail / pin / reroll) · the typed hook vocabulary + the balance weights · the pin-cost curve + the reroll priced against the allotment · the one budget's three sinks (body composition · faculty · counter-cyclical capital) · adoption (the per-slot role flags) · the seeding surface (`AdvancementApi.seedClaims` band synthesizer + the `when`-by-kind fix) · unlisting the two hybrid rows · endowed appearance that actually renders · surname inheritance · the adopt/commit path as a seeder list · the birthday occasion · phase 2's generator (pair plausibility, the locality→trade join)* (the body wins: the balance, pin, budget, adoption, seeding and hybrid sections were unrepresented)
- Size: a build → a build

---

## docs/slates/builds/insurance-slate.md — 1234 → 1241 · Status UNBUILT → UNBUILT

Two design conversations in one file (insurance; banking-as-vocation +
ratings + accountant + notary + innkeeper + vet + ostler + almanac). All
of it is unbuilt: `insur` under `packages/server/src/mud` hits only a
`security.ts` comment; no `underwrit` / `actuar` / `notary` /
`scrivener` / `veterinar` / `almanac` anywhere in code or content; the
only `reserve ratio` is combat `Tempo.ts`'s endurance ratio; `banking.md:34-36`
says `credit` *"belongs to the deferred lending subsystem"* and `:579`
lists lending / fractional reserve / deposit insurance as deferred; no
`Loan` / `CreditLine` class; `pets.md` and `ranching.md` have no vet;
`logistics.md` / `conveyance.md` have no posting stable or inn. The
substrate the slate cites as shipped is shipped: `central-bank-governor`
is one of the five `OFFICE_APPARATUS` seats (`governance.md:88`); the
onboarding stipend is a CB mint categorised `onboarding`
(`EnrollController.ts:784`, `LedgerEntry.ts:82`); `CelestialApi` ships;
weather is stateless-procedural (`weather.md`). One cut. The file grew by
seven lines because `Left` grew.

### Cut (SHIPPED · DOCUMENTED)
- `### ⭐ The verdict: conditional` → the *"CONDITION DESIGNED (2026-07-31) → npc-behavior-slate § NPC schedules… the schedule turns out to already exist: it is the employment SHIFT ROSTER… Condition met"* blockquote (932–942, 11) — code: `lib/behavior/Behaved.ts` `shifts` brain over `EmploymentApi.shiftStateOf`; doc: `behavior.md:456-462` § *The roster is the schedule, and that makes opening hours a business strategy* (*"There is no NPC scheduling system and none is planned: a shop is closed at night because nobody is rostered"*), `time.md § Why 12×`. Replaced by a one-line *CONDITION MET — shipped* pointer; the verdict's two bullets and the innkeeper design stay

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraphs · *Related*
- `## The precondition` + correlation · `## Adverse selection` · `## A policy is the first contract that is NOT fully escrowed` (no reserve-ratio `parameter`, no policy contract kind — `contract.md` clauses are escrowed) · `## Build cargo first` + crop insurance · `## Mutual vs. stock` · `## Insurance prices prevention` · `## The state's ladder` · `## Vocations` (both) · `## What insurance actually is in a simulated economy` and its five subsections · `## Open questions (for requirements)` 1–6, all open
- `# Banking as a vocation, credit, and ratings` — every section: the cut (menu vs vocation), the rule, maturity transformation → the bank run (the CB governor seat exists; lender of last resort does not — `governance.md:237` gives it only `requiresGovernor`), *"May banks create money?"* as a bill, the bootstrap ladder + the welfare correction, ratings agencies own a METHOD, the mortgage-crisis trap, chartering, a fifth kind of market power, vocations
- `## The ratings agency as a business` — all nine subsections
- `## The accountant (and the auditor) as a business` — all eight subsections
- `## The notary — the register's first honest NO` — all six subsections (the rejection stands; the scrivener is unbuilt; `legal-code-slate` still unbuilt)
- `## The innkeeper — CONDITIONAL` — all seven subsections except the cut blockquote; the bed-as-logout-location table (nothing at `logoutLocation`; `presence-hollowing-slate` exists), the liability / weather / posting-inn / guest-register products, the rungs
- `## The veterinarian` — all six subsections · `## The ostler` — all six · `## The almanac-maker` — all six (the `CelestialApi ships` clause is accurate; nothing publishes an almanac)

### Doctrine — kept, labelled (⚠ every one already has a home in `vocations.md`)
- `## ⭐⭐⭐⭐⭐ The rule the whole register has been circling` — *if both sides know the same things build a MENU; if one side knows more build a VOCATION* → already at `vocations.md:454`
- `### ⭐⭐⭐⭐⭐ Which is the general anti-corruption mechanism in this economy` — *the record does not prevent misconduct, it makes it DISCOVERABLE* (three subsystems, one mechanism)
- `### ⭐⭐⭐⭐⭐ Audit has the IDENTICAL disease to ratings — which generalizes` — *any assessment paid for by the assessed has ONE conflict and TWO remedies* → already at `vocations.md:481-484`
- `### ⚠ The objection that killed the first draft` — *NEVER INVENT A NEED TO CREATE A MARKET* → already at `vocations.md:32`
- `### ⭐⭐⭐⭐ The disposal technique this yields` — *DECOMPOSE, never accept or reject wholesale* → already at `vocations.md:94-103`
- `### ⭐⭐ It passes — but only at the top rung` → *most vocations are LADDERS where only the upper rungs qualify* → already at `vocations.md:31`
- `### ⭐⭐⭐ And therefore: insurance is a GAUGE, not a lever` — *you balance the WORLD and insurance reports it*; no home yet
- These are embedded as argument paragraphs inside unbuilt vocation sections, so they were not cut at paragraph level here; the coordinator can cut the five that `vocations.md` already carries in one pass with a pointer each

### Uncertain — kept
- none contradicted by code. Overlaps for the cluster pass: the pawnshop as credit bootstrap ↔ `sanitation-slate`; the fire service ↔ `fire-combustion-slate`; the posting stable / road capacity ↔ `logistics-slate` (the cost surface, a vehicle is a room that moves); the vet's livestock/companion split ↔ `ranching-slate` / `pets-slate` (pets shipped — `pets.md` — without a vet); the almanac's planting window ↔ `farming-slate`; full faith and credit ↔ `amendment-library-slate`; the guest register ↔ `policing-slate`'s camera-vs-witness axis; `memory/credit-slate` (*the NPC executes a RULE*) is a sibling design not linked from here

### Handoff
- none

### Status block
- Status line: added the code-verified *nothing exists* clause and the condition-met pointer
- Left: *the policy-as-contract + reserve ratio · cargo underwriting · the mutual · the credit vocation · the ratings agency · the accountant · the notary/scrivener · innkeeper · veterinarian · ostler · almanac-maker* → *the policy-as-contract + reserve ratio · cargo underwriting first (fire and crops after) · the mutual as the guild's instrument · prevention priced into the premium · the state's ladder · the credit vocation + the bootstrap ladder (pawn → microloan → unsecured) · the bank run + the lender of last resort (the `central-bank-governor`'s job) · the fractional-reserve bill · the ratings agency (method, not data; publish-if-commissioned) · the accountant + the auditor + the forensic accountant · the scrivener (the notary is rejected) + ceremony as friction on irreversible acts · the innkeeper (the bed as a logout location · liability · the posting inn · the guest register) · the veterinarian (+ the meat inspector, quarantine that closes the roads) · the ostler + the posting stable + the return inspection · the almanac-maker (celestial / weather split, predictability decays with horizon)* (the body wins: the bank run, the bill, the bootstrap ladder, the auditor, the inn's products and the vet's public face were unrepresented)
- Size: a build → a build (⚠ honestly several — insurance, credit, and the five vocations are separable cycles; the split is the cluster pass's call)

---

## docs/slates/builds/value-object-statics-slate.md — 1053 → 229 · Status PARTIAL (stale) → PARTIAL

A refactor slate that had become the build journal of `build/lib-statics`,
merged 2026-09-14 (`c8c4d5056`; sweep `708d805f4`; gates `5e97cb147`).
The status block still described a session that has since happened
(*"scoped for the next session"*, *ceiling 462/464*, *the real remainder
is 123*). **Census re-verified:** `pnpm -C packages/server
lint:lib-statics` → *337 public statics on non-Api classes (ceiling 337);
175 declared @internal* — `LIB_STATICS_CEILING = 337`
(`scripts/check-lib-statics.ts:94`). Every number the slate states (461
→ 535 → 564 → 563 → 464 → 433 → 392 → 387 → 372 → 343) is history;
`antipatterns.md:4936-4937` carries the honest pair (563 → 337).
⚠ `lint-family.md:141` still says **ceiling 564** — stale, outside my
list, flagged. ⚠ `boundary.md:59` still says minting lives on
`Lock.mintKeyway()`; the code is `BoundaryApi.mintKeyway`
(`api/boundary.ts:123` → `BoundaryLogic.ts:71`; `Lock.mintKeyway` at
`lib/lock/Lock.ts:56` is the `@internal` body) — stale, flagged.

Artefacts verified: `lib/persistence/WarmedIndex.ts`, `lib/Seeded.ts`,
`lib/Decay.ts`, `lib/craft/CraftingDecline.ts` (the cross-controller
helper, resolved as vocabulary), `AccessLogic.isAgentOf` (`:137`,
deduped from `isBuildingAgent`/`isDormsAgent`), `BankingApi.compactCurrency`
(`EnrollController.ts:784`), `VisionModality.canSee` now an **instance**
method (`:145`), `lint:binder-models` (`package.json:69`,
`lint-family.md:197`), `trait.md:12` (*the Api OO sweep retired
`TraitApi`*). Still static and unruled: `GroundCharacter.forZone` /
`resolve` (`packages/content/trade-farming/src/idea/GroundCharacter.ts:202,233`),
`OuterWarren.conditionOf`/`admitFor` (`lib/location/OuterWarren.ts:355,383`),
`HoldingWarren.entryRowOf` (`residence/src/idea/HoldingWarren.ts:193`),
`Login.generateGuestName` (`Login.ts:200`); `readInt` in 5 files,
`linearToDb` in 2, `scoreEvents` in 3.

### Cut (SHIPPED · DOCUMENTED)
- `## The ruling` (29–43, 15) — doc: `antipatterns.md § A public static on a lib value class` (the two surfaces, *construction is an Api concern*, verbatim)
- `## The mechanism that makes it bite` (45–60, 16) — code: `scripts/project-author-surface.ts` now emits `value-static` + an unclassified report; doc: `antipatterns.md` (the snippet, verbatim), `lint-family.md § lint:lib-statics`
- `## ⚠⚠ The census — bigger, and more interesting, than "some factories"` + `### The worst offenders, by static count` (62–102, 41) — history; the shape table was superseded by the ladder (*shape is the second question*); doc: `antipatterns.md:4936` (563/159 → 337)
- `## Waves` (104–153, 50) — W0 (the gate) + W1 (the projection) shipped: `lint-family.md § lint:lib-statics` (scope incl. `platform/` = D2, the mixin-factory exclusion = D4); W2–W4 superseded by the ladder. The `Mml` finding (D1) is UNDOCUMENTED → Handoff
- `## Decisions made during the build` (155–162, 8) — D2/D4 `lint-family.md`; D3 `lint-family.md § Three ways a census lies` (*a ratchet whose own test pins the number*); D1 → Handoff
- `## The worked example (merged in !255)` (179–194, 16) — doc: `presentation.md` (`GrammarApi.phrase`), `antipatterns.md` (the before/after)
- `## ⚠ And run `pnpm lint`` (196–202, 7) — doc: `antipatterns.md` (*lint:family will not catch the related export smell*)
- `## ⚠ The call-site count was wrong by 4.1×` (254–264, 12) — history; the class of error is `lint-family.md § Three ways a census lies` #1
- `## What the ladder actually yielded` → the *"Rung 2 was sold as 153… It was 31"* intro (268–271) + *"The real shape: 464 of 563…"* + the rung 2 / rung 3 bullets (285–298) (19) — history; the two doctrine paragraphs KEPT (below)
- `## ⭐⭐⭐ Therefore: not one of the 18 "homeless" subsystems needs an Api` body (302–319, 18) — executed: no Api minted; `trait.md:12` retired `TraitApi`; `Lock` → `BoundaryApi.mintKeyway`. Heading + note left
- `## Order of work` (321–332, 12) — done
- `## ⚠⚠ What the ratchet is actually counting now` body (370–389, 20) — the *123 target* was overtaken; the ceiling is 337 and `lint-family.md § lint:lib-statics` states its job. Heading + note left
- `# The 123, one family at a time` table + intro (393–407, 15) — each verdict is written at its site: `bulk.md` (payload accessors), `TemplateApi` docstring (finders), `lib/craft/CraftingDecline.ts` + `AccessLogic.isAgentOf` (the cross-controller helpers, now resolved), `VisionModality.canSee` instance. ⚠ The `Lock` row was later reversed — noted in the pointer. `## The conclusion, stated plainly` (409–425, 17) — history. `## What is genuinely left` (427–435, 9) — all three items moved or resolved (pointer names where)
- `# ⭐⭐⭐ The remaining scope — written to survive a compaction` intro (439–452, 14) — *census 433* stale; the ruled-off categories are `antipatterns.md`'s. `### 1 · Known pattern, no decision needed (≈11)` (456–467, 12) — executed (§A/§B); ⚠ the `TravelNodes.of` *~129 call sites* warning was a bad grep (sweep commit `708d805f4`: zero, counted the TYPE). `### 4 · The 36 vocabulary guards` (485–490, 6) — audited, nothing moved. `## ⭐ Recommended order: the HARD ones first` (492–516, 25) — advice for the session that ran; its five structural facts are in Uncertain
- `# ⭐⭐⭐ THE KILL LIST — ruled 2026-09-14, execute after the compaction` + `## A · Delete and inline — 0 or 1 caller (40)` + `## B · Move to the owning Api (19)` + `## Order of execution` (518–633, 116) — executed in full (§A DONE all 40; §B COMPLETE). Heading + the surviving ruling left
- `# ⭐ PROGRESS — read this before the kill list above` (635–639) + `## § A — DONE (all 40 rows)` (641–663, 23) + `## § B — 1 of 19 done` (665–683, 19) + `## ✅ §B COMPLETE (2026-09-14) — 12 moved, 1 corrected, 1 deferred` table (685–702, 18) + `### ⭐⭐ The pattern: the Api gets the DOOR` (704–715, → Handoff) + `### ⭐⭐⭐ lint:object-verbs overruled two rows, and it was right` (717–729, 13 — the gauge shape is `antipatterns.md § A subject-first Api static`) + `### Construction.registerFabric — @internal, and deliberately no door` (731–737, → Handoff) + `### Lock.mintKeyway — re-decided, with the line written down` (739–745, → Handoff; code: `api/boundary.ts:123`) + `### ⚠⚠ The cycle this cost — read before adding an Api import to lib/` (747–759, 13 — `antipatterns.md` carries it verbatim) + `### ⏸ DialogueEffectRegistry.register — deferred, and why` + the *13 remained* table (761–783, 23 — ruled in the registry cluster: `@internal`, no door) (≈150) — journal of shipped work. Heading + summary note left. The three §A rules, the door pattern, `registerFabric`'s no-door ruling and the `Lock` line → Handoff
- `## ✅ The registry/cache cluster — RULED AND BUILT` body + `### ⭐⭐ The two findings that decided group A` + `### What shipped: lib/persistence/WarmedIndex.ts` + `### ⛔ Why NOT the mixin / base-class shape` + `### The two that do NOT fit, and why it is written at their site` + `### Groups B, C, D` (785–885, 101) — code: `WarmedIndex.ts`; doc: `architecture.md:167-170` (storage not warm), `banking.md:452` (the `_cache`/`_currencyCache` merge), `renown.md:76`. The *cannot live on `XLogic`* finding (finding 2) is on the class (`WarmedIndex.ts:43-45`) but in no doc → Handoff. *Why NOT the mixin shape* is a road not taken, recorded; the two that do not fit are *written at their site*; groups B/C/D are in the pointer
- `## ✅ The 36 vocabulary guards — AUDITED` body + `### The 18 that earn the carve-out` + `### ⚠ The 15 were never vocabulary guards — they were in §4 by a NAMING accident` + `### ⛔⛔ The three defects — a predicate that promises a check it does not make` (887–960, 74) — the three defective predicates (`Construction.isForm`, `Techniques.isTechniqueName`, `Disposition.isAxis`) fixed in code; the by-name error is `lint-family.md § Three ways a census lies` #1; the 18 real predicates stay by the kill-list ruling
- `## ✅ The formula dedupes` table (962–986, 25) — doc: `architecture.md:160-164` (`Seeded`, `Decay`)
- `### ⚠⚠ And the regression it surfaced — a THIRD binder victim` (1010–1021, 12) + `## ⚠ Controller tests skip the BINDER` (1023–1030, 8) — code: `scripts/check-binder-models.ts`; doc: `lint-family.md:197 § lint:binder-models`, `testing.md`. One-line pointer left
- `## ✅ The content-pack exposure gap — CLOSED` body (1034–1053, 20) — doc: `content-packs.md`, `mixins.md` (the federated namespace). Heading + pointer left

### Superseded — cut
- `## ⚠ Homes that do not exist yet` (164–177, 14) — by the slate's own later ruling (*not one of the 18 homeless subsystems needs an Api*) and by the OO sweep retiring `TraitApi`. Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · *Raised by* / *Census* / the invariant quote · `## Cross-references`
- `### 2 · Needs a decision first (≈20)` — the table is one paragraph; four of its five rows are now resolved (see Uncertain) but `OuterWarren.conditionOf`/`admitFor`, `HoldingWarren.entryRowOf` and `Login.generateGuestName` are still public statics with no ruling
- `### 3 · Misclassified` — `GroundCharacter.resolve` still open (the other three were handled in §A)
- `### ⚠ What was deliberately NOT deduplicated` — the rule (*duplication matters when the definition could change*) + the three open items: `readInt` → `AppApi.settingInt`, the `linearToDb` rename, `scoreEvents`

### Doctrine — kept, labelled (⚠ `antipatterns.md:4941` says *"See the slate for the ladder"* — these are what it points at)
- `# ⭐⭐⭐ The disposition ladder` intro + `## The ladder, first match wins` (the table, *statics are INHERITED so call sites use the SUBCLASS name*, rung 0 + the reflective set `fieldMeta · subscribableFields · markupAugmenters · cleanupOnDestruct · captureSlice · restoreSlice · settings`)
- `## What the ladder actually yielded` → *"Only tests call it" is not "internal"* + *an unused factory is not an unwanted one — run the ladder in order*
- `# Rung 4` intro + `## The three irreducible shapes` (type-predicate narrowing · framework-reflective contract · polymorphic `this`) + `## And a fourth: a record class's finders belong to the record class`
- Recommended home: `antipatterns.md § A public static on a lib value class`, replacing its *"See the slate for the ladder"* clause. Once inserted, these ~75 lines leave the slate and it is ABSORBED bar the `Left` items

### Uncertain — kept
- `### 2 · Needs a decision first` rows — resolved since it was written but kept as one paragraph: `NameBank.byKey` / `CreditRouting.resolve` / `LaneCatalogue.exitBetween` / `Census.takeCensus` (§A, `@internal`), `NameBank.resolve` → `SpeciesApi.resolveNamePools`; `DormWarren.resolve` deleted, `WikiRegistry.instance` / `Realtor.offers` (§A); `EnrollController.loadConfig` / `LeaseController.ascentRefusal` (§A); `Currency.compact` → `BankingApi.compactCurrency`, `ConcealmentLevels.hiddenDefault` / `Account.newId` / `Light.bandFor` (§A); `Freshness.nowSeconds` / `BankingControllerBase.businessNamed` (§A), `Appearance.currentGeneration` → `MagicApi.appearanceGeneration`, `Contamination.behaviorOf` → `MaterialApi.pathogenBehaviorOf`. The row's *"Lock.mintKeyway, which stayed"* is now false (it moved)
- `## ⭐ Recommended order` (cut) named five structural facts found by the hard cases — `Character`'s mixin stack at TypeScript's instantiation limit; `MakerMixin`/`CasterMixin` augment-gated; `BoundaryApi` in `lint:object-verbs`' exempt list as accommodation not permission; the affordance resolver's `pending-operand` check ignoring `default:`; `requires:` steering the scope chain. Not re-verified here; the first is memory `mixin-name-static-must-widen`, the last is `explicit-targeting-slate`'s subject. Flagged in case any lacks a doc home
- The title (*broken in 159 classes*) is the original claim, kept as spine

### Handoff (belongs in a doc outside my list)
- → `architecture.md § The Api ↔ logic-singleton split` (or `lint-family.md § lint:lib-statics`) — **D1, verbatim** from the cut `## Waves`:

  - ⭐⭐ **`Mml`'s 41 statics were invisible.** `isApiClass` keyed on the
    class *name* ending in `Api`. `Mml` (`mud/api/mml`) is an Api by every
    functional measure — `SecurityApi.decorateApiClass`'d like every other
    face, and `Mml.compose` / `Mml.actor` / `Mml.ref` are among the
    most-called author surface in the tree — but it is not spelled
    `MmlApi`, so all 41 reached no doc. The rule is now **where the class
    is declared** (`CLAUDE.md § Module Categories` admits nothing else into
    a top-level `api/<feature>.ts`), with sealed subdirs (`api/mml/**`,
    `api/mql/**`) explicitly excluded. *A convention enforced by spelling
    is a convention with a hole in it.*
- → `antipatterns.md § A public static on a lib value class` — **the three rules from § A**, verbatim:

  ⭐ **The rules that emerged, and they are not optional:**

  1. **`private` requires ZERO callers outside the declaring file.** A row
     with one external caller is `@internal`. Four misfires this build; the
     compiler caught every one.
  2. **A "0-caller" row is a `private`/`@internal` decision, never a
     deletion** — the count means *no caller outside the home file*, and
     same-file or test use is the norm.
  3. **Inlining that exports a private helper fails the rule** — it trades
     one static for a wider surface.
- → `antipatterns.md § A public static on a lib value class` — **the door pattern**, verbatim (`### ⭐⭐ The pattern: the Api gets the DOOR, the body stays with its privates`):

  Almost none of these bodies could move. Each sits on a module-private map
  or helper — `Construction`'s `FABRICS`, `BlendLabel`'s `ingredientsOf`,
  `BlendIdentity`'s `recipeOf`, `NameBank`'s `#cache` — and moving the body
  would have to **export** it. That is the §A rule verbatim: *inlining that
  exports a private helper fails the rule*.

  So the shape is: the `lib/` static becomes `@internal`, and the Api gets
  the callable door. ⭐ **The difference from §A's bare `@internal` is the
  door** — §A hid 32 statics with nothing put in their place; these are
  hidden *because* there is now somewhere visible to call.
- → `antipatterns.md` (same section) or `textiles.md` — **`Construction.registerFabric` — `@internal`, and deliberately no door**, verbatim:

  Its two callers are `Fabric.postRegister` and `FabricCatalogue.warm`: the
  textile subsystem populating its own vocabulary at boot. Putting
  `MaterialApi.registerFabric` in the generated docs would advertise a boot
  seam as author surface. ⭐ **The fix for an invisible callable is not
  always to make it callable by everyone.**
- → `boundary.md § locks & keys` (and fix `boundary.md:59`, which still says minting lives on `Lock.mintKeyway()`) — **the `Lock.mintKeyway` line**, verbatim:

  It moves to `BoundaryApi.mintKeyway`, and the line that puts it there is:
  **minting is an act on the world** (it reaches `SecurityApi.uuid`), so it
  is the Api's; **issuing is the lock answering about itself**, so
  `issueKeyTo` / `opensFor` stay instance methods. That is the whole reason
  one moved and the others did not.
- → `persistence.md` (beside `WarmedIndex`) or `architecture.md:167` — **why the index cannot live on the `XLogic` singleton**, verbatim:

  2. ⚠⚠ **The index cannot live on the `XLogic` singleton** — the
     obvious-looking home. A logic singleton is *stateless by construction*
     so `dest` can reload it, and the next `singletonSync` builds a fresh
     one. A warmed index there would be **silently dropped on every hot
     reload**. Recorded on `WarmedIndex` so nobody re-derives it.
- → `antipatterns.md § A public static on a lib value class`, replacing *"See the slate for the ladder"* — the KEPT doctrine block (the ladder table + inherited-statics warning + rung 0 reflective set + the two `@internal` paragraphs + the three irreducible shapes + the record-finder ruling), currently at slate lines 49–137 of the compacted file. Not duplicated here; it is still in the slate

### Status block
- Status: PARTIAL (*scoped for the next session*, ceiling 462/464, remainder 123) → PARTIAL (merged; ceiling 337; doctrine homed; the ladder kept because the doc points here)
- Left: *✅ rungs 2–3 done … the real remainder is 123, not 464: 44 world-SUBJECT … 79 world-REACH … `Lock` → `BoundaryApi`* → *`GroundCharacter.forZone` / `resolve` · the unruled async lookups `OuterWarren.conditionOf` / `admitFor`, `HoldingWarren.entryRowOf` · `Login.generateGuestName` · `readInt` ×3 → `AppApi.settingInt` · the `linearToDb` false-friend rename · `scoreEvents` ×3*
- Size: a build — 564 statics → a tail

---

## docs/slates/builds/discovery-slate.md — 852 → 779 · Status UNBUILT → PARTIAL

Two halves. **Foraging is unbuilt**: no `forage.yaml` / `gather.yaml`
under any pack's `cmd/`, no patch class, nothing at `forage` in
`packages/server/src/mud`; the only hits are `trade-farming`'s
`Sward.ts:37` (*"Forage is not in this build — D61 shipped half a system
and was cut"*) and `GrubController.ts:26-31` (the same cut). **The
consumable distribution shipped** in the magic-items build (D31) — the
slate's stamp *"no distribution table exists"* was false on arrival:
`lib/residency/SpawnTable.ts` (weight = `PriceList.spawnWeightFor(effectTags)`
× material-tag place affinity; declines when the region is at target),
`ResidencyLogic.runSpawnSweep` (`:259`, the census taken once, draw until
decline, per-region cap, the BUC roll at the random mint), `Census.takeCensus`,
`Circulating.materialTags` (`lib/residency/Circulating.ts:110`, authorable —
`arcane-library`'s rows carry `[paper, board]`, `[vellum]`, `[stone, wood]`),
zone `stocks` / `favours` / `blessingOdds` via `lookupField`. Docs:
`magic-items.md § Distribution` + `§ The census` (which says in so many
words *"That is the discovery slate's own stock model"*), `residency.md
§ Zone fields the spawn sweep reads` + `§ The sweep is a faucet`,
`zone.md § Declared spawn fields`. Nothing of astrology, traffic,
remoteness, the almanac or a tail knob exists.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"direction set, nothing built. Sits above spawn-distribution-slate…"* (32–39, 8) — history; replaced by a one-line pointer that keeps its three links (spawn-distribution · magic-items · identification slates, all present in `docs/slates/builds/`)
- `### Which resolves against the arcane science` → *"A wand is STORED LABOUR"* + *"Somebody competent paid the cost earlier…"* (211–215, 5) — doc: `magic-items.md:14` verbatim. The *potions and scrolls are pharma's product line* paragraph KEPT (pharma unbuilt)
- `### Weigh on PROPERTIES, not on items` → the blockquote + *"a new item spawns correctly the day it is authored"* (586–592, 7) — code: `SpawnTable.weightFor`; doc: `magic-items.md § Distribution` (*no authored rarity table*). The property table KEPT — `kind` / `bulk` / `fragility` are not weighed
- `#### Tag with the VERB too — the grid cell is the power estimate` body (701–718, 18) — code: `PriceList.spawnWeightFor` = `1 / labourForFootprint(cells)` (`lib/magic/PriceList.ts:118`); doc: `magic-items.md § Distribution` (*inverse of stored labour… most expensive cell*)
- `#### The overlap splits cleanly — TWO tag sets` body (721–730, 10) — code: effect cells → rarity, `materialTags` → affinity (`SpawnTable.ts:8-18`); doc: `magic-items.md § Distribution` + `residency.md § Zone fields the spawn sweep reads`

### Superseded — cut
- `### ⚠ The consumable half is DIFFERENT` body (483–504, 22) — by the code: the table is neither a global authored roster nor place-blind; candidates are template-derived + live, weighted by derived rarity × affinity, drawn per REGION against a live census, and `stocks` / `favours` inherit down the zone walk *exactly like a biome field* (the section's *"biome inheritance is the wrong tool here"* was overruled) → `magic-items.md § Distribution`, `residency.md § The sweep is a faucet`, `zone.md § Declared spawn fields`. Heading + note left; place-KINDS and the creature-as-container rows are still open and are in `Left`
- `### Thematic continuity: the tag library IS the magic grid` body (662–678, 17) — by the slate's own later § *TWO tag sets* and the code: place affinity rides material tags, not the grid's thirteen nouns. Heading + note left
- `#### And it works BECAUSE it is unexplained` (679–698, 20) — by § *Which refines the continuity answer* (material affinity is causal) and the code (material-based); the celestial half survives in § *Astrology*. Heading + note left

### Kept (UNBUILT)
- the status block (re-stamped) · the capture / rename framing + the user correction · *Related* · the 2026-09-03 two-consumers box (D61 farmstead — its forage was cut, so the consumer is still waiting; hunting-slate)
- **Part 1** entire: `## The niche` · `## Where competence-buys-information becomes LETHAL` + `### And it is the same plant` · `## Where and when — all shipped` (the substrate claim is true: `biome.md`, `weather.md`, `husbandry.md`) · `## Depletion is a CHOICE` · `## What you find — and the boundary` · `## The forager's real asset` · `## The method ladder`
- **Part 2**: `## The function IS the design` (see Doctrine) · the pharma paragraph · `## Variance as an equity mechanism` (Doctrine) · `## Astrology` + both subsections (no lunar inflow anywhere; `CelestialApi` ships the moon, nothing reads it for stock)
- **Part 3**: `# Where they converge: ONE EQUATION` · `## And it is DERIVE-ON-READ` (see Uncertain) · `## What the deposition rate is based on` + `### Remoteness replaces dungeon depth` (no traffic measure anywhere) · `## The hard constraint` (Doctrine) · `## Astrology needs no special case` · `## Identification converges too` (identification shipped — `magic-items.md § Identification`; the communal PUBLISH / register does not exist) · `## Authored vs measured` + `### Authors write the TABLE` + `### Three layers` + `### The authoring unit: BIOME` + `### THE TABLE IS THE DESCRIPTION` + `### The almanac: OBSERVABLE` + `#### The readability ladder` (the foraging answer, unbuilt; see Uncertain for the consumable contradiction) · `#### Creatures are ONE container` · `#### The creature as a container` · `#### Which fixes the inflow problem` · `#### hunting calendar` · `#### Three almanac products` · `## The knobs` intro · the property table · `### The author's dial is the TAIL` · `### Which splits the knobs by owner` (see Uncertain) · `### Two costs: ACCESS and CONCEALMENT` (the sweep does not conceal what it places — no `conceal` in `ResidencyLogic.ts`) · `#### Which refines the continuity answer` · `### Author vs world — ONE rule` (see Uncertain) · `### Which dissolves the continuity worry` · `## How far it extends` · `## Open questions` 1–11 (see Uncertain for the three the code answered for consumables)

### Doctrine — kept, labelled
- `## ⭐⭐⭐⭐ The function IS the design` — *items are how magic reaches people who did not spend the hours; competence gates what you can DO, an item gates nothing*. `magic-items.md` carries *stored labour* but not the access / egalitarian thesis → a candidate for its *Why*
- `## Variance as an equity mechanism` — *randomness is the only thing that produces UPSETS*; the wealth-gate guard
- `## ⭐⭐⭐⭐ The hard constraint` — *the distribution reads the WORLD, never the PLAYER*; the shipped sweep obeys it (nothing reads a player), no doc states it
- `### ⭐⭐⭐⭐ Which dissolves the continuity worry properly` — *continuity requires rules the world obeys, not history; legibility, not explanation*
- `#### ⭐⭐⭐ Which refines the continuity answer` — *one regularity has a cause, one does not; learning which is which is the science*

### Uncertain — kept
- `## ⭐⭐⭐ And it is DERIVE-ON-READ` (314–324) — *"Nothing spawns. Nothing ticks… it computes what is there when you arrive"*. For consumables the code shipped the opposite shape: a periodic self-maintenance SWEEP that clones items into regions (`runSpawnSweep`, observe-first, `residency.spawn.perRegionCap`). Still the intended design for foraging stock; requirements must decide whether foraging follows the sweep or the doctrine
- `### Authors write the TABLE. The world computes the STOCK.` / *"CHARACTER is authored. QUANTITY is measured"* and `### Which splits the knobs by owner` (*rate — the world*) — the shipped consumable channel lets an author declare a regional QUANTITY (`stocks: {censusKey: count}` on a `SpatialZone`; Veshko's yard authors `spirit:vodka: 24`) and a per-row `regionTarget`. That is the *rate* knob in the author's hands, which these sections say the world must own. Also answers **Q10** (*can an author pin a floor?* — the lean was *placement only*; the code says yes, a floor is exactly what `stocks:` is) and **Q8** (per-site vs shared — per REGION, never global, `SpawnTable.ts:28`) for consumables. Q11 (additive vs override) — `lookupField` is override-shaped (a child narrows). All three questions kept because the foraging half has not decided
- `### ⭐⭐⭐⭐ Author vs world — ONE rule covers all of it` — half its table shipped as drawn (item tags · place tags inherit from the zone · affinity strength a global constant — the operator setting `residencySpawnAffinityBoost`, `ResidencyLogic.ts:381`) and half did not (tail / breadth · rate/mean by traffic · parcel-scoped tuning). Kept whole
- `## Where and when — all shipped` names *"the houseplant build shipped plant growth"* as the regrowth home; `husbandry.md`'s `GrowingMixin` is a growth model for a POT/bed, and a wild patch has no class — the substrate claim is true, the object shape is open (Q1)
- Overlaps for the cluster pass: the weighted table ↔ `spawn-distribution-slate` (which this slate says it sits above — the mechanism has now shipped under residency, so that slate is the one to re-check); the almanac ↔ `insurance-slate § the almanac-maker` (this batch; two slates, one product: the survey / calendar / register split is only here); communal identification ↔ `identification-slate` + `inquiry-slate`; the creature as a container ↔ `hunting-slate`; the forage → farm transition ↔ `farmstead` / `farming-slate`

### Handoff
- none (every shipped decision found is already in `magic-items.md` / `residency.md` / `zone.md`)

### Status block
- Status: UNBUILT (*no forage verb and no distribution table exist*) → PARTIAL (the distribution table exists; foraging does not)
- Left: *the forage verb + the patch Stuff · biome-authored tables with derived, depleting stock · the NetHack consumable distribution · the almanac + the astrological correlation · remoteness/traffic* → *the forage verb + the patch Stuff · harvest-method depletion · the method ladder + field drying · biome-authored tables with derived, depleting stock (character authored, quantity measured) · the table IS the description · traffic / remoteness as the deposition rate · the astrological (lunar) inflow term + the behaviour-mediated correlation · the almanac (survey · calendar · register) · communal identification that publishes · the creature as a container + loot that walks · authored place-KINDS (a vault, a hoard) · the tail / breadth author knobs, parcel-scoped · concealment by default for spawned things · `kind` / `bulk` / `fragility` as weights* (the NetHack distribution dropped — shipped; the body's open designs added)
- Size: a build → a build

---

## docs/slates/builds/mind-slate.md — 824 → 831 · Status UNBUILT → UNBUILT

Kept whole per the batch brief (the founder is the accuracy authority on
its subject). Verified nothing shipped: no `equanimity` under
`packages/server/src/mud`; `traits-stress` appears only as the deferred
name in `trait.md:15-17,185` and as the seam `Morale.ts:47` / `combat.md:151,855`
refuse to fill (`g(composure) ≡ 1`); `Emote.valence` is still the
target-facing renown valence only (`lib/social/Emote.ts:65-71`); no
emote-distribution read, no situational / persistent condition class.
One cut; the file grew by seven lines because the status line and `Left`
grew.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"design direction, nothing built. Foundation is the deferred `traits-stress` build…"* (24–27, 4) — history; its one fact (the foundation is `traits-stress`, `trait.md`) is in the canonical block and the first row of `## What already exists`

### Kept (UNBUILT)
- everything else, verbatim: `## The hard rule` · `## Three tiers` · `## The structural problem` + the avatar-has-no-mind dissolution · `## What already exists` (see Uncertain) · Mechanisms 1–4 and every subsection · `## Discovery: state is a RELATIONSHIP` · `## The channel` + the chronicle + the guard · `## The build: stress's five consumers` · the three worked examples (bipolar I · ADHD · autism, with its decision NOT to model) · `## The company we are in` · `## What to refuse` · `## Open questions`

### Doctrine — kept, labelled
- `## The hard rule` and `## ⚠ What to refuse` — the accuracy and refusal constraints; not backlog items, and they must travel with the requirements verbatim
- `### ⭐⭐⭐⭐ The strongest result: THE ENVIRONMENT DETERMINES THE DISABILITY` · `### ⭐⭐⭐⭐⭐ So: BUILD THE DIALS, NOT THE DIAGNOSIS` · `### ⭐⭐ The general line this revealed` — the design philosophy of the subsystem

### Uncertain — kept
- `## What already exists` row 1: *"traits — 17 opposed pairs"*; `trait.md:31` counts **19**. Same stale figure as lineage-slate
- `### ⭐⭐⭐ Half of this is already scoped under another name` cites `trait.md`'s deferred *"full-surface disposition-valence authoring"* — still in `trait.md`'s deferred list (`:185-186`), so the claim holds
- `### ⚠ The requirements question this leaves` (where a durable per-actor emote history lives) — `ReactionRegistry` is still ephemeral (`reactions.md`); nothing since has answered it
- `### ⭐⭐⭐⭐ Oscillation is derive-on-read` → *"the second thing to opt out of the linkdead freeze"* — the mortality build made the `dying` clock NOT freeze on linkdead (`mortality.md`), so the precedent the section leans on is the shipped one; consistent, noted only because the slate calls it a precedent
- Overlaps for the cluster pass: the cope-drinking → tolerance spiral ↔ `physiology-slate § 7h`; the Reeve Line / Composure ↔ `magic.md` (shipped) + `combat-experience` T5 (the other claimant on `g(composure)`); the start/stop axis ↔ `activity.md`'s `AbortReason` (shipped vocabulary, no mental reader)

### Handoff
- none

### Status block
- Status line: added the code-verified state of the `traits-stress` seam and the `Morale` refusal
- Left: *the equanimity Reserve + the stress equilibrium · the dials that configure "yourself" · situational conditions · persistent conditions + shapes · the evidence channel through emotes and regard* → *the equanimity Reserve + the stress equilibrium (the deferred `traits-stress` build named in trait.md) · the start/stop axis on `AbortReason` · emotes as evidence about the ACTOR (rate · range · drift, no new metadata) + where the per-actor emote history lives · reactive vs oscillatory disturbance, derive-on-read · state as a relationship (regard-visible, never a readout) · the dials that configure "yourself" · situational conditions · persistent conditions + shapes · magic as the manifestation channel (the Reeve Line's hole) · the refusals list* (the body wins: Mechanisms 1, 3, 4 and the discovery section were unrepresented)
- Size: a build → a build

---

## docs/slates/tails/tradition-slate.md — 724 → 731 · Status UNBUILT → UNBUILT

Nothing shipped and nothing to cut. No `class Tradition` / `class Law` /
`TraditionCatalogue` anywhere under `packages/server/src/mud` or
`packages/content`; no `predict` gate, paper or replication (the `predict`
hits are prose in `Blessing.ts`); no `notebook` document kind
(`DocumentKinds` is closed and does not list one); `inquiry-slate.md` is
`PARTIAL` on the instrument seam (`analyze` / `measure`) alone. The
substrate the slate reuses exists as claimed: `ChronicleEntry` kind
`claim`, `Transcript` + `Discipline` + Competence (`advancement.md`),
`StoredDocument` (`document-store.md`), `press` Releases (`press.md`),
`buy` / `consign` (`retail.md`), `PromptApi.text`. The file grew by seven
lines because `Left` grew.

### Cut
- none

### Kept (UNBUILT)
- everything, verbatim: both framing blockquotes · *See also* · `## The error this slate exists to correct` · `## The split: Law vs Tenet` · `## The mechanic: attention order` · `## Null laws` + *no truth table to datamine* · `## The experience, beat by beat` · `## Objects and interactions` (new / reused / no collections / no Apis) · `# Worked examples` (`Tradition.ts`, the three `Law` rows, the three `Tradition` rows, the notebook mid-experiment, the Transcript row) · `## The one genuinely open structural question` · `## Atheism as a first-class Tradition` · `# Failure analysis` 1–3 · `## Open questions / where it dies` 1–7

### Doctrine — kept, labelled
- `## The split: Law vs Tenet` — *positive is adjudicated by the sim, normative by nothing, ever*; the same line `compact-political-science.md` grades on
- `### ⭐⭐⭐⭐ And this is why there is no truth table to datamine` — *the evaluator is the only oracle*
- `# ⚠⚠ Failure analysis — where this does not reach` — the reason for the rename and the demotion of religion to one consumer; a record of a design being wrong, kept as the slate's own guard

### Uncertain — kept
- ⚠ **The second `> **Status: sketch / pre-requirements.**` blockquote was NOT cut** despite the one-status-block rule: its status clause is the first sentence of the paragraph that DEFINES a Tradition (*"an inherited account of how some part of the world works… an attention order over the shared `Law` catalog"*) and states the dependency (*it rides inquiry-slate and adds almost nothing*). Splitting the paragraph is below the cut granularity. The coordinator may strip the leading bold clause
- `## Objects and interactions` + `# Worked examples` use the pre-rename layout throughout — `obj/Tradition.ts`, `/obj/Tradition/<key>`, `seeds/obj/Law/*.yaml`, `cmd/perception/notebook.yaml`. Today those are `platform/idea/Tradition.ts`, a pack's `content/<root>/idea/Tradition/<key>.yaml` (there are no seeders — `content-packs.md`), and `packages/content/platform/content/platform/cmd/<category>/`. The *design* (an exact `Discipline` mirror, a warmed catalogue, no new collection, no new Api) is unaffected; the paths are stale
- Beat 4 says a `notebook` kind is *"the document store's fourth kind after script and dorm, no new collection"* — `DocumentKinds` has grown since (wiki, command-view, subject, name-bank…), and adding a kind is a **platform act** (`document-store.md § When a collection should be a document instead`). Still true that it needs no collection
- `### seeds/obj/Law/cooling-vs-tau.yaml ← REAL, shipped today` — the evaluator it names is real (`thermal.md`: `T(now) = ambient + (T0 − ambient)·e^(−Δt/τ)`); the `Law` row is not
- Overlaps for the cluster pass: the `Law` catalog, predict gate, papers and credibility are `inquiry-slate`'s (this slate says so); the almanac / astrology lesson ↔ `discovery-slate` (this batch); *truth is shown, not argued* ↔ `deduction-slate`; the Chapel declaration ↔ `alignment-slate`; the second-variant physical notebook ↔ `chattel.md`

### Handoff
- none

### Status block
- Status line: added the code-verified state (inquiry PARTIAL on the instrument seam alone; no Law / Tradition / notebook / predict in code)
- Left: *the `Law` catalog · the Law/Tenet split · `Tradition` as an Idea carrying an attention order · null laws · the notebook · what lands in the Transcript · atheism as a first-class Tradition* → *the `Law` catalog (inquiry's) · the Law/Tenet split · `Tradition` as a data Idea carrying tenets + an attention order, and its `TraditionCatalogue` · null laws · the notebook (`StoredDocument` kind + the `notebook` verb + `analyze --log`) · what lands in the Transcript (a refutation graded `success`) · how a `Law` row points at its evaluator (needs sign-off) · atheism as a first-class Tradition · the three Tradition rows + three Law rows as seeds* (the body wins: the catalogue, the verb, the evaluator question and the seed rows were unrepresented)
- Size: a wave → a wave

---

## docs/slates/builds/campus-grounds-slate.md — 720 → 731 · Status UNBUILT → PARTIAL

The `eternal-university` pack's whole content is Duncan Hall (residence),
the **campus farm** (yard · byre · midden · trough · hay barn · herdbook ·
handcart · farm unit) and the **home field** (`campus-farm.yaml`,
`campus-field.yaml`) — 39 YAML files, no `src/`. No lab / laboratory /
archive / lecture / eatery / refectory / arena row anywhere in
`packages/content`; no eatery archetype in any trade pack (the only
`canteen` is a keyword on Rejection's *The Dry* shack); no Chancellor seat
(`civics.md:132`: campus government *thin*); `practicum` under
`packages/server/src/mud/world/` is the magic Practicum the slate says to
bind, not build. `combat.md`'s *gym* is still the balance bench
(`test:gym`). The one thing that shipped is Part 5's second field site in
a different shape: the campus farm is a **working production unit on
campus** (D103, farmstead build), and its row comment is verbatim the
slate's provenance (*"Modelled on Davis and Cal Poly, which teach
agriculture with an actual production unit on campus"*) plus the build's
own test (AC 62: *zero pack code*). No subsystem doc mentions the campus
farm — only `docs/requirements/return-leg-requirements.md` — so it is
SHIPPED · UNDOCUMENTED and goes to Handoff. The file grew by eleven lines
because the status block grew.

### Cut (SHIPPED · DOCUMENTED)
- the second status line *"design conversation, captured. Not requirements."* (27–28, 2) — history

### Kept (UNBUILT)
- the status block (re-stamped) · the capture paragraph + the three-layers framing · *Provenance* · *Sits on / amends*
- `## Part 0` · `## Part 1` (all four tiers — the Practicum *bind* row is a shipped fact, not a build item) · `## Part 2` (see Uncertain) · `## Part 3` + retention + the ecosystem · `## Part 4` + both resolutions · `## Part 5` (see Uncertain — the horticulture row) · `## Part 6` + the mechanic + spellbooks + the guild question + grid homes + the spellbook principle · `## Part 7` + derivation + what they can be · `## Part 8` + the room roster + the demo sequence + the three curriculum findings · `## Part 9` + the finding + the second chain + room and board + congregation + cheap · `## Part 10` · `## Open questions` 1–17 · `## What this slate does NOT cover`

### Doctrine — kept, labelled
- `### ⭐⭐⭐ The ecosystem: the University monopolizes TRAINING, not MEASUREMENT` — *free but obligating vs paid but unobligated, neither strictly better*
- `## Part 2 — The university owns them, and that is a content decision` — *code is shared, CONTENT IS COPIED*; labs are content, not trade archetypes
- `### ⭐ The finding: every trade shipped production, none shipped consumption` — a finding about the trades (the bar is the exception because it collapses both into one room)

### Uncertain — kept
- `### The three sites` row 2 (*Horticulture grounds + greenhouse — rides smallholding, husbandry, thermal*) — shipped as the campus FARM: a yard, a byre, a home field, a herdbook (`trade-farming` + `trade-ranching` classes, no greenhouse, no thermal instrumentation). *The campus field site teaches the loop; the world charges for it* is now literally true for farming (Heart's Delight is the static authored farm that charges the journey — `hearts-delight/pack.yaml`). The row is kept because the greenhouse half is unbuilt; requirements should site the labs beside the farm that exists
- `## Part 2` says a lab is *"a `FurnishableRoom` row with a `populates:` of its bench instruments"* — `populates:` was retired in favour of `props:` / `cast:` (memory: props-and-cast-designation). The decision (a row, zero classes, in the university pack) stands; the field name is stale
- `## Part 0` counts *23 platform Disciplines (+10 arcana)* and *18 analyze/measure channels*; the metal chain added `measure strike` / `dip` and `analyze ground` stanzas since — not recounted
- `### It is cheap` / Q15 — `serve` still lives in `trade-hospitality` (`CLAUDE.md § File Naming` lists it there); the placement question is still open
- Q4 (the observatory as official time) — `time.md` gives the clock to `WorldClockApi` + the Timekeeping display seam; no institution owns it
- Overlaps for the cluster pass: enrollment-as-contract ↔ `college-slate` (the conflict is recorded in Part 4 of this slate); the field/bench split ↔ `sampling-and-labs-slate`; the archive as *what has been measured* ↔ `inquiry-slate` (papers) and `tradition-slate` (the notebook, this batch); the arena's stakes ↔ `combat-experience`; the eatery's `serve` ↔ `trade-hospitality` / `trade-cooking` pack placement

### Handoff (belongs in a doc outside my list)
- → `ranching.md` (or `smallholding.md`) as a short *Where it is proved* paragraph — **the campus farm**, verbatim from the row comment at `packages/content/eternal-university/content/world/eternal/campus-farm.yaml:1-14`:

  > The campus farm — ⭐⭐⭐ **small, real, and working** (D103).
  >
  > Modelled on Davis and Cal Poly, which teach agriculture with an actual
  > production unit on campus: small enough to walk, real enough to sell.
  > Students do the work; the unit is a teaching facility and a business at
  > once.
  >
  > ⭐⭐ **And it is this build's own falsifiable test** (AC 62). If the
  > campus farm can be authored against the farm and byre archetypes with
  > **ZERO PACK CODE**, the mechanism/expression cut was right — and we find
  > that out here, cheaply, long before anybody builds a valley. There is no
  > `src/` in this pack for any of it: every file under `campus-farm/` is
  > YAML, and the classes it names are `trade-farming`'s and
  > `trade-ranching`'s.

  and this slate's reason it belongs on campus (Part 5, kept in the slate): *the campus field site teaches the loop; the world charges for it.*

### Status block
- Status: UNBUILT → PARTIAL (the campus farm shipped as the first field site)
- Left: *the labs · the archive + literature-substitutes-for-fieldwork · the three teaching field sites · the combat facilities · the teaching rooms off the Magic 101 chapter list · the eatery and room-and-board · enrollment as the access gate + retention by obligation* → *the four labs (assay · fermentation · agronomy · medical) + the observatory · binding the Practicum · enrollment as the access gate + retention by obligation (which clause keys it) · the adit + the steam tunnels · the greenhouse · the reserve · the archive + literature-substitutes-for-fieldwork + the 5:2:1 shelf ratio · the spellbook shelves (town / archive / guild hall) · the salle, the audience, the drill ground (stakes unresolved) · the lecture hall + seminar room and the walkable study.com demo · the eatery (a front-of-house archetype bound to `kitchen`; where `serve` lives) + room-and-board · the Chancellor seat · lab staff · athletic grounds* (the body wins: the observatory, the spellbook shelves, the Chancellor seat and Part 10 were unrepresented; *three field sites* became the two that remain)
- Size: a build → a build

---

# Batch summary

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| `builds/lineage-slate.md` | 1708 → 1684 | UNBUILT → PARTIAL | 7 → 15 | a build → a build |
| `builds/insurance-slate.md` | 1234 → 1241 | UNBUILT → UNBUILT | 11 → 15 | a build → a build |
| `builds/value-object-statics-slate.md` | 1053 → 229 | PARTIAL → PARTIAL | 3 (stale) → 6 | a build → **a tail** |
| `builds/discovery-slate.md` | 852 → 779 | UNBUILT → PARTIAL | 5 → 15 | a build → a build |
| `builds/mind-slate.md` | 824 → 831 | UNBUILT → UNBUILT | 5 → 10 | a build → a build |
| `tails/tradition-slate.md` | 724 → 731 | UNBUILT → UNBUILT | 7 → 9 | a wave → a wave |
| `builds/campus-grounds-slate.md` | 720 → 731 | UNBUILT → PARTIAL | 7 → 14 | a build → a build |

7,115 → 6,226 lines. Cuts: 3 + 1 + 18 + 8 + 1 + 0 + 1 = **32 cut
operations**; duplicate status blocks cut in four slates (lineage ·
discovery · mind · campus; insurance and statics had only the canonical
block; tradition's second one is kept with a reason under its Uncertain). Handoffs: **9** (1 lineage
→ `race.md`; 6 statics → `architecture.md` / `antipatterns.md` /
`boundary.md` / `persistence.md`, plus the kept ladder block; 1 campus →
`ranching.md`). Stale doc facts flagged for the coordinator (outside my
list): `lint-family.md:141` *ceiling 564* (code: 337); `boundary.md:59`
*minting lives on `Lock.mintKeyway()`* (code: `BoundaryApi.mintKeyway`);
`antipatterns.md:4941` *see the slate for the ladder* (the slate is now
229 lines and the ladder is the reason).

Hardest calls:
1. **Statics slate — cut the journal of a merged build to a stub, but keep the ladder.** `antipatterns.md` explicitly defers to the slate for the disposition ladder, so cutting it would have dangled a doc pointer. Kept ~90 lines of doctrine the docs point at and handed off six undocumented rules verbatim; everything else in a 1,053-line journal was either in `antipatterns.md` / `lint-family.md` or was a ceiling figure the gate has since moved past.
2. **Discovery's consumable half shipped under another slate's build.** The stamp said *no distribution table exists*; `SpawnTable.ts` + `magic-items.md § Distribution` say otherwise, and the doc quotes this slate as the stock model. Cut only what the code matches exactly (rarity from labour, two tag sets, properties-not-items) and left the contradictions (derive-on-read vs a sweep; *quantity is measured* vs an authored `stocks:` target) in Uncertain rather than deciding them.
3. **Lineage's healthspan section contradicts a shipped decision** (`race.md`: no biological arc for a played body). Kept verbatim, flagged, because the longevity industry design hangs on the premise and requirements must reconcile it rather than inherit either.
4. **Tradition's second status block was NOT cut** — its status clause is the first sentence of the slate's definition paragraph; splitting a paragraph is below the granularity the procedure allows.
