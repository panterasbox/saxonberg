# Doctrine-homing ledger — batch 1 (unlinked-1 · git-workflow · topics)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code, never by the slate's own
> markers. Every MOVE's text is verbatim under `## Handoff` at the end.
> Write list: `docs/subsystems/git-workflow.md`, `docs/subsystems/provenance.md`,
> `docs/subsystems/topics.md`; the unlinked-1 slates have no insertable doc
> (Handoff only). `fishing-slate` is named in the assignment but the
> unlinked-1 ledger excluded it (build in flight) and carries no Doctrine
> entry for it — nothing to process.

## Rows

### unlinked-1 · `docs/slates/builds/lineage-slate.md`

- unlinked-1 · lineage-slate · `## ⭐⭐ The story char-gen tells: your majority day` — **STAYS**; every mechanism the fiction explains (parent gallery, antecedents budget, household-seeded traits, family capital, blood type, priced reroll) is unbuilt — `char-gen.md` still says lineage does not exist, and no doc carries a char-gen fiction to hang it on.
- unlinked-1 · lineage-slate · `## ⭐ The four kinds of value` — **STAYS**; the *endowed* kind it argues for has no instance in code (blood type is `blood-slate`, unbuilt; nothing stamps a genotype), and the three shipped kinds are already A3 in `measurement.md` — the section's whole content is the gap.
- unlinked-1 · lineage-slate · `#### ⭐⭐⭐ Where the game states its opinion on nature vs nurture` — **STAYS**; the position is only *observable* through adoption + the raising household (the section's own point), and no lineage record exists; the shipped half (traits/competence derive-on-read, species confers capability) is documented as mechanism in `trait.md` / `advancement.md` / `race.md`. No doc mentions nature/nurture — when lineage ships this is the `race.md § Why` paragraph, verbatim.

### unlinked-1 · `docs/slates/builds/insurance-slate.md` (1241 → 1186)

- unlinked-1 · insurance-slate · `## ⭐⭐⭐⭐⭐ The rule the whole register has been circling` — **DUPLICATE → `vocations.md § Working notes`** (*the information-asymmetry family is FIVE markets deep* + the MENU/VOCATION rule + *the gate is an epistemic advantage*); the table, rule and general-test paragraphs cut (18 lines) with a pointer; the *unsecured credit is where REPUTATION BECOMES MONEY* paragraph is credit design vocations.md lacks and stays.
- unlinked-1 · insurance-slate · `### ⭐⭐⭐⭐⭐ Which is the general anti-corruption mechanism in this economy` — **STAYS**; its three instances are all unbuilt (tamper-evidence → `record-integrity-slate`; the actuarials; ratings), and no top-level doc owns the record-as-deterrent topic (`measurement.md` counts, `compact-political-science.md` only says the archive *is* tamper-evident) — nothing to home it under.
- unlinked-1 · insurance-slate · `### ⭐⭐⭐⭐⭐ Audit has the IDENTICAL disease to ratings — which generalizes` — **DUPLICATE → `vocations.md § Working notes`** (*the assessed-pays conflict is a CLASS*, one conflict two remedies, the same five instances); body cut (14 lines), pointer left.
- unlinked-1 · insurance-slate · `### ⚠ The objection that killed the first draft` — **DUPLICATE → `vocations.md § What makes a vocation real — five criteria`** (the ⚠ *NEVER INVENT A NEED TO CREATE A MARKET* row carries the rule AND the innkeeper worked example); body incl. the user quote cut (12 lines), pointer left.
- unlinked-1 · insurance-slate · `### ⭐⭐⭐⭐ The disposal technique this yields (add to the method)` — **DUPLICATE → `vocations.md § And the disposal technique: DECOMPOSE, never accept or reject wholesale`** (rule + the notary's four-way decomposition); body cut (6 lines), pointer left.
- unlinked-1 · insurance-slate · `### ⭐⭐ It passes — but only at the top rung` — **DUPLICATE → `vocations.md § What makes a vocation real — five criteria`** (the ⚠ *MOST VOCATIONS ARE LADDERS* row, incl. teller / witness / stable-hand as texture); the register-level finding + brake cut (10 lines), the ostler-specific first paragraph (fleet judgment as the skill) stays as that unbuilt vocation's argument.
- unlinked-1 · insurance-slate · `### ⭐⭐⭐ And therefore: insurance is a GAUGE, not a lever` — **STAYS**; argues for insurance premiums as the readout of hazard rates — no insurer, policy or premium exists in code (`grep -ri premium packages/server/src packages/content` finds nothing).
- (note bullet: *the coordinator can cut the five that vocations.md already carries*) — done above; each cut leaves a one-line pointer at the heading.

### unlinked-1 · `docs/slates/builds/value-object-statics-slate.md` (162 lines — already re-cut by the lib-statics sweep)

- unlinked-1 · value-object-statics-slate · `# ⭐⭐⭐ The disposition ladder` intro + `## The ladder, first match wins` — **DUPLICATE → `antipatterns.md § A public static on a lib value class › The ladder, first match wins`** (the table, *statics are INHERITED*, rung 0 + the reflective set); graduated by the lib-statics sweep (`5e97cb147`) before this pass — the slate already holds the one-line pointer, nothing to change.
- unlinked-1 · value-object-statics-slate · `## What the ladder actually yielded` (*"Only tests call it" is not "internal"* · *an unused factory is not an unwanted one*) — **DUPLICATE → `antipatterns.md` same section** (`:4978`, `:4986`); already cut from the slate by the sweep.
- unlinked-1 · value-object-statics-slate · `# Rung 4` intro + `## The three irreducible shapes` + `## And a fourth: a record class's finders belong to the record class` — **DUPLICATE → `antipatterns.md § The three irreducible shapes` / `§ And a fourth`** (`:5003`, `:5011`); already cut by the sweep.
- (note bullet: *recommended home antipatterns.md, replacing "See the slate for the ladder"*) — done by the sweep; `antipatterns.md` no longer says *see the slate*.

### unlinked-1 · `docs/slates/builds/discovery-slate.md` (779 lines, unchanged — no insertable doc; graduations ride the Handoff)

- unlinked-1 · discovery-slate · `## ⭐⭐⭐⭐ The function IS the design` — **GRADUATED → handoff (`magic-items.md`, new `## Why items exist — access, not loot` after the intro)**; the three item classes, the charge economy and the distribution channels shipped (`magic-items.md § The three item classes` / `§ Distribution`, `lib/residency/SpawnTable.ts`), and the doc opens with *what* the build makes first-class and *stored labour*, never *why* items exist in a game where competence is hours (the access thesis). Faithful compaction in the Handoff (user quote dropped); ⚠ the slate section stays until the coordinator inserts it, then cut with a pointer.
- unlinked-1 · discovery-slate · `## Variance as an equity mechanism` — **GRADUATED → handoff (`magic-items.md`, same new section)**; argues for the random draw + unidentifiability that shipped (`SpawnTable.draw`, `§ Identification`); the *upsets* argument and the wealth-gate guard (found must stay meaningful beside bought) are stated nowhere. Folded into the same Handoff insert; slate section stays until inserted.
- unlinked-1 · discovery-slate · `## ⭐⭐⭐⭐ The hard constraint` — **GRADUATED → handoff (`magic-items.md § Distribution`, as a lead-in paragraph)**; the shipped sweep obeys it — `ResidencyLogic.runSpawnSweep` reads region `stocks`, tag `affinity`, `blessingOdds` and the census, never a player, competence or level — and no doc states the rule (`residency.md`, `magic-items.md`, `uncertainty.md` all silent on *reads the WORLD, never the PLAYER*). Verbatim in the Handoff; slate section stays until inserted.
- unlinked-1 · discovery-slate · `### ⭐⭐⭐⭐ Which dissolves the continuity worry properly` — **STAYS**; the legibility it argues for (*locks, far out, certain nights, match the country*) is three-quarters unbuilt — no remoteness/traffic term, no lunar inflow (`CelestialApi` ships the moon, nothing reads it for stock), no concealment on placement; only material affinity shipped. `design-philosophy.md` is the fidelity axis only, so no MOVE target.
- unlinked-1 · discovery-slate · `#### ⭐⭐⭐ Which refines the continuity answer — in a good direction` — **STAYS**; the pair it teaches (affinity has a cause, celestial timing does not) needs the unbuilt celestial term; `uncertainty.md § Part 3` already owns the celestial half (*ecology, not astrology*) as doctrine, so when the inflow ships the *one has a cause, one does not* line is a one-paragraph MOVE there.

### unlinked-1 · `docs/slates/builds/mind-slate.md` (831 lines, unchanged)

- unlinked-1 · mind-slate · `## The hard rule` (*honest or not at all*) — **STAYS**; the accuracy bar for a subsystem with no code — `traits-stress` is still the inert `g(composure) ≡ 1` seam (`lib/combat/Sharpness.ts`, `combat.md:199`), no equanimity Reserve, no condition; it travels with the requirements.
- unlinked-1 · mind-slate · `## ⚠ What to refuse` — **STAYS**; thirteen refusals over unbuilt mechanisms (no status readout, condition, dial or emote-evidence read exists to refuse anything on); the requirements doc's guardrail list.
- unlinked-1 · mind-slate · `### ⭐⭐⭐⭐ The strongest result: THE ENVIRONMENT DETERMINES THE DISABILITY` — **STAYS**; argues for the masking-cost stress channel — unbuilt (nothing reads a mismatch between a dial and a job; `equanimity` / `sensoryLoad` / `transitionCost` appear nowhere under `packages/`).
- unlinked-1 · mind-slate · `### ⭐⭐⭐⭐⭐ So: BUILD THE DIALS, NOT THE DIAGNOSIS` — **STAYS**; the four dials are unbuilt; `design-philosophy.md` is the fidelity axis only and `measurement.md` already carries the neighbouring *no gauge on a declared standard* — this is the case for a thing that does not exist.
- unlinked-1 · mind-slate · `### ⭐⭐ The general line this revealed` (*shape over time → condition; configuration → dial*) — **STAYS**; a classification rule for conditions and dials, neither of which exists in code.

### unlinked-1 · `docs/slates/tails/tradition-slate.md` (731 → 698)

- unlinked-1 · tradition-slate · `## The split: Law vs Tenet` — **DUPLICATE → `uncertainty.md § Law vs Tenet`** (the table verbatim, the god-of-the-gaps line, the Compact-course parallel, *a framework is tenets + an attention order over the shared `Law` catalog*); body cut (25 lines), pointer left carrying the one detail the doc lacks (the owner row: `Law` is inquiry's, the Tenet this slate's).
- unlinked-1 · tradition-slate · `### ⭐⭐⭐⭐ And this is why there is no truth table to datamine` — **DUPLICATE → `uncertainty.md § The superstition ladder`** (*nothing in the data marks them; the evaluator is the only oracle, so there is no truth table to datamine*); the blockquote + the `isNull`/`attends` paragraph cut (10 lines), the AGPL caveat paragraph (not in the doc) stays beside the pointer.
- unlinked-1 · tradition-slate · `# ⚠⚠ Failure analysis — where this does not reach` (1–3) — **STAYS**; a record of why an unbuilt design was renamed and religion demoted to one consumer — no `Tradition` / `Law` class exists (`grep -rl 'class Tradition' packages/` empty); `uncertainty.md § No spokesperson` owns the rule it cites, not the post-mortem, and the congregation/founding/apostasy substrate it hands off is nobody's yet.

### unlinked-1 · `docs/slates/builds/campus-grounds-slate.md` (770 lines, unchanged)

- unlinked-1 · campus-grounds-slate · `### ⭐⭐⭐ The ecosystem: the University monopolizes TRAINING, not MEASUREMENT` — **STAYS**; argues for enrollment-gated labs + the independent assayer path — no lab, enrollment gate or Chancellor seat exists (`eternal-university` content is `duncan-hall` · `campus-farm` · `campus-field`).
- unlinked-1 · campus-grounds-slate · `## Part 2 — ⭐ The university owns them, and that is a content decision` — **STAYS**; the placement decision it argues (labs as pack content, not trade archetypes) is for unbuilt rooms; its one general clause — *code is shared, CONTENT IS COPIED* — is already doctrine at `mining.md:449`, so nothing to home beyond that.
- unlinked-1 · campus-grounds-slate · `### ⭐ The finding: every trade shipped production, none shipped consumption` — **STAYS**; a gap finding that argues for the eatery (no dining / eatery / refectory row anywhere under `packages/content`); the trade rows it audits are shipped but the finding's content is the missing room. If the coordinator wants the method result recorded, `vocations.md § Four gap-finding methods` is the home — not done here (a top-level doc, and the item is still open).

### git-workflow · `docs/slates/builds/provenance-slate.md` (290 lines, unchanged)

- git-workflow · provenance-slate · `## The principles` · Principle 1 (*Provenance is one first-class substrate, not a side-effect*) — **STAYS**; what it argues for is the UNIFICATION of four facets, and that is the unbuilt part — authorship shipped as its own ledger (`provenance.md`), history as the source-only VCS (`git-workflow.md`), ownership as parcel title stopping at land (`parcel.md`), lineage (the dependency DAG, Layer C) and the path-ownership resolver (Layer A) not at all; `provenance.md` already frames the ledger as *the first concrete brick of the provenance substrate* and defers the rest to the slate, which is the honest state. No insert into `provenance.md` / `git-workflow.md` needed.

### topics · `docs/slates/tails/console-filtering-slate.md` (395 → 385)

- topics · console-filtering-slate · `## Principle` (*the server prints everything; the client decides what to show*) — **GRADUATED → `topics.md § Why the filter lives on the client`** (new section, 20 lines, before *The tree carries subject matter*); the mechanism shipped — facets on every `TopicDescriptor` (`topics.md § The six facets`), cockpit tabs as named predicates over the unfiltered buffer (`client-shell.md § One strip…`), and `MessageLogic.predicateMatches` only ROUTES with a catch-all rule, never drops — but no doc stated the principle those facts obey; body cut from the slate (13 lines), pointer left. (`## Non-goals` was listed by the ledger as *doctrine/scope guardrails* under Kept, not as a Doctrine entry — untouched.)

## Totals

- GRADUATED: 4 — 1 applied (`topics.md`), 3 via Handoff (`magic-items.md`, no write access in this batch; slate sections left in place until inserted)
- DUPLICATE: 10 — 5 insurance-slate → `vocations.md` (cut, pointers) · 3 value-object-statics → `antipatterns.md` (already cut by the lib-statics sweep) · 2 tradition-slate → `uncertainty.md` (cut, pointers)
- MOVED (top-level handoff): 0 — every realm-level candidate either already sat in its topic doc (DUPLICATE) or argues for something unbuilt (STAYS)
- STAYS: 17
- STAYS (contradicted): 0 — the contradictions the compaction ledgers recorded (healthspan, derive-on-read vs the sweep, the 17/19 axes) sit under *Uncertain*, not *Doctrine*, and were not re-litigated here

## Handoff

Three graduations for **`docs/subsystems/magic-items.md`** (outside this batch's write list). The corresponding discovery-slate sections (`## ⭐⭐⭐⭐ The function IS the design` · `## Variance as an equity mechanism` · `## ⭐⭐⭐⭐ The hard constraint`) are left in the slate; cut each to a one-line pointer after inserting.

### → `magic-items.md`, new `## Why items exist — access, not loot`, inserted after the intro's *stored labour* paragraph (before the `---`)

Faithful compaction of discovery-slate `## The function IS the design` + `## Variance as an equity mechanism` (user quote dropped):

> ## Why items exist — access, not loot
>
> **Items are how magic reaches people who did not spend the hours.**
> Everyone can cast, competence comes from practice, and Tarn's Rule caps
> you at your weaker leg — so in principle magic is open and in practice
> it is a club. Items are what keep that from being true. **Competence
> gates what you can DO; an item gates nothing.** The wand does not make
> you a caster: you are not casting at all, you are using a thing.
>
> The randomness in distribution is the point, not a concession. **In a
> game where competence is hours practised, randomness is the only thing
> that produces UPSETS** — a found wand is the only way a newcomer does
> something a veteran cannot, a brief inversion of a hierarchy that is
> otherwise strictly monotonic in time spent.
>
> ⚠ **Guard:** if items are the only untrained access, wealth becomes the
> new gate. The *found* channel must stay meaningful beside the *bought*
> one — which random distribution plus unidentifiability handles by
> itself, since you cannot buy what nobody has and cannot price what
> nobody can assess. *(Graduated from the discovery slate, 2026-09.)*

### → `magic-items.md § Distribution`, as the lead-in paragraph before *Rarity derives; there is no authored rarity table*

Verbatim from discovery-slate `## ⭐⭐⭐⭐ The hard constraint` (the shipped sweep obeys it: `ResidencyLogic.runSpawnSweep` reads region stocks, tag affinity, blessing odds and the census — never a player):

> ### The hard constraint
>
> > **The distribution reads the WORLD, never the PLAYER.**
>
> Even accepting the slot machine: **a slot machine that reads you is a
> RIGGED slot machine, and players detect it.** Level-scaled loot is the
> fastest way to make a world stop feeling like a place — **the moment the
> world reflects you, it stops existing independently.**
>
> ⭐ **Legitimate exception — SITUATION, not person.** A besieged town short
> of medicine is **economics**, a property of the world. *"You are
> low-level, here is a low-level wand"* is not.

---

## Coordinator (2026-09-22) — handoffs applied

- `magic-items.md` — `## Why items exist — access, not loot` inserted after
  the stored-labour paragraph; `### The hard constraint` inserted as the
  lead-in of `## Distribution`. The three discovery-slate sections →
  one-line pointers (discovery 779 → 735).
- fishing-slate: intentionally excluded (build in flight).
