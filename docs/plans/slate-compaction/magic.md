# Slate-compaction pass — magic batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `magic.md` only.
Line numbers below are the ORIGINAL file's. Originals saved under the
scratch dir `magic/orig/` (the slate, `magic.md`, and the 2026-07-25
version of the slate discussed in finding 1) for diffing. Code was
verified in `packages/server/src/mud/lib/magic/**`,
`platform/idea/api/MagicLogic.ts`, `lib/reserve.ts`, `lib/encumbrance/`,
`lib/advancement/`, the **arcana** pack (`packages/content/arcana/`) and
the **arcane-library** pack (18 `Spell` rows, 21 item rows), and the
species rows' `facultyProfile`.

Three things a reviewer should know first:

1. ⚠⚠ **The slate's second status block and three of its Open-question
   annotations cite a Part IV that no longer exists in the file.** The
   `Update (2026-07)` block names *"a single Focus reserve … a discipline
   taxonomy carved by engine-domain, and an orders-vs-guilds access
   split. Captured in Part IV"*; Q1 says *"Advanced in Part IV §5 —
   Evocation/Force/Biomancy"*; Q9 says *"Part IV §2 overrides"*. That
   Part IV was written in `b6b348c64` (2026-07-25, the WizWar commit) and
   **dropped whole by the merge `0b40d0b66`** (2026-07-28, *"Merge
   remote-tracking branch 'origin/master'"* — 196 deletions), which kept
   the built 07-15 Part IV instead. Of the dropped ten sections, the
   ones that shipped are shipped (the mental statline became
   `Species.facultyProfile {depth, serenity, composure}`; the
   interruptible pipeline became `CastActivity`; the species profiles are
   authored on 16 species rows); two are superseded elsewhere (§6
   *orders vs guilds* → `guild-slate.md § No magic guild`; the §9 *divine
   / belief-powered magic* line → `alignment-slate` *never power*); and
   **three exist nowhere but git**: §7/§9 *the interaction stack — readied
   instants (held Shield / Reflect / Absorb / Dispel) as the baseline,
   full priority-war resisted*; §9 *how training moves the three
   attributes within a species range*; §10 *the Wiz-War content-mining
   seed* (per-viewer-belief illusions, Warren manipulation, dormant→fire
   conditions, organ-strip, self-transforms). This pass is cuts-only so I
   restored nothing; the text is at
   `git show b6b348c64:docs/slates/deferred-rpg/capability-magic-slate.md`
   §§ 6–10 (also saved to scratch). **Coordinator's call** whether the
   three orphans come back as a section or a pointer. The Q1 resolution
   line in the slate points here.
2. **Part I (physical capability) is the whole unbuilt half and was
   unrepresented in `Left`.** `vitals.md` l.376 still lists *"the
   physical-attribute readings"* as deferred; `LoadBearing.getCarryCapacity`
   is the only derived-capacity read (body mass × condition band ×
   endurance margin — the *baseline × condition* shape, but no per-part
   muscle, no dynamometer, no readout); the three advancement channels
   shipped only as the `Discipline.channel` vocabulary (`skill | knowledge |
   conditioning`), with no bounded/bidirectional conditioning anywhere
   (no `atrophy`/`detrain` in `lib/advancement`). Kept whole; `Left` grew.
3. **Two statements in `magic.md` were proven false by the code and
   fixed in place** (recorded under *Graduated*): the design-source path
   (`docs/slates/deferred-rpg/…` — the directory was dissolved in
   `720d9db06`) and the provenance tuple (`{…, caster}` → `{…, specifiedBy,
   firedBy}`, `lib/magic/Grid.ts`, documented in `magic-items.md § Provenance
   carries two ids`). ⚠ `Grid.ts`'s docstring l.10 carries the same stale
   `deferred-rpg` path — code, not my remit; flagged for the coordinator.

---

## docs/slates/builds/capability-magic-slate.md — 846 → 470 · Status PARTIAL → PARTIAL

Part IV shipped end to end and is the best-documented subsystem in the
tree (`magic.md` 396 lines + `arcane-science.md` 1886 + `magic-items.md`
1311), so almost all of it is SHIPPED · DOCUMENTED. Part II is
SUPERSEDED by `arcane-science.md`, which carries an explicit *supersession
note* against this slate's instrument sketch (l.1180–1187: *"there is no
field, and there is no affinity"*). Parts I and III-move-2 are UNBUILT.

### Cut (SHIPPED · DOCUMENTED)
- `### 1. The effect substrate — spells as data` body (324–384, 61) — code: `lib/magic/Effect.ts` (closed union, `MagicEffects.validate`, `transform` absent by design; the family derived from the kind), `platform/idea/api/MagicLogic.ts` executors; doc: `magic.md § The governing invariant`, `§ The pieces`, `§ Impulse vs modifier; provenance; suppression`; the trigger-agnostic envelope → `magic-items.md § The effect context`. Heading + pointer left; the `Transform` row stays in `Left`
- `### 2. The resist seam — where an effect meets combat` body (388–461, 74) — code: `lib/magic/Resist.ts` (`ResistSpec {axis, intensity}`, `ResistMitigator.fraction()` with 1 = immunity, `ResistBand`), the mental resolver on `MagicLogic`, `Caster.getComposureFactor` (live `f(band, manaFraction)`), `Condition.mentalBands`; doc: `magic.md § The resist seam (N-axis)` (the whole table, per-axis units, the delegation finding), `§ The cast pipeline` (*the active gate … there is no parallel resolution anywhere*). *Banding-is-presentation* shipped as `spells` — `SpellsController.ts` l.1–10: *a self-view; another's state never shows at all*. Heading + pointer left; wards stay in `Left`
- `### 3. The grammar = the skill tree = advancement Disciplines` → the roster, the verb carve, the noun table, the *Crucial clarification* (graduated, below) and the skill-tree bullets (465–547, 83) — code: `lib/magic/Grid.ts` (`MAGIC_VERBS` 5, `MAGIC_NOUNS` 13 — lightning + storm graduated, `FRONTIER_NOUNS = ['time','spirit']`), the 18 `magic-*` Discipline rows in `packages/content/arcana/content/system/arcana/idea/Discipline/`, `MagicLogic.ts:1043` (the limiting axis); doc: `magic.md § The cast pipeline` (the band gate on both axes), `advancement.md` l.380–391 (*verbs `synergizes` every noun … deliberately no `conferrals`*), `arcane-science.md § The taxonomy` (the five verbs, *The Crowe dissociation — Light split from Fire*, *The Air narrowing*, *Arcana is reflexive*). ⚠ Two of the three skill-tree edges did not ship as designed: no `requires:` on any magic row; band-gated `conferrals` were superseded by the cast-time band gate — both named in the pointer. Heading + pointer left
- `### 3½. Magical provenance — a pervasive tag` → the two opening paragraphs (551–563, 13) and the exemplar + honesty boundary + closing (573–597, 25) — code: `Grid.ts` `MagicProvenance` (rich, two ids), `lib/magic/Suppression.ts` (`Location.suppressesMagic` `{all}` or a `verbs`/`nouns` filter, the sync outward walk), `MagicLogic` dormancy on reconcile; doc: `magic.md § Impulse vs modifier; provenance; suppression` (*the suppressible line IS the impulse/modifier line*), `§ The demonstrator` (the warded cell + the mundane brazier), `arcane-science.md § The Ward Argument`. Pointer left; **the ride/read table (565–572) is KEPT** for its fourth row (in-flight effects — counterspell, ward mitigators keyed to the tag), which has no code
- `### 4. Learning magic as a science` → the Competence-model paragraph + bullets and the *best domain for the science pedagogy* paragraph (601–618, 18) — code: `MagicLogic` credits `magic-<verb>` + `magic-<noun>` as two subchecks of one `ActSignature`; doc: `magic.md § The cast pipeline`, `arcane-science.md § What runs on the shipped build today` (five labs) + `§ Course-readiness`. Pointer left; the `#### Discovery is a consumer of the inquiry substrate` child is KEPT
- `### 5.` → the **Settled** paragraph (651–666, 16) — history of decisions every one of which is in `magic.md` / `arcane-science.md` (checked item by item; the inquiry spin-out is `inquiry-slate.md`)
- `### 5.` → the **Supersedes/annotates prior open questions** paragraph (677–683, 7) — its three annotations (Q9 single pool, Q4 trigger-not-field, affinity folds into competence) are now the resolutions written on Q9 / Q4 / Q2 below
- `## The one obligation on shipping work` → bullet 2 *All reserves ride one generalized `Reserve` substrate* (694–700, 7) — code: `lib/reserve.ts` (`ReservedMixin`, `BIOLOGICAL_RESERVE_KEYS`), `Caster.ts` installs `mana` (`pt`, theme `arcane`); doc: `reserve.md` (*"Reserve" is the engine word*; *The non-biological instances* lists `mana`), `magic.md § The anatomical faculty` (*never a forked mechanism, never a stored CON-style scalar*). Bullets 1 and 3 KEPT (their obligations still bind unbuilt work)
- `## Open questions` → Q3 *Mana recovery* (717–721, 5) — code: `Caster.ts` l.289–323 (*mana is the second consumer of the coupled-recovery keystone*; satiation + hydration spent per point); doc: `magic.md § The anatomical faculty`, `magic-items.md § Mana recovery spends satiation and hydration`. ⚠ The annotation's *"pain and fear disrupt it"* has no code behind it (recovery reads posture × `restQuality`, nothing reads pain) — the resolution line says what shipped. Replaced by a one-line resolution
- `## Open questions` → Q5 *Skill substrate sharing* (725–727, 3) — one Competence model; `magic.md § The cast pipeline`, `advancement.md`. Replaced by a one-line resolution
- `## Open questions` → Q9 *Reserve topology* (736–744, 9) — code: one `MANA_RESERVE_KEY = 'mana'` on the caster; doc: `magic.md § The anatomical faculty`, `reserve.md § The authored-thematic seam` (the plural seam exists as mechanism). The resolution line also cites `arcane-science.md § The hard rule` (*the budget is now three items, and that is the ceiling … anything that appears to need a fourth invented item is a modelling error*) — a per-tradition second pool would be a second conserved quantity there. Replaced by a resolution
- `## Once shaped into formal requirements` → *The skill substrate (shared physical + magical) and the knowledge axis* (773–774, 2) — one Competence model; `channel: knowledge` exists (`advancement.md`)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `### 3.` → *Crucial clarification — the grid is a skill/classification lens, NOT an effect-builder* (527–537, inside the 465–547 cut) — code: `lib/magic/Grid.ts` docstring (*a skill/classification lens, never an effect-builder*), `Effect.ts` (effects are the Api calls; no effect names a grid cell), `Spell.ts` (`verb`/`noun` authored on the row, gated at cast) → inserted at `magic.md` as a new `### The grid is a lens, never an effect-builder` under § The pieces (13 lines: effects are open-ended real Api calls; the grid governs who and how well; the cell is derived from what the effects do; consistency is the subsystems' — *a new spell row is content, a new grid cell is not*). Neither `magic.md` nor `advancement.md` carried the rule; only the code comment did
- **Two existing statements in `magic.md` were changed** because the code proves them false (the ledger says so, per the skill): l.26 *Design source: `docs/slates/deferred-rpg/capability-magic-slate.md`* → `docs/slates/builds/…` (the directory was dissolved); l.216 `MagicProvenance = {verb, noun, spellId, caster}` → `{verb, noun, spellId, specifiedBy, firedBy}` + a parenthetical pointing at `magic-items.md § Provenance carries two ids` (`Grid.ts` l.79–99; `normalizeProvenance` reads a legacy `caster` as both)

### Superseded — cut
- the second status block *"Status: deferred — RPG … Update (2026-06) … Update (2026-07)"* (12–34, 23) — history on two counts: RPG is no longer on hold (Part IV shipped), and the 2026-07 update describes the Part IV draft that merge `0b40d0b66` dropped (finding 1). The canonical block is kept and re-stamped
- `### Magic is invented-but-honest science` body (165–184, 20) — by `arcane-science.md`: the postulate has **no medium, no field, no propagation** (`§ The Postulate`: *"without a medium in between"*; `§ The thaumometer — the founding negative result*: *"No medium, no field, no local intensity — only two endpoints and a transfer"*), so *"a thaumic field is just another channel alongside light, sound, heat"* and the `PhysicsChannel` framing are dead; the pedagogy paragraph is `§ The hard rule` + `§ The method`, the honest-asymmetry paragraph is `§ Why this is better taught in an invented science`. Heading + note left
- `### The magic-side capability (symmetric to physical)` body — the axis table + the *Affinity* bullet + the *Mana* bullet + the *plural authored reserves* bullet (188–217, 30) — by the code and `arcane-science.md`'s supersession note (l.1180–1187: *"there is no field, and there is no affinity (there is species faculty band and there is learned competence). Do not author them as working instruments"*): `Species.facultyProfile {depth, serenity, composure}` (`lib/magic/Faculty.ts`, `Caster.ts`; 16 species rows) + the two-axis competence gate replace affinity; mana shipped as ONE `Reserve` instance (documented — see the Q9 cut); the plural-pool lean was overridden by the slate's own § 5 for the baseline. Heading + note left
- `### Instruments (the seam, symmetric to vitals / sound / light)` table (221–226, 6) — by `arcane-science.md § Instruments`: *"the vast majority of measurement is done with plain physical instruments"*; the thaumometer *"measures nothing"* (the Michelson–Morley referent); no affinity-meter; the reserve gauge is `spells` (bands, self only); spell-`analyze` has no verb (the labs use a thermometer and a basin). Heading + note left
- `### Two moves` → **move 1** *Elemental schools actuate real physical channels* + its table + *iron stays Fe* (239–251, 13) — shipped in the roster's shape: every noun actuates one subsystem (`Grid.ts`, `arcane-science.md § The thirteen nouns`), Lightning graduated (the table's *"a real channel to add"* is now `electricity.md`), and the hard rule (`§ The hard rule`: *nothing in this science may contradict real science*) is the *never reclassified* clause. Note left; **move 2** (the magical-property layer) KEPT
- `### Worked examples` → *Fire on an oak door* + *Fire on iron* (263–266, 4) — shipped: `magic.md § The demonstrator` (a firebolt chars the 1.5 kg dummy and lights the 40 g tinder; the object arm is `joules` + autoignite, `fire.md` phase change); → *Measuring affinity* (270–272, 3) — no affinity; → *Deriving a law by experiment* (273–275, 3) — `arcane-science.md § What runs on the shipped build today` lab 1 (Halloway calorimetry) is exactly this. Pointer left; *Earth on granite vs running water* (resonance) KEPT
- `### Taxonomy — held open` (279–284, 6) — by the locked roster: `Grid.ts` (13 nouns, folk-named), `arcane-science.md § The thirteen nouns, and how they were carved` (*the roster is discovered, not decided*). The wu-xing option was not taken; the classical four are four of thirteen. Heading + note left
- Part IV's two blockquotes *Status 2026-07: BUILT* + *Design pass 2026-07-15* and `### The frame, in one line` (290–321, 32) — the first is a second status block (history: *"lightning and storm graduated … v1 is deliberately room-scoped"* — ranged delivery has since shipped, `magic.md § The ranged-integration seam`); the second's one decision (*one combat model, magic feeds inputs; the mental-plane wrong turn retired*) is `magic.md § The cast pipeline` (*there is no parallel resolution anywhere*); the frame line is `magic.md`'s first sentence verbatim
- `## Open questions` → Q1 *Elemental taxonomy* (709–713, 5) — resolved by the locked roster (above). Its annotation (*engine-domain — Evocation/Force/Biomancy*) referred to the dropped Part IV draft (finding 1); the resolution line says so. Replaced by a resolution
- `## Open questions` → Q2 *Affinity shape* (714–716, 3) — no affinity (above). Replaced by a resolution
- `## Open questions` → Q4 *One channel or many* (722–724, 3) — neither: a trigger over the shipped channels with no field (`arcane-science.md § The Postulate`, `§ The thaumometer`). Replaced by a resolution
- `## Once shaped into formal requirements` → *Magic as a `PhysicsChannel`: the thaumic field, its units, its propagation/conservation laws, the instrument suite* (775–776, 2) and *The magic-side capability: affinity (per-school, measurable) + mana … symmetry* (777–778, 2) — both by `arcane-science.md` (no field; no affinity). The closing sentence *"The taxonomy, the spell/skill content, and the combat coupling wait for their own work"* (785–787, 3) — taxonomy decided, the combat coupling shipped (`magic.md § The ranged-integration seam + accountability`); two of three clauses false, cut

### Kept (UNBUILT)
- the status block (re-stamped) · *Two halves, deliberately symmetric* · *See also* (all six links kept — none points at a cut section)
- `## Principle` — see Doctrine
- **all of Part I**: `### Stats are derived and dynamic, not stored` (the per-part muscle-mass baseline, the dynamometer, the derived readout — none in code; `vitals.md` l.376 defers *the physical-attribute readings*; the only derived-capacity read is `LoadBearing.getCarryCapacity`) · `### Advancement — three honest channels` (see Uncertain) · `### What dissolves (and why)` (no CON / INT / CHA anywhere — the dissolution is a design obligation, not a mechanism)
- `## Part III` intro (*elements are verbs, not nouns* — the part's frame) · `### Two moves` → **move 2** the magical-property layer over Materials (no resonance / thaumic-conductivity field on `Material`; `magic.md § Deliberate boundaries` names it *"the magical-material property layer (Part III resonance)"*) · `### Worked examples` → *Earth on granite vs running water*
- `### 3½.` → the ride/read table (its in-flight-effects row) · `### 4.` → `#### Discovery is a consumer of the inquiry substrate` (no `Law`, `predict` gate or `realWorldAnalog` in code — `inquiry-slate.md` is UNBUILT/PARTIAL; see Uncertain for the overlap) · `### 5.` → the **Open** paragraph (see Uncertain)
- `## The one obligation on shipping work` → intro (see Uncertain) + bullets 1 and 3
- `## Open questions` → Q6 (no conditioning machinery exists) · Q7 (wands spend the maker's stored labour — `magic-items.md`; *a focus boosts effective affinity / a tool boosts effective skill* has no code and no doc) · Q8 (`race.md` genetics still deferred)
- `## What this slate does NOT cover` (spine) · `## Once shaped into formal requirements` → the capability-model bullet, the elemental-architecture bullet (mixed: taxonomy chosen, layer open — one bullet), the tests bullet (mixed: *actuates the correct real channel* is tested, `material-response.channels.test.ts`; *conditioning bounded and bidirectional* and *resonance scales effect* are not)
- `## ⭐ Hand-off from the consequence build (MR!254)` — still true: `lib/magic/Memorized.ts:132` `competenceRankFor` is `return 0`, read at `:168`; no composed host overrides it (grep of `packages/server/src/mud` + every pack `src/`). The decision (fill or delete) is open → added to `Left`
- `## ⭐ Hand-off from the magic-expression pass (MR!260)` — all four items still unproven: no test frosts a flooded cell and asserts the shock path (`FloodedCell.integration.test.ts` has no frost; `material-response.channels.test.ts:153` proves frostbite on flesh only); no test sparks a conjured pool; `Material.corrodeOnContact` has two callers (`ThrowController.ts:225`, `MagicLogic.ts:1738`) and no `Floor.onEntered` re-contact; one cold spell (`frost`). → added to `Left`

### Doctrine — kept, labelled
- `## Principle` (four numbered principles). ⚠ Principle 3 *"the same four axes — capacity, skill, knowledge, reserve — run down both sides"* is half-contradicted: the magic-side *capacity* axis shipped as species faculty bands, not a measurable coupling (see Uncertain). Home candidates: `design-philosophy.md` (1, 2, 4 restate its through-lines and the invented-sciences corollary) or the slate
- Part I `### Stats are derived and dynamic, not stored` → the opening paragraph (*D&D-style stored stats are the character-sheet equivalent of stored HP*) and the *Scaling is horizontal* paragraph under `### Advancement` — the thesis of the unbuilt half; kept with their sections, listed here so the coordinator sees them as doctrine rather than backlog

### Uncertain — kept
- `### Advancement — three honest channels` — the three-way split shipped as the `Discipline.channel` vocabulary (`skill | knowledge | conditioning`, `advancement.md` l.51, `alcohol-tolerance` the one conditioning leaf), but nothing in the section's *semantics* did: no bounded ceiling, no bidirectional decay, no *conditioning raises a baseline*. Kept whole (the paragraph rule); requirements should read it as *the vocabulary exists, the mechanism does not*. Overlap: `advancement-slate.md` owns the loadout/decay design
- `## Principle` 3 and the framing bullet *"the magic-side capability (affinity, mana) that mirrors the physical side"* — contradicted by what shipped: there is no affinity (`arcane-science.md` supersession note); the mirror is `facultyProfile` bands + competence. Kept as spine / doctrine; flagged so requirements do not inherit *affinity*
- `### 5.` → the **Open** paragraph — one clause is stale: *"the electricity channel for Lightning"* as a frontier prerequisite — lightning graduated (`Grid.ts`, `electricity.md`, the `spark` spell). The rest (Transform, composition, wards, Storm's stateful weather sim, Spirit, Time) is current. Kept whole
- `## The one obligation on shipping work` → intro *"Everything here is deferred, but one negative obligation binds the current Vitals/Materials work"* — false in its first clause (Part IV shipped); the obligation itself (bullets 1, 3) still binds the unbuilt Part I and the magical-property layer. Kept as the section's frame
- `#### Discovery is a consumer of the inquiry substrate` — a summary of another slate's design (`inquiry-slate.md`, itself PARTIAL on the instrument seam alone per `tradition-slate.md`'s stamp). Kept under the two-slates rule; **merge candidate for the cluster pass** — this slate should carry one line (*magic is inquiry's first consumer*) and inquiry-slate the design. `arcane-science.md § The literature` / `§ Open problems` / `§ The anomalies` are the *content* side of that design and already exist
- `## What this slate does NOT cover` → *Character-creation UI — where baselines/affinities are rolled or chosen* — *affinities* is stale (none exist; `facultyProfile` is authored per species, not rolled — `char-gen.md`). One bullet, kept
- Open Q7 *Gear/focus* — partially answered by magic-items in a different shape (a wand is a *maker's stored labour*, not a focus that boosts the wielder; `magic-items.md § The three item classes`); the *tool boosts effective skill* half has no code. Kept as open
- **The dropped 2026-07-25 Part IV** (finding 1) — not in the file, so not a kept section, but the three orphaned designs (the interaction stack / readied instants; training the three faculty attributes; the Wiz-War seed) are design that exists nowhere in the tree. Listed here so the coordinator decides restore-vs-pointer; not added to `Left` because they are not in the body
- Overlaps for the cluster pass: Part I ↔ `advancement-slate.md` (loadout, capacity-never-clock-decay) and `vitals-slate.md`; the inquiry summary ↔ `inquiry-slate.md` / `tradition-slate.md`; Transform/polymorph ↔ `magic-items-slate.md` (slot-eviction choreography); Storm ↔ the weather build (a weather-pin write Api)

### Handoff (belongs in a doc outside my list)
- → `reserve.md` (stale-claim flag, not a paragraph): its intro says *"deferred, magic-side reserves"*, `§ "Reserve" is the engine word` says *"Magic itself is deferred — see capability-magic-slate.md"*, and `§ The authored-thematic seam` says *"No magic content ships; the seam is demonstrated … and waits for the magic subsystem"* — all three are false since the magic build: `Caster.ts` installs `mana` (`pt`, theme `arcane`) and the same doc's `§ The non-biological instances` already lists it. One-clause fixes each; the code proves them false
- → `arcane-science.md` — nothing to add; it already carries a supersession note against this slate (l.1180–1187). The coordinator may want that note to cite the slate's new path
- → `magic-items.md` / `combat-hooks.md` — nothing
- ⚠ code flags (not docs): `lib/magic/Grid.ts` l.10 cites `docs/slates/deferred-rpg/capability-magic-slate.md` (stale); `magic.md § The computed cost` says *"twelve of the thirteen shipped spells"* and `§ The cost gate` *"rows with no `joules` (twelve of thirteen)"* — the arcane library now has 18 `Spell` rows (identify · remove-curse · teleport · transfer + the four expression spells since); `magic.md § The pieces` still locates the verbs at `cmd/magic/{cast,spells}.yaml` — they ship in the arcana pack at `content/system/arcana/cmd/magic/` (cast · spells · study · zap · recharge). Stale counts and paths, not decisions; left for the doc's owner

### Status block
- Status line: *the effect substrate, the casting grid as Disciplines and the Reserve axis shipped → magic.md* → *the effect substrate, the casting grid as Disciplines, the anatomical faculty over the Reserve axis, provenance + suppression, the roster across every damage channel and the Practicum shipped → magic.md; the science → arcane-science.md; the item tier → magic-items.md. Part I — physical capability — is unbuilt* + the ledger pointer
- Left: *the `Transform` primitive's Api (polymorph is its own build) · multi-cell spell composition · wards as a mitigator layer · the frontier nouns Storm / Spirit / Time · the elemental taxonomy and the magical-property layer over Materials* → *Part I — derived physical capacity (baseline × condition, per-part muscle mass as the strength baseline, the attribute readings vitals.md still defers) · conditioning as a bounded, bidirectional channel · the CHA / INT dissolution (derived presence + learned social skill) · the `Transform` primitive's Api (polymorph is its own build) · multi-cell spell composition · wards as a mental-axis mitigator layer (+ counterspell / ward mitigators keyed to the provenance tag) · a Storm spell (needs a gated weather-write Api; the noun and its Discipline shipped) · the Spirit / Time frontier nouns · the magical-property layer over Materials (resonance) · the inquiry consumer (owned by inquiry-slate) · the `MemorizedMixin.competenceRankFor` `return 0` seam — fill or delete · the MR!260 interop exercises (a frozen pool's consequence chain · shock through a conjured pool · caustic-pool re-contact · a second cold expression) · open Qs 6–8 (conditioning vs the healing ticks · gear as a bounded capability channel · genetics as the baseline source)*. ⚠ **`the elemental taxonomy` is REMOVED from Left** — it was decided (the locked 13-noun roster, `Grid.ts`; `arcane-science.md § The taxonomy`), and *Storm* is no longer a frontier noun (it graduated with the weather substrate; what is missing is a weather-write Api for a spell). The body wins: Part I, the two hand-offs and Qs 6–8 were unrepresented
- Size: a build → a build (Part I alone is a build; the rest are waves on other builds — polymorph on magic-items', Storm on weather's, wards on Arcana content)

---

## Calibration notes for the coordinator

1. **A merge can drop a slate section and leave its citations behind.** The status block and three Open-question annotations pointed at a Part IV that had been gone for seven weeks; nothing flagged it because the pointers were prose. Worth a batch-wide grep: any slate line citing *"Part N §M"* or *"see below"* should resolve to a heading that still exists.
2. **The superseding doc can be a top-level doc, not a subsystem doc.** `arcane-science.md` carries an explicit supersession note against this slate; that note, not `magic.md`, is what retired Part II. Classifying against `magic.md` alone would have left Part II as UNBUILT.
3. **"Documented" for a doctrine-heavy slate can mean three docs at once** — `magic.md` (mechanism), `arcane-science.md` (the science + the why), `magic-items.md` (the D2 split). Every pointer names which.
4. **One kept table for one unbuilt row** (§ 3½). The paragraph rule made the whole ride/read table stay for *counterspell / ward mitigators*; that is the rule working as intended — the alternative was cutting below paragraph granularity.
5. **Line count is a poor measure here** (846 → 470, but ~130 of the remaining lines are Part I doctrine and the two hand-offs). The honest measure is the `Left` list, which went from 5 items to 14 and lost one that was never open.

---

## Coordinator decision (2026-09-19) — the three orphans RESTORED

Finding 1's restore-vs-pointer call: **restored**, as a new section
`## Recovered from git — the 2026-07-25 design pass` placed before
`## The one obligation on shipping work`, text verbatim from
`b6b348c64` §7 (the stack question) + §10 (the revised stack lean and
the content-mining seed) + §9's training bullet, each with a one-paragraph
"where it lands today" note. The three are added to `Left`. Reason: the
pass's governing rule is *no content lost to an overeager cut* — a merge
that dropped design is the same loss by a different hand, and a pointer to
a SHA is not a place a requirements author will look. The species-profile
table (§8) and the other §9 bullets stayed out: shipped or superseded, as
the finding says. Slate 470 → 545.
