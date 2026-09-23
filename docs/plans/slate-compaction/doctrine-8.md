# Doctrine-homing ledger — batch 8 (unlinked-8 · ranged · identity · body · scripting · mql)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code under
> `packages/server/src/**` + `packages/content/**`, never by the slate's
> own markers. Every MOVE's text is verbatim under `## Handoff` at the end.
> Write list: `docs/subsystems/ranged.md`, `docs/subsystems/identity.md`,
> `docs/subsystems/mortality.md`, `docs/subsystems/scripting.md`,
> `docs/subsystems/mql.md`; the unlinked-8 slates have no insertable doc
> (Handoff only).

## Rows

### unlinked-8 · `docs/slates/builds/attestation-slate.md`

- unlinked-8 · attestation-slate · `# ⭐⭐⭐⭐ The primitive` + `## Why this shape and not a workflow` — **STAYS**; the mechanism it argues for (an append-only attestation ledger, review as a predicate on go-live) has no code — the only `attestation` hit in `packages/server/src` is a provenance comment in `lib/advancement/TranscriptEntry.ts`, and `cms.md § Save go-live` still lists the review gate as a later wave; the thesis is the case requirements will need.
- unlinked-8 · attestation-slate · `# ⭐⭐ How it generalizes across the 9th/10th line` — **STAYS**; *require on your own ground, never relax the Compact's floor* rides the branch-policy `writers` guard, which is itself UNBUILT (`branch-policy-slate` status: no `policy` document kind); `polity-decision-register.md § Resource & territory` states the kernel-floor/module split in general but not the review asymmetry, and a register entry for an unbuilt gate would be premature.

### unlinked-8 · `docs/slates/tails/lifecycle-signals-slate.md`

- unlinked-8 · lifecycle-signals-slate · `## The finding` — **STAYS**; the mechanism the rule is applied to (a phased shutdown-subscription seam replacing `AppBootstrap.shutdown()`'s hand list) has no code — no `quiesce`/`onShutdown` under `packages/server/src`, and `backend/AppBootstrap.ts` still names its four subscribers. The general rule itself is already the doc's, once, for the shipped cases: `content-packs.md § …and where a trade's VOCABULARY lives` (*a pack must never need a kernel LIST edit*, with the same three deletions), so nothing is lost if the slate is later absorbed.

### unlinked-8 · `docs/slates/builds/implements-slate.md`

- unlinked-8 · implements-slate · `### Specialisation without a guild` — **STAYS**; the implement it argues for has no code (no implement / lens / band-lift under `packages/server/src/mud` or `packages/content/arcana/src`; `potencyFactor` reads the two bands and nothing else). The shipped kin, `Conduit` (`packages/content/arcana/src/thing/Conduit.ts`), is gate-free in practice but neither its docblock nor `magic-items.md` states *by inventory, not by membership* as a rule — it becomes `magic-items.md`'s *Why* when the implement ships, not before. ⚠ note for the coordinator, not a contradiction by code: `docs/vision.md:90-94` still describes *Academic Guilds (Class System)*, which the slate's *standing doctrine is no magic guilds* reads against; nothing in code has a guild.
- unlinked-8 · implements-slate · `### ⭐ The grid is already the specialisation axis` — **STAYS**; the argument for why the build is small is the build's, and no `create`/`lightning`/`mind` implement rows exist. The substrate half it leans on (two Discipline leaves, Tarn's Rule takes the minimum) is already `magic.md`'s; the section adds nothing to the doc until an implement lifts a band.

### unlinked-8 · `docs/slates/builds/hydration-framework-slate.md`

- unlinked-8 · hydration-framework-slate · `## The claim` — **STAYS**; the invariant (*`postRegister` is for work AFTER a thing is filled in*) is what the build would enforce and nothing enforces it — no `lint:*` in `packages/server/package.json` names `postRegister`, `lib/npc/Cast.ts` still self-loads beliefs there, and `lifecycle.md` describes the hook as *setup* without the finishing-vs-warming line. A reference doc stating an invariant the tree breaks 67 times would be stating a wish; it graduates beside `postRegister` in `lifecycle.md` when the ratchet exists.

### unlinked-8 · `docs/slates/builds/authored-vs-procedural-slate.md`

- unlinked-8 · authored-vs-procedural-slate · `## The forcing case, in one room` — **STAYS**; what the finding argues for — a gate relating a species row to a way to occur, and a declared relation between the authored and drawn layers — has no code (`lint:census` checks path-valued fields only; `ferrow.yaml`'s three `stocks:` keys still match no candidate; the glowcap is still a `PortableLight`). The shipped half it describes (the sweep keys `stocks` on `censusKey`) is `residency.md § Zone fields the spawn sweep reads`; the *silently absent, not an error* property is a hazard of the shipped code that the doc does not state — a one-line candidate for that section when the gate ships, out of this batch's write list either way.

### unlinked-8 · `docs/slates/tails/script-interaction-slate.md`

- unlinked-8 · script-interaction-slate · `## The finding` + `## Not in scope` (*twenty accidents* · *a prompt is a question to a person; refuse to ask, don't invent a listener*) — **STAYS**; the guard it constrains is UNBUILT — `PromptLogic.ts:72,104` still take a required `Interactive` with no refusal path, `_dispatchBound` still builds a context without one, and the only shipped policy is the accept-time cardinality degrade (`prompt.md § …nobody to ask`), which the slate names as not its subject. The design constraint belongs in `prompt.md` beside the guard when the guard exists.

### unlinked-8 · `docs/slates/builds/rendering-slate.md`

- unlinked-8 · rendering-slate · `## 3. ⭐⭐⭐ And it is what gives the industrial land use teeth` — **STAYS**; the thesis is literally true of the shipped code and argues for what is not built: `lib/parcel/LandUse.ts` ships `industrial` as one of the closed six but the only gates are cultivation and the lot-area band — no nuisance mechanic, no tannery, no LULU refusal (`zoning-slate` is still a slate). The home-occupation half it leans on (*the nuisance is regulated, not the work*) is already `settlement-model.md § 4`.
- unlinked-8 · rendering-slate · `## 4. ⚠ The demand is honest, and that had to be checked` — **DUPLICATE → `settlement-model.md § 1 The sixteen needs`** (the *REVISED 2026-09-03* box applies *NEVER INVENT A NEED* to light and waste in the slate's own words; the rule is `vocations.md`'s five-criteria table). Body cut (12 lines) → a five-line pointer keeping the one clause the doc lacks (leather passes trivially).

### unlinked-8 · `docs/slates/builds/prison-slate.md`

- unlinked-8 · prison-slate · `## The three enforcement tiers — and the guardrail above all of them` — **STAYS**; every tier it constrains is UNBUILT — no prison / gaol / confinement under `packages/server/src/mud` or any pack, no courts primitive, and no account-layer moderation machinery either (no ban/mute in `backend/` or `api/`; `security.ts:834`'s `mutedSurfaces` is chat display). No doc states *real-conduct moderation never gets a diegetic costume*: `civics.md`'s premise carries the other direction (*no tier of the fiction is the Compact's face*), and `polity-decision-register.md` D5 leaves punitive conduct as *a separate moderation concern*. ⚠ coordinator: when any enforcement ships this is a register entry or a sentence in `civics.md`'s premise paragraph, not a slate line — but not before.
- unlinked-8 · prison-slate · `## PrisonMixin — a locality you cannot leave` (the experience rule: *a sentence must remain a PLACE; pure fun-removal should be honest and be a ban*) — **STAYS**; the mixin has no code and the rule is its acceptance test.
- unlinked-8 · prison-slate · `## Timing — the split` (*an empty prison is a better statement than an arbitrary one*) — **STAYS**; a sequencing instinct for an unbuilt build, answered by Q3 when requirements run.

### ranged · `docs/slates/builds/ranged-slate.md`

- ranged · ranged-slate · `## Guns — the worked hard case` (the framing paragraph + point 4, *the ceiling is the curriculum*; kernel neutrality) — **STAYS**; the gun design is W4 and unbuilt — the one gun row (`generic-objects/…/arms/flintlock-musket.yaml`) is a `Launcher` with `energySource: chemical` and no cartridge, action, feed, reliability or statute field; no `fouling`/`negligent`/`cartridge`/`magazine` code exists. The one realised clause (competence never gates whether a gun fires) is already `ranged.md § Resolution — placement, not to-hit`.
- ranged · ranged-slate · `## Gun policy — which layer holds what` (*What we encourage, and how* · *the design's own balance goals* · *the gun on campus*) — **STAYS**; the layer table's contents (amendment roster, launch regime, posted modes, enforcement-slate's mode vocabulary) are all unbuilt; the kernel-neutrality principle it applies is already `polity-decision-register.md § Resource & territory`'s split rule in general form, and *danger is geography* is a content-authoring stance with no owning doc until patrol density is a thing a locality sets.
- ranged · ranged-slate · `## Risk and the unskilled — ignorance, never dice` (the cultural position · *the rail: risk must never come from dice* · *why this is not a thumb on the scale*) — **STAYS**; readout ladder, negligent discharge and malfunction clearing have no code (roadmap W2/W4 in `ranged.md`). The rail's general form is already `uncertainty.md`'s resolutional ban; the section is its application to an unbuilt mechanic and is the argument requirements will need.
- ranged · ranged-slate · `## Condition and crafting` (*interchangeable parts is the industrialization story*) — **STAYS**; no assembly, pattern key, fouling axis or parts economy exists (`DurableMixin` + `Keen` are the two shipped axes; `crafting.md` has no interchangeable-parts statement because nothing is pattern-keyed). It graduates to `crafting.md`'s *Why* when a pattern-keyed part ships.

### ranged · `docs/slates/tails/combat-tactics-slate.md`

- ranged · combat-tactics-slate · the provocation paragraph (*ranged is an abstraction problem, not a coordinate problem … not where games like this shine; coordinated, legible, social party strategy is*) — **DUPLICATE → `ranged.md § Bands are relationships, not positions`** (the abstraction half) **+ `combat-formations.md` intro** (*set-policy-then-watch is the text-native answer*); **not cut** — it is the slate's framing paragraph and the spine rule keeps it while the slate lives.
- ranged · combat-tactics-slate · `## Principle` — **STAYS (contradicted)** for principle 2; **DUPLICATE** for 1, 3, 4 (cut, 10 lines → a five-line pointer: `combat.md` `CombatGraph` + `ranged.md § Bands`; `combat-formations.md` intro + § The `CombatFormation` Idea). Principle 2's *tune its rewards* clause is contradicted by the shipped decision — `combat-formations.md § The command Discipline` + § History: *Master-Apprentice has no reward knobs … superseded by the emergent no-knob economy*; its *name it, rule it* half is realised by Master-Apprentice and the doc does not say that is WHY the preset exists — one sentence for the coordinator, in Handoff (`combat-formations.md` is outside this batch's write list).
- ranged · combat-tactics-slate · `### Why this is text/social/AI-native` + *"if a combat sentence ever goes in the README … it should be this, not arrows"* — **GRADUATED → handoff (`combat-formations.md`, intro / a `## Why formations` paragraph)**; the mechanism shipped (four presets, `party adopt`, the `combatant` brain formation-aware) and the doc carries only the *legible* leg (*text-native answer to the gambit wall*); the *social* leg and the *AI-native* leg (a mixed human+AI party runs one formation through one command bus; the master could be an AI tutor — the interface keystone through combat) are stated nowhere in `docs/subsystems/`. Slate text left in place until the coordinator's insert lands (a graduated section is cut only after its text is in the doc); text under Handoff.

### identity · `docs/slates/builds/cast-archetype-slate.md`

- identity · cast-archetype-slate · `## ⭐ A falsifiable health metric` (*archetypes grow logarithmically against cast size; linear ⇒ delete the abstraction*) — **STAYS**; the abstraction it measures (archetype ROWS — closed `role` + `temperament` kinds) has no code: `archetype:` is a free stamp string on `DispositionEntry` / `TranscriptEntry` / `Persona` (`identity.md § The archetype stamp`), no row it resolves to, no `temperament` anywhere under `packages/server/src/mud` outside `Corpo`/`Bonded`. The metric is the acceptance test of the unbuilt build.
- identity · cast-archetype-slate · `# The balance question: axes, not count` (*archetypes cover boilerplate, never character; would you be annoyed to type it again?*) — **STAYS**; a design rule for the same unbuilt rows (the one-kind-per-archetype gate, temperament cardinality) — nothing to hang it on in `identity.md` until a row exists.

### identity · `docs/slates/tails/dossier-slate.md`

- identity · dossier-slate · (no Doctrine entry — the compaction ledger records the falsifiability thesis as shipped: `scripts/check-dossiers.ts` header + `identity.md § The dossier`). Nothing to process.

### identity · `docs/slates/builds/antecedents-slate.md`

- identity · antecedents-slate · `## The one idea` (one answer to *what did this character do before now*; native / authored / foreign; *an import is just a background whose author was another world*) — **STAYS**; the thesis is the case for the unification, and its payoff — foreign as a third PRODUCER over the same seam — is Phase B, with nothing federation-shaped in code (`iscedf` sits on `Discipline`, nothing reads it across instances; no adapter, no acceptance policy). The two shipped provenances are already `identity.md § The dossier — evidence, never values` (the `claim` marker separates authored from earned) without needing the three-row table until a third row exists.
- identity · antecedents-slate · `### Scope` → paragraph 2 (*neither gap is the immersion bottleneck; a fully-seeded NPC with a thin brain reads worse than a thinly-seeded one with a rich brain*) — **STAYS**; it argues for the derive-the-crowd / simulate-the-cast split and the schedule/dialogue half, which `npc-behavior-slate` still owns unbuilt (no schedules, no absence-noticing; `identity.md` does not discuss brains beyond *both rungs have one*). Paragraph 1 (*both gaps adjacent, probably not this build*) is half-stale since Gap 2 shipped — noted, not edited.
- identity · antecedents-slate · `## ⭐ The three buckets` (*skill is in your hands; standing is in other people's heads* · *this is not a blockchain*) — **STAYS**; Phase B has no code, and the one top-level touch (`measurement.md § Tier A` residue: *external-credential trust is imported, not derived*) is a boundary statement, not this thesis; the portability line belongs in `measurement.md` or `advancement.md` when an adapter exists.

### body · `docs/slates/builds/health-vertical-slate.md`

- body · health-vertical-slate · `## The differentiator` (*healing is a practice, not a resource — and the practice begins with not knowing what's wrong*) — **STAYS**; the practice half is unbuilt: `treat` still auto-selects the worst bleeding wound and grades outcome, not decision (`medic-judgment-slate` status; `harm.md § The medic vertical`). The prior-art table is the argument for the reasoning layer requirements will need.
- body · health-vertical-slate · `## The clinical-reasoning trainer we built by accident` — **GRADUATED → handoff (`harm.md § The medic vertical`)**; the mechanism shipped — 25 `Condition` rows under `content/platform/idea/Condition/**` each carry `observableSigns`, and `trade-medicine`'s `analyze patient` reports the candidates *plural and unranked* — and `harm.md` carries the readout's why (*that ambiguity is what makes the choice a choice*) but not the emergence claim (differential diagnosis is not scripted; it falls out of a catalogue with overlapping signs and a patient whose state derives from a model) or the anti-wiki corollary. `harm.md` is outside this batch's write list, so the ≤ 10-line compaction is under Handoff; the slate text is left in place until it lands (the stale *eleven* count is corrected to two dozen in the compaction, not in the slate).
- body · health-vertical-slate · `## Where the education thesis lands best` — **STAYS**; a product thesis about the external-mastery credential seam, which has no issuer, no proctored feed and no code (`credential.md` ships payment / travel / key kinds only); `measurement.md § Tier A`'s *external-credential trust is imported, not derived* is the boundary statement, not this case.

### scripting · `docs/slates/tails/scripting-slate.md`

- scripting · scripting-slate · *The load-bearing decisions* 1–6 — **mixed at paragraph granularity.** Decisions 1–4 **GRADUATED → `scripting.md § Why a designed language — the grammar is the boundary`** (new section, 20 lines, inserted before § What the engine gives you): the engine shipped (`lib/script/Interpreter.ts` conducts `_dispatchBound`; `Coroutine.ts` for `wait`/`every`/`when`; the `( )` island is MQL) and `scripting.md` carried *conducts the bus, never bypasses it* and the `EvalScript` contrast but not the why of a designed grammar (*bounds by construction, not by subtraction*; the menu as the opposite failure), why timing is control flow (one procedure, never triggers smeared across frames) or why conditions are MQL. Decisions 1–4 cut from the slate (31 lines → a four-line pointer). Decisions **5** (`improv`) and **6** (humans + the LLM share one authoring surface) **STAY** verbatim — no `improv` in `lib/script/`, no director anywhere; both are in `Left`.
- scripting · scripting-slate · `## Why a language (and why now)` — **STAYS**; its first two bullets (the LLM's native medium is code; round trips) are the case for LLM-director authoring, which is unbuilt and in `Left`; the substance that is engine-true (one generation → multi-stage execution) is now in the graduated section, and the third bullet is history the slate's spine may keep.

### mql · `docs/slates/tails/world-scan-perf-slate.md`

- mql · world-scan-perf-slate · (no Doctrine entry — the compaction ledger records *you may not be handed the world* as shipped as a gate and documented in `lint-family.md` / `antipatterns.md`). Nothing to process.

### mql · `docs/slates/tails/scope-modality-slate.md`

- mql · scope-modality-slate · `## The premise` → *resolution and feasibility are different layers* — **DUPLICATE → `mql.md § Resolving is not permission`** (the *Nor is resolving feasibility* paragraph the compaction pass inserted: `scope:` is a search hint, the per-verb validator is the contract, `canReach` the exemplar); **not cut** — the sentence is the second clause of the slate's framing paragraph (spine), whose first principle (per-modality permeability) is unbuilt and ⚠ contradicted by the one-rule `isOpenContainer` guarantee (`perception.md § canReach`), as the compaction ledger already flags; cutting one sentence is below paragraph granularity.

## Handoff

Three inserts for docs outside this batch's write list (all subsystem docs,
none top-level). Each is a GRADUATION: the mechanism shipped, the doc
carries the what without this why. The slate text stays in place until the
coordinator's insert lands; then cut with a one-line pointer.

### → `docs/subsystems/combat-formations.md` — after the intro, as `## Why formations — text, social, AI-native`

Source: `docs/slates/tails/combat-tactics-slate.md` § *Why this is text/social/AI-native* (verbatim, plus the slate's closing sentence):

> - **Legible** — one prose line per tactic, watched unfolding. Matches the
>   serial medium instead of fighting it.
> - **Social** — a party-level decision creates coordination, role
>   negotiation, leadership: the social fabric the project leans on.
> - **AI-native** — a mixed human+AI party can run a formation, each member
>   reading the tactic and playing its role through the same command bus.
>   In Master-Apprentice, *the master could be an AI tutor* — the
>   "human interface is the AI interface" keystone and the education
>   vertical, expressed through combat.
>
> This is also the answer to "ranged isn't where these games shine": party
> tactics is. If a combat sentence ever goes in the README or the
> philosophy docs, it should be this, not arrows.

### → `docs/subsystems/combat-formations.md § The command Discipline — teaching pays` — one sentence, appended to the *Master-Apprentice has no reward knobs* passage

Source: `combat-tactics-slate` § *Principle* 2, the half the build kept (the *tune its rewards* half was superseded by the no-knob economy):

> Master-Apprentice exists to **codify emergent behaviour rather than fight it**: players will power-level, kite and exploit, and in a multiplayer world that cannot be stopped — so the preset names the practice and rules it, and the mentored pair does it by the engine's rules instead of around them.

### → `docs/subsystems/harm.md § The medic vertical` — after the `analyze patient` bullet, as a short paragraph

Source: `docs/slates/builds/health-vertical-slate.md` § *The clinical-reasoning trainer we built by accident* (faithful compaction; the row count updated to what ships):

> **Why the diagnosis loop is a trainer, not a script.** Three shipped
> decisions combine: honest opacity (no gauges — you read the world, not a
> stat); every `Condition` carries prose `observableSigns`; and the
> catalogue's two dozen rows have *overlapping* signs. So **differential
> diagnosis emerges rather than being scripted** — flushed, sweating and
> disoriented is consistent with hyperthermia, with a toxin burden and with
> an infection, and separating them takes more signs, a history or an
> instrument. That is what scripted clinical sims structurally cannot do:
> their scenarios have one correct answer fixed in advance, while this
> patient's state derives from a model, so the reasoning is real even when
> the case is unremarkable. The anti-wiki rule carries over from farming
> verbatim: knowing a condition's sign set never tells you that *this
> patient* has it — knowledge is portable, the assessment is not skippable.

## Totals

- Rows with a decision: **31** — the brief's 29 entries (12 · 7 · 5 · 2 · 2 · 1)
  with two paired bullets split into their own rows (rendering § 3 / § 4;
  health-vertical *differentiator* / *trainer*); plus two *nothing to
  process* rows (dossier, world-scan-perf) so every ledger's Doctrine
  section appears.
- **GRADUATED 1** (scripting decisions 1–4 → `scripting.md § Why a designed
  language`) **+ 2 pending via Handoff** (combat-tactics *Why
  text/social/AI-native* → `combat-formations.md`; health-vertical
  *clinical-reasoning trainer* → `harm.md`) · **DUPLICATE 3** (rendering § 4
  → `settlement-model.md`, cut; combat-tactics provocation → `ranged.md` +
  `combat-formations.md`, spine, not cut; scope-modality premise clause →
  `mql.md`, spine, not cut) · **MOVED 0** · **STAYS 24** · **STAYS
  (contradicted) 1** (combat-tactics § Principle — principle 2's reward
  clause; principles 1/3/4 cut as duplicates).
- Files changed by this batch: `docs/subsystems/scripting.md` (+22),
  `docs/slates/tails/scripting-slate.md` (−27 net),
  `docs/slates/tails/combat-tactics-slate.md` (−4 net),
  `docs/slates/builds/rendering-slate.md` (−7 net), this ledger. No
  `git rm`, no commit.

---

## Coordinator (2026-09-22) — handoffs applied

- `combat-formations.md` — `## Why formations — text, social, AI-native`
  inserted after the intro; the codify-emergent-behaviour sentence
  appended to § The command Discipline. combat-tactics § Why this is
  text/social/AI-native → a pointer.
- `harm.md § The medic vertical` — the diagnosis-loop-is-a-trainer
  paragraph inserted after the `analyze patient` bullet;
  health-vertical § The clinical-reasoning trainer → a pointer.
