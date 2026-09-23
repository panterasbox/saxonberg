# Doctrine-homing ledger — batch 4 (unlinked-3 · accountability · holding · physiology · concealment · magic-items)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code under
> `packages/server/src/**` + `packages/content/**`, never by the slate's
> own markers. Every MOVE's text is verbatim under `## Handoff` at the end.

## Rows

- `unlinked-3` · `builds/quest-modeling-slate.md` · `## 3. Serving all three player modes (MDA)` — **STAYS** — argues for the goal-set/plot-lens quest model, which is UNBUILT (no quest substrate under `packages/server/src/mud/**`; nothing names a beat, a goal-set or a plot-lens); `design-lenses.md` is not a MOVE target and the argument is requirements' to spend.
- `unlinked-3` · `builds/sanitation-slate.md` · `## ⚠ The rule that applies first` — **STAYS** — the compute-is-a-metaresource rule applied to an UNBUILT service (no impound/collect/yard in code); no top-level doc owns the metaresource line at all (`grep -rni metaresource docs/` is empty — it lives in memory and slates), so there is nothing to MOVE it under; flagged for the coordinator.
- `unlinked-3` · `builds/sanitation-slate.md` · `### ⭐⭐ Three businesses, three monopoly shapes — the arc completes` + `### ⭐⭐ The capstone: this market structurally resists monopoly` — **STAYS** — the competition-policy arc is stated over four UNBUILT businesses (turnpike + depot are `freight-slate`'s, the salvage yard and second-hand market this slate's; none in `packages/content/**`); `settlement-model.md` carries no monopoly text today (`grep -i monopol` empty) and the remedies (rate cap · common carrier · structural separation) are polity mechanics no code has — requirements' argument, not a reference doc's.
- `unlinked-3` · `builds/sanitation-slate.md` · `### ⭐⭐⭐ The marquee is the LEMONS PROBLEM` — **STAYS** — argues for the second-hand market (UNBUILT: no used-goods venue, no `pawn`); the perception rule it rides is shipped and already documented as such in `perception.md`/`crafting.md` (condition is honest data, reading it takes competence), so the shipped half is a DUPLICATE and the market half is design.
- `unlinked-3` · `tails/naming-slate.md` · `# The never list` — **STAYS** — the seven nevers are the constitution of the UNBUILT rename act + the three impersonation defenses (no `rename.yaml`; `learnIdentityImpl` still unconditional); its two shipped invariants (*never key on a name string · never make names unique*) already landed in `identity.md § A name is not an identifier` via the compaction Handoff, and the `measurement.md` Part 9 restatements are pointers, so the list carries nothing a doc lacks — it stays as the spine requirements will need.
- `unlinked-3` · `tails/naming-slate.md` · `# The residual, stated plainly` — **STAYS** — *a rename does not launder a reputation* is the honest limit on an UNBUILT act; the prosecutable-after-the-fact answer depends on Defense A/C and a rename ledger entry, none of which exists.
- `unlinked-3` · `builds/resilience-slate.md` · `## 1` (*friction plus daylight*) · `## 2. Four layers, and only one of them is defeated by root` · `## 3. The performance law` · `### ⭐ Detect evasion, not malice` · `## 8. The thesis` — **STAYS** (one row, five sections: one spine) — every control the posture argues for is UNBUILT (re-checked: `ScriptLogic.ts` `runInContext` still takes no timeout, `api/hot-reload.ts` + `api/source-tree.ts` carry no `@CallSecurity`, no audit ledger in `api/security.ts`, `RenderBudget` still only under `lib/wiki/`); no subsystem doc (`access.md`, `call-security.md`, `shell-author.md`) mentions friction/daylight/evasion, so there is no *what* to hang the *why* on; the compaction ledger's *graduate as `docs/resilience.md` before a control ships* is refused by the pass's own rule (no new top-level doc is minted for doctrine) — coordinator's call if they want to override it.
- `unlinked-3` · `builds/llm-content-slate.md` · `### The line that cannot be crossed` — **STAYS** — *it generates, it never resolves* constrains an UNBUILT surface (no LLM dependency in `packages/server/package.json`, no director brain, and the `force` seam its security bound leans on does not exist); `uncertainty.md` is the eventual home (a fifth provenance note) but a reference doc must not carry the rule for a sampler the engine does not call — re-home when the first LLM surface ships.
- `unlinked-3` · `builds/pharma-slate.md` · `## The thesis` (+ `### And in this sim it is STRUCTURAL` · `### Which makes pharma where the game teaches STATISTICS`) — **STAYS** — the credence-good thesis is the case for an UNBUILT industry (no pharmacopoeia row, no `assay`, no `neutralizedBy` on `Material`); the free-heal floor it rides is physiology's and shipped, but the thesis is about what that floor makes *possible to sell*, which nothing sells yet.
- `unlinked-3` · `builds/pharma-slate.md` · `## ⭐⭐⭐ It creates demand for INSTITUTIONS` intro + table — **STAYS** — *every institutional mechanism has a natural first customer here* is the reason to build pharma before another craft; a requirements argument for an UNBUILT build.
- `unlinked-3` · `builds/pharma-slate.md` · `## The vocations` → the *information vocations because real hidden state* paragraph — **DUPLICATE → `vocations.md` § the information-asymmetry family** (l.449–458: five markets deep, *if one side knows more, build a VOCATION*, *the gate is almost always an epistemic advantage*, the assayer named); the three-line paragraph replaced by a pointer, the rest of `## The vocations` (the six vocations + the assayer) stays as unbuilt design.
- `unlinked-3` · `builds/executive-slate.md` · `## The mapping — Art. V already describes the workflow` — **STAYS** — *power without legibility* is the case for the UNBUILT executive log (still no `executive_events` in `packages/server/src/schema/`, ten `_events` ledgers and none for the branch); the table's left column is the constitution's, its right column is a status read, and neither is a reference doc's *why* for a shipped mechanism.
- `unlinked-3` · `builds/executive-slate.md` · `# Part 7 — The fiat phase, made legible` — **STAYS** — *this slate is publication* is the slate's own charter for the log, the tiers, the charters and the reports, all UNBUILT; it is the sentence requirements will open with.
- `unlinked-3` · `builds/faith-slate.md` · `## What prior art got right, in one table` — **STAYS** — the genre survey and the *faith as a numeric currency* ban are the design philosophy of an UNBUILT system (no `Tradition` class or row, four `GroupProvider`s and no congregation, `chronicle.tags` still inert); `design-philosophy.md` is a MOVE target for the fidelity axis ONLY, which this is not.
- `unlinked-3` · `builds/faith-slate.md` · `## The derivation — and the hardest constraint` — **STAYS** — *the fidelity value is never readable* is `measurement.md` Part 6 applied to a value that does not exist; the application (the fall's arithmetic, the surprising write) is the build spec, and the general rule is already the doc's — nothing to move.
- `unlinked-3` · `builds/faith-slate.md` · `## ⚠⚠ Dangers` 1–2 — **STAYS** — *a congregation is a club, not a jurisdiction* and *measure fidelity to a declared standard, stay silent on the standard* are constraints on the UNBUILT congregation provider and precept reader; the trap list requirements needs.
- `accountability` · `builds/policing-slate.md` · `## Organized vs. ordinary: the difference is governance, not violence` — **STAYS** — *organized crime is unlicensed governance* is the premise of the UNBUILT Gray (no gang row in the terminus pack, no lending tier, no exclusion record kind); the Business Idea it rides is shipped substrate, not the claim.
- `accountability` · `builds/policing-slate.md` · `## The insulation structure — mechanically true here` — **STAYS (contradicted)** — its *"the boss performs no acts, so insulation emerges"* is false since the identity build: every harm row carries `killerFor` and `institutionRecordFor(partyId)` blames the fielding institution (`AccountabilityLogic.ts`, `accountability.md § Every attribution has a PERSON and a PARTY`); insulation now holds only for an outfit that declares no institution — a content switch requirements must throw, already noted under the ledger's *Uncertain*.
- `accountability` · `builds/policing-slate.md` · `## Corpos and white-collar crime` — **STAYS** — *you cannot forge the record, but you can enter lies into it* and the detection asymmetry argue for an UNBUILT crime class (no fraud/skim/wage-theft producer, no press-reads-the-ledgers surface); the shipped half (deed vs claim) is `chronicle.md`'s already, and `accountability.md` is the harm-consent ledger, not business records — nothing there to hang it on.
- `accountability` · `builds/policing-slate.md` · `## Is crime evil, or chaotic? Neither — it is a social fact` — **STAYS** — *crime never moves alignment because it is crime* constrains an UNBUILT moral axis (the only `alignment` in `packages/server/src/mud` is combat-side alignment in `Party.ts`/`CombatLogic.ts`; `alignment-slate` is unbuilt) and an unbuilt crime record.
- `accountability` · `builds/policing-slate.md` · `## The pedagogy — what everyone learned from cop shows` — **STAYS** — *you learn why rights matter by needing them* is lens-1 pedagogy for the UNBUILT police institution (no `policing` Discipline, no arrest/custody, no policy vocabulary in code).
- `accountability` · `builds/policing-slate.md` · Part V *"Enforcement displaces. Governance dissolves."* + *"the gang is the employer of last resort"* — **STAYS** — the Gray's dynamics table and roster are wholly UNBUILT; kept in place with their sections.
- `accountability` · `builds/courts-slate.md` · (no Doctrine entries) — the ledger records *none beyond the settled section*, which it filed under Kept as design premise for a named `Left` item; nothing to process.
- `holding` · `tails/dorm-warren-slate.md` · `## The thematic payoff (keep it in view)` — **STAYS** — *half you, half a procedural agent* and *Dunny's frozen room is your own room's possible future* both name UNBUILT halves (one leaseholder per unit, no roommate NPC; the sealed room is staging prose with no code); the shipped dorm's why (`residence.md § The shell personalization`) is about prose-only theming, which this thesis is not about.
- `holding` · `tails/residence-ladder-design-pack.md` · `## Part 6 — Pedagogy: personal finance, property, and citizenship` — **GRADUATED (bullet 1) → `holding.md § The ascent gate` → `#### Why the gate is condition and not coin — the lesson it carries`** — the two-part gate SHIPPED (`TitleController.ascentRefusal`, `LeaseController`, `ParcelApi.heldUnitsOf`, `residence.ascent.minCondition`) and the doc carried the mechanical why (*the obligations are the cap*) but not the lens-1 why (*a personal-finance lesson lived rather than lectured*); a 12-line compaction inserted, the bullet replaced by a pointer. Bullets 2–3 (underwriting — credit unbuilt; citizenship as externality — nothing reads a neighbour's condition) and the *wrong-about* hooks (the unbuilt Stewardship Discipline's prompts) **STAY**.
- `holding` · `builds/stewardship-slate.md` · `## The doctrine line — zoning governs use, never self-expression` — **MOVED → handoff (`settlement-model.md` § 4 *Zoning exists because of density, not because of order*)** — the mechanism it constrains SHIPPED (`lib/parcel/LandUse.ts`'s closed six, `ParcelApi.landUseOf`, the plant/plot/subdivide consumers) and the rule is realm-level; `settlement-model.md § 4` already quotes the spill test (*consume shared capacity, or spill onto people who did not consent*) and *the nuisance is regulated, not the work*, but nowhere states the other half — *never self-expression; Tier 0 decorating stays ungoverned forever* — nor the corollary that property TYPES are content + a prestige attribute, not substrate (`grep -rni self-expression docs/subsystems/` is empty; the only hit in `settlement-model.md` is the Foundation table row). The insertable docs on my list (`holding.md`, `residence.md`) are the wrong home — the rule is the parcel's, not the dwelling's. ⚠ The slate section is LEFT IN PLACE until the coordinator applies the handoff; then it becomes a one-line pointer.
- `holding` · `builds/eternal-university-slate.md` · `## The north-star — why Eternal City` (+ three subsections) — **STAYS** — the campus finish it briefs is UNBUILT content (the `eternal-university` pack is Duncan Hall + the farm; no Quad, no strange-material rows, the gate a dead-end stub); the headline thesis (*un-genred not multi-genre · function legible, strangeness in the finish · liberal diegesis*) is already `story-bible.md § The shape of the world`, so nothing is lost by leaving the pillars and the four-technique authoring craft in the slate as the content brief; `design-philosophy.md` (Q6's candidate) is a MOVE target for the fidelity axis ONLY — refused. Coordinator note: if the bible is ever to carry the *craft* (strange materials · era-shift · impossible juxtaposition · whimsy as a genre-solvent), it lacks all four today.
- `physiology` · `builds/physiology-slate.md` · `## Where this leaves the model` (the three tiers of truth · the layers table · *every addition is additive* · the eight emergent rules · *what the model cannot express* · the recovery-ratchet boundary · the smallest proof scene) — **STAYS (read-only — nutrition & fitness build in flight, MR !269)** — nothing touched. Recommended outcome once the build lands: STAYS — the section is the slate's consolidated model of a system still landing in waves (the layers table already understates what shipped, as the ledger notes), and `vitals.md` / `harm.md` each carry their own why for what is in them; a reference doc must not carry the slate's map of what is not.
- `physiology` · `builds/physiology-slate.md` · Part 4b *the bed's product is recovery time* · Part 7d *the inn sells safety, not a heal rate* · Part 8 *medicine spends money, magic spends you* — **STAYS (read-only — build in flight)** — nothing touched. Recommended outcome afterwards: Part 4b's line is a GRADUATE candidate for `furnishing.md § Sleep as logout` / `vitals.md` (posture × `restQuality` recovery SHIPPED and the doc lacks the product framing) ⚠ but only after the away-recovery disagreement the compaction ledger records (`furnishing.md` integrates elapsed hours at the bed; `metabolism.md` + `harm.md` freeze while away) is settled — graduating *the bed's product is recovery time* onto a body that does not recover while you sleep would be a lie; Part 7d (no inn) and Part 8 (magic healing not built) STAY.
- `concealment` · `tails/concealment-detection-slate.md` · Thesis 3 *Content discipline (non-negotiable)* bullet — **GRADUATED → `concealment.md § Passive hints + active search` → `### Why a secret is a reward, never a path — the content discipline`** — the gate SHIPPED (`ConcealableMixin`, `search` + `SearchActivity`, `Exit.hidden` subsumed, the `DISCOVERY` realm, `concealmentHint`) and the doc documented the mechanism with no authoring rule for what may sit behind it (`grep -i 'required path\|shortcut\|reward'` over `concealment.md`/`stealth.md` was empty); a 10-line faithful compaction inserted, the bullet replaced by a pointer.
- `magic-items` · `builds/magic-items-slate.md` · `### Good/Evil is not morality — it's presence vs. the hollowing` — **DUPLICATE → `story-bible.md § Alignment — two axes` + `§ Evil — the hollowing`** (both `[settled]`; every clause checked present: *serves the conditions of experience*, *players are locked Good*, *NPC-only*, *the face is the forgery*, *unwitting*, *"constructs are evil" is reskinned bigotry*, *a world that runs perfectly and contains no one*); the three bullets replaced by a six-line pointer. The `### Consequence for reactive items` rule beneath it is the slate's own (the hollow-reactive consecrated item is UNBUILT — `magic-items.md:628` names *consecrated* only as a different working) and STAYS.

## Totals

| outcome | count |
|---|---|
| GRADUATED | 2 (residence-ladder Part 6 bullet 1 → `holding.md`; concealment-detection Thesis 3 → `concealment.md`) |
| DUPLICATE | 2 (pharma § The vocations → `vocations.md`; magic-items § Good/Evil → `story-bible.md`) |
| MOVED → handoff | 1 (stewardship § The doctrine line → `settlement-model.md § 4`) |
| STAYS | 23 (incl. 2 read-only physiology rows, 1 courts *no entries* row) |
| STAYS (contradicted) | 1 (policing § The insulation structure) |

## Handoff

### → `settlement-model.md` § 4 *Zoning exists because of density, not because of order*

Insert as a new subsection at the end of § 4 (after *What land use
actually needs is not more uses*, before the `---` that opens § 5), headed
`### Absorbed from stewardship-slate — The doctrine line: zoning governs
use, never self-expression`. ⚠ The doc already quotes the spill test in
its own words at the top of § 4 (*"does this activity consume shared
capacity, or spill onto people who did not consent?"*); the coordinator
may trim that one blockquote from the absorbed text, but the *never
self-expression* rule and the *types are content, not substrate*
corollary are new to the doc. After applying, replace the slate section
(`docs/slates/builds/stewardship-slate.md` l.37–66) with a one-line
pointer. Verbatim:

> ## The doctrine line — zoning governs use, never self-expression
>
> The property slate rules, twice and emphatically:
>
> > **Two throttles replace the permit:** the release gate + the compute
> > allowance… Governance is reserved for the **commons + shared rules** only —
> > **never your couch.**
>
> and *"Personal customization is not a governance act."* Any land-use system has
> to survive that rule, and it does — but only if scoped precisely. That rule was
> aimed at **authoring and self-expression**: may you decorate, script, build.
> Land use answers a different question:
>
> > **Does this activity consume shared capacity, or spill onto people who did not
> > consent?**
>
> Rearranging your furniture affects nobody. Forty head of cattle in a city
> apartment affects everybody. That is the line real zoning draws — nuisance and
> externality, not taste — and it sits squarely inside "commons + shared rules."
>
> **The rule to hold: zoning governs land use, never self-expression.** Tier 0
> decorating stays ungoverned forever. What gets governed is capacity and
> externality.
>
> **Corollary (already ruled, keep it):** property *types* — apartment / townhome
> / manor — are "**content + a `prestige`/`class` attribute; not substrate**."
> Prestige flavors; land use gates mechanics. Two different attributes that
> correlate. Only the second earns a place in the substrate.
>

---

## Coordinator (2026-09-22) — handoff applied

- `settlement-model.md § 4` — the stewardship doctrine line inserted as
  `### Absorbed from stewardship-slate — …` before § 5 (the doc's own
  spill-test blockquote kept once: the absorbed copy's inner blockquote
  folded into prose). `stewardship-slate.md` § The doctrine line → a
  one-line pointer.
- Decisions: compute-is-a-metaresource stays in the slate (no doc owns
  the topic; not minting one). `docs/resilience.md` not minted — the
  five spine sections stay in resilience-slate until a control ships.
