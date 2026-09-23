# Doctrine-homing ledger — batch 5 (unlinked-7 · address · husbandry · prompt · credential · metabolism)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code, never by the slate's own
> markers. Every MOVE's text is verbatim under `## Handoff` at the end.

## Rows

### unlinked-7

- `unlinked-7` · `builds/warranty-slate.md` · `## The problem it exists to solve, and every cure is already in the game` — **STAYS**; the thing it argues for (a representation/warranty clause verified after delivery) is unbuilt — `lib/employment/Clause.ts` still has `CLAUSE_SHAPES = ["achieve","maintain"]`, no warranty/misrepresentation noun anywhere in `packages/server/src/mud` or pack `src/`; the lemons argument is the case requirements will need.
- `unlinked-7` · `builds/warranty-slate.md` · `## ⚠⚠ The design rule that keeps it honest` — **STAYS**; it is the binding constraint on the same unbuilt primitive (*the engine records what was claimed and what turned out true*); `measurement.md` has no rule about speech/claims yet (grep: no *lied* / *claimed* / *honesty* rule), and a reference doc must not carry the case for a thing that does not exist — re-home to `measurement.md`'s no-gauge rules when the build lands.
- `unlinked-7` · `tails/reference-lifetime-slate.md` · (Doctrine: none) — no entry; the ledger records *none (the one doctrine paragraph is the graduated why above)*. Nothing to process.
- `unlinked-7` · `builds/enforcement-slate.md` · `## The enforcement-mode vocabulary` → *the speed-camera doctrine* — **STAYS**; it is the rationale for a per-rule `enforcementMode` field that is unbuilt (`Government.ts` has no per-rule mode; *enforcementMode* / *speed camera* hit nothing under `src/mud` or any doc); the argument belongs with the vocabulary requirements will pick from.
- `unlinked-7` · `builds/enforcement-slate.md` · `## The evidence firewall` (first paragraph + *a crime genuinely unseen is genuinely unproven*) — **MOVED → handoff (`docs/measurement.md` § Tier A, row A15)**; `measurement.md` already ENTRENCHES the rule as eternity clause A15 (*Kernel omniscience never becomes diegetic evidence*) but carries only the headline and points back at the slate for the why — a realm-level truth the topic doc owns and lacks. ⚠ The slate paragraph is NOT cut here: it opens a list of unbuilt design (witnesses · instruments · confession) and paragraph granularity keeps it whole; the coordinator applies the insert and, if they choose, trims the slate to a pointer at A15.
- `unlinked-7` · `builds/enforcement-slate.md` · `## The two layers — intrinsic vs. social` (the table paragraph + the *never admissible* paragraph) — **MOVED → handoff (`docs/measurement.md` § Part 1 — The three layers)**; every member of the table shipped (`disposition_events`/`trait.md`, `transcripts`/`advancement.md`, per-viewer `belief.md`, `regard`/`renown`, `trait.md:114` regard baseline) and no doc states the split or the admissibility rule (grep *intrinsic* / *admissible* across `measurement.md`, `trait.md`, `belief.md`: nothing) — the name for a split the code already observes belongs with the layers. The middle paragraph (*a lie moves your `honesty` axis the moment you tell it*) is the unbuilt write already in `Left` and STAYS. ⚠ Slate text left in place for the coordinator to cut after the insert (the build paragraph depends on the table).
- `unlinked-7` · `builds/branch-policy-slate.md` · `## Where it lives, and how it resolves` → *the loss aligns with doctrine rather than fighting it* — **STAYS**; the sentence argues for the resolution shape of a `writers` policy document that is unbuilt (`DocumentKinds.ts` has no `policy` kind; `writers:` hits nothing), and it is one sentence inside an unbuilt section — paragraph granularity forbids lifting it.
- `unlinked-7` · `tails/connection-quality-slate.md` · `# Part 1 — The rule, and what it does not say` — **STAYS**; the rule (*measure freely, never let it reach a formula* + publishing as the transparency counterpart) is the constraint on an unbuilt publish path — `roundTripMs` lives only in `packages/client/src` (`websocket.ts`, `ConnectionChip.tsx`), nothing server-side reads the stamp, no `connectionQuality`/latency in `packages/types`; the entitlement rule itself is `freight-slate`'s, restated here. Candidate for `measurement.md`'s layer-3 list once anything publishes.
- `unlinked-7` · `tails/connection-quality-slate.md` · `# Part 2 — The hazard that is not obvious` + `## The distinction that does the work` — **STAYS**; *latency is a fact about your CONNECTION, not your CHARACTER* (player-scoped · never a world fact · opt-in and ephemeral) is the design constraint on the same unbuilt publish; nothing is stored or queryable today because nothing is built, not because a rule holds it.
- `unlinked-7` · `tails/connection-quality-slate.md` · Part 3's *bands over numbers is the house rule* blockquote — **STAYS**; substantively `measurement.md`'s no-gauge rule, but the paragraph closes with the slate's own reason (*plus a social one*) and is the argument for an unbuilt band — it goes when Part 3 builds.
- `unlinked-7` · `builds/wizard-axis-cleanup-slate.md` · `## The rule, as stated by the user` — **STAYS**; the rule's first half (*wizardness is TypeScript access*) is already `access.md § The code-trust lockdown` (*that power is the wizard capability and nothing else*) + `§ Every predicate fails CLOSED` (*a missing authority is not a grant*), but the second paragraph (*the seat is missing, not that a wizard should do it*) is the case for the cleanup itself, which is unbuilt — 32 live `isWizard`/`requiresWizard` sites remain across `src/mud` + `packages/content`, no `lint:wizard-axis`, `config.yaml` still `requiresWizard`. Graduate to `access.md § Why` when W0 lands (the sentence already sits as the comment on `AccessLogic.isAgentOf`).
- `unlinked-7` · `builds/altar-slate.md` · `## Sentient sacrifice — the forbidden` — **STAYS**; the altar and its rite are unbuilt (no `altar`/`sacrific`/`consecrat` class, verb or row — five incidental prose hits only), so the constraint it carries (*never a player affordance*) is the case the build inherits. Noted: the theology is already in `story-bible.md § Sacrifice — blood, presence, and the Feed` in fuller form and the slate says so; the bible is lore, not one of the doctrine-pass homes, so nothing is cut — the coordinator may reduce it to a pointer.
- `unlinked-7` · `builds/altar-slate.md` · `## The Ordinance mirror — the Feed as the anti-altar` — **STAYS**; same unbuilt mechanism; the bible carries the Feed-as-inverted-sacrifice but not this formulation (*the altar is the consent the Ordinance deletes* — grep: absent from `story-bible.md`), so it is not even a duplicate.
- `unlinked-7` · `builds/altar-slate.md` · `## Sacrifice — the mechanic` → *recognition, never reward* — **STAYS**; the load-bearing guardrail on an unbuilt rite, already in `Left` with the fork it governs.
- `unlinked-7` · `builds/alignment-religion-slate.md` · `## Alignment` (the DRG paragraph) — **STAYS (moved to `docs/slates/builds/alignment-slate.md § Absorbed from alignment-religion-slate — Alignment (the DRG lesson)` by the cluster pass, `cluster-alignment.md`)**; the file is retired and the section lives in a slate outside this assignment; touched nothing. (The cluster ledger already flags the closing *PvE-narrative* claim as contradicted by shipped consented PvP.)

### address

- `address` · `builds/towns-slate.md` · `## ⭐ The frame: every town is two halves` — **MOVED → handoff (`docs/settlement-model.md`, new `## Absorbed from towns-slate — The frame: every town is two halves` after § 3 Specialization)**; a realm-level truth the skill names as `settlement-model.md`'s topic (*the two halves*), and the doc lacks it (grep: no *support half* / *economic base* / *basic sector*); the functional halves it names ship (Rejection's smelt, Hinkley's parcels), the support halves are content. Slate text left in place for the coordinator to cut after applying (whole section, 80–107).
- `address` · `builds/towns-slate.md` · `## ⭐⭐ The realm geometry — Terminus is the clearing house` — **MOVED → handoff (`docs/settlement-model.md` § 8 Connective tissue, as `### Absorbed from towns-slate — Terminus is the clearing house` before *The cadences are the character*)**; § 8 has *goods are a star* but not the clearing-house relation, and the three centralities it cites are shipped content (`banksAt: goodkin` across `rejection/…/idea/*.yaml`; `terminus/…/terminal/thing/arrival-terminal.yaml`; the university at `terminus/city/campus`). Slate text left in place pending the coordinator (§ 109–146, excluding the `### The second geometry` subsection which is the slate's own).
- `address` · `builds/towns-slate.md` · `## The connective tissue` → the von Thünen triple — **MOVED → handoff (`docs/settlement-model.md` § 8, as `### Absorbed from towns-slate — the realm layout is already von Thünen` after the clearing-house insert)**; *von Thünen* appears in no doc (grep `docs/*.md docs/subsystems/*.md`: nothing) and the skill names it as `settlement-model.md`'s topic; the first bullet is shipped fact (`trade-smelting` at Rejection), the other two are the layout's rule. Slate text (the lead sentence + three bullets, 585–595) left in place pending the coordinator; the closing freight pointer stays regardless.
- `address` · `builds/delivery-slate.md` · `## Principle` (the six) — **STAYS**; the six argue for one delivery substrate with providers, coverage and anchors, which is unbuilt (no `Provider`/`coveragePrefix`/anchor class under `src/mud` or pack `src/`; `address.md § What's NOT in this build` lists *providers / coverage-as-service, anchors, provider-grade off-grid* as exactly the gap); the shipped instances (the address tree, the acoustic/implant split, `Conduit`/`ManaMain`) are each documented in their own doc, and a Why on `address.md` would carry the case for the unbuilt five-sixths.
- `address` · `builds/delivery-slate.md` · `### Distribution` → `#### ⭐⭐ The unifying concept: natural monopoly` — **MOVED → handoff (`docs/settlement-model.md` § 8, as `### Absorbed from delivery-slate — The unifying concept: natural monopoly`)**; realm-level pedagogy the skill names as `settlement-model.md`'s topic (*natural monopoly*), and neither `settlement-model.md` nor `compact-political-science.md` has *monopol* anywhere; two of its three teachers ship (`water`'s `Conduit`, `trade-haulage`), the turnpike does not, but the lesson is the realm's not a build's. The trailing *Boundary* paragraph (metering belongs to residences) is the slate's own and stays. Slate text left in place pending the coordinator (lines 324–350). Coordinator may prefer `compact-political-science.md` (the ledger's suggestion); the skill's list decided it here.
- `address` · `builds/delivery-slate.md` · `### The vertical seam (gamification — validation lens, not a build)` — **STAYS**; self-described as a lens, and the service point with an `externalBinding` it validates against is unbuilt (grep: no `externalBinding`); the binding pattern it cites is already `streaming.md`'s.

### husbandry

- `husbandry` · `tails/farming-slate.md` · `## The spine (non-negotiable)` — **STAYS (contradicted)**; kept whole as the slate's thesis: item 8 (*Magic is pharmacology. No magic engine word*) is contradicted by the shipped Effect substrate (`magic.md`, `CasterMixin`, `docs/arcane-science.md`); item 4 (genes as reaction norms) is unbuilt (no genome/allele anywhere); items 2, 3, 6 are documented already (`husbandry.md § GrowthProfileData` *one biology, many plants*, `§ The clock rule`, `§ Deferred seams` *science is the skill ceiling*) but the list is one argument and the contradiction must be reconciled by requirements, not inherited.
- `husbandry` · `tails/farming-slate.md` · `### Orchards` → the tenure blockquote — **STAYS**; it argues for property's gameplay case through an orchard — a multi-year land use that is unbuilt (`soil.md § D7` lists *orchard* as a row with no producer; `forestry.md § Deferred seams` names it as the Cover seam's future third instance).
- `husbandry` · `tails/farming-slate.md` · `## Numbers, instruments, competence` — **GRADUATED → `husbandry.md § Advancement › Why competence sharpens instruments and never multiplies yield`** (bullets 1–2 only, +14 lines): the mechanism shipped in the negative and the doc had the what without the why — `horticulture` confers nothing and no yield multiplier exists (`husbandry.md § No conferrals, deliberately`), the survey ladder's error band is per-viewer and earned (`soil.md § D5`) — while the reason (*a yield bonus lets you grind past the science instead of through it*) was stated nowhere. Slate bullets 1–2 replaced by a pointer; bullets 3–4 (the wiki-lookup defence, the scientific-method loop) **STAY** as the argument for the unbuilt instrument loop; bullet 5 **STAYS (contradicted)** — *GDD = the `∫thermal` integral* did not ship (maturity accrues by good time with `cold` as a limiting factor, `husbandry.md § A fifth limiting factor`); Liebig's minimum did (`§ Three inputs, combined by the limiting factor`).
- `husbandry` · `tails/farming-slate.md` · `## Prior art` — **STAYS**; an influences table argues for no mechanism and has no reference-doc home; it is the slate's provenance and goes with the slate.

### prompt

- `prompt` · `tails/prompt-stack-slate.md` · `### Compose vs. custom` — **GRADUATED → `prompt.md § Surface › Why the kind canon is small — compose, don't invent`** (+19 lines): the canon it argues for shipped (`PromptApi` = `choice`/`confirm`/`text`/`mqlObject`/`mqlMany` + the `validate` hook, `prompt.md § Surface`) and the doc carried the surface without the reason it is small and closed; section cut to a one-line pointer.
- `prompt` · `tails/prompt-stack-slate.md` · Non-goals bullet *Custom prompt kinds outside the canon* — **DUPLICATE → `prompt.md § Why the kind canon is small`**; the same doctrine restated as a boundary; bullet reduced to a pointer so the Non-goals list still names the boundary.

### credential

- `credential` · `tails/credential-wallet-slate.md` (retired, 132 → 0 in the compaction pass) · `## Cross-references` *First tenant / driver* line — **DUPLICATE → `credential.md § Deferred` (the deputization bullet, l.194–203)**; the compaction pass already moved it verbatim into the doc and deleted the slate, so there is nothing left to home — verified the proctors-office pathway (`eternal-university-narrative-slate.md` §14) sits in the doc. Nothing changed. (The ledger's other slate, `acquisition-slate.md`, has no Doctrine entry.)

### metabolism

- `metabolism` · `tails/metabolism-slate.md` · `## Physics vs. game design` — **DUPLICATE → `metabolism.md § The in-session clock + presence freeze` (the one fairness-over-physics override, stated as *the deliberate spot where the game-design fairness constraint overrides the physics*) + `§ Rates` / `§ The slow stocks` (*every rate is a per-read `dial()` under `body.*`*; `METABOLIC_DEFAULTS` as defensible defaults)**; the structure it names as physics shipped (the stores, coupled recovery, the cascade, lazy reconcile, the nutrient ledger + toxin burdens — `§ Composition`, `§ Coupled recovery`, `§ The cascade`, `§ Wave 2`) and the doc already carries each half. ⚠ **READ-ONLY** (build in flight, `build/economic-bootstrap` / nutrition-fitness MR !269): row recorded, slate untouched; the cut to a pointer is that build's sweep.

## Totals

| outcome | count |
|---|---|
| GRADUATED | 2 (`husbandry.md`, `prompt.md`) |
| DUPLICATE | 3 (prompt Non-goals bullet · credential — already homed by compaction · metabolism — read-only, not cut) |
| MOVED → handoff | 6 (`measurement.md` ×2 · `settlement-model.md` ×4) |
| STAYS | 16 (incl. 1 *moved by the cluster pass* · 1 *no entry*) |
| STAYS (contradicted) | 1 (the farming spine; plus the GDD bullet inside the graduated section) |

## Coordinator

- **No MOVE has been cut from its slate.** Six sections are reproduced verbatim below; apply each into the top-level doc, diff, then reduce the slate section to a pointer. The enforcement pair are partial-paragraph moves (the rest of each section is unbuilt design); the towns/delivery four are whole sections minus a trailing pointer / boundary paragraph, as each entry says.
- `delivery-slate § natural monopoly` — the skill's list puts it under `settlement-model.md`; the compaction ledger suggested `compact-political-science.md`. Neither doc has *monopol* today. Pick one.
- `altar-slate`'s two theology sections duplicate `story-bible.md § Sacrifice` by the slate's own account; the bible is not a doctrine-pass home, so they were left. Cut to pointers if the bible is judged sufficient.
- `metabolism-slate § Physics vs. game design` is a DUPLICATE the in-flight build's sweep should cut (read-only here).

## Handoff

Every MOVE's text verbatim. ⚠ None of these slate sections has been cut:
the coordinator applies the insert into the top-level doc, diffs it, then
cuts the slate section to a one-line pointer (the compaction rule — text
leaves the slate only after it is in the doc).
### → `docs/measurement.md` § Tier A — row A15 *The evidence firewall*: add as a short paragraph directly under the Tier A table (or as the A15 row's own footnote), headed `#### Absorbed from enforcement-slate — The evidence firewall (why A15)`

Source: `docs/slates/builds/enforcement-slate.md § The evidence firewall`, the opening paragraph's two sentences and the *Concealment stays load-bearing* paragraph (lines 77–79, 88–91). The bullet list between them (witnesses · instruments · confession) is unbuilt design and stays in the slate.

**The kernel's omniscience serves exactly two masters — the
record's integrity, and meta-moderation. Diegetic law enforcement
gets none of it.** In-fiction justice gathers evidence in-fiction:

Concealment stays load-bearing: **a crime genuinely unseen is
genuinely unproven**, and that is a feature — a world where guilt is
always provable needs no courts, values no reputation, and has no
game in it.

### → `docs/measurement.md` § Part 1 — The three layers: new subsection `### Absorbed from enforcement-slate — The two layers, intrinsic vs. social` (suggested: after the three-layer table and its blockquote, before the *⚠ An earlier draft* paragraph — or at the end of Part 1)

Source: `docs/slates/builds/enforcement-slate.md § The two layers — intrinsic vs. social`, the opening paragraph + table (lines 160–171) and the rule paragraph (lines 179–186). The middle paragraph (*a lie moves your `honesty` axis the moment you tell it*) is the unbuilt write in the slate's `Left` and stays there. ⚠ Verbatim by the MOVE rule; the coordinator may drop the *(User, 2026-07-31: …)* attribution parenthetical on apply — the doc rule is no conversation.

**(User, 2026-07-31: "traits are intrinsic — they represent who you
are when no one else is around, so those interactions can be
completely private and hardwired with no adjudication.")** This
names a split the codebase has been observing without a word for it:

| | **Intrinsic layer** | **Social layer** |
|---|---|---|
| **Measures** | what you *are* | what others *know* |
| **Authority** | kernel — it knows what happened | per-viewer, contested |
| **Truth** | exact | honestly foggy |
| **Adjudication** | **none, ever** — nobody is being sanctioned; this is characterization, not judgment | courts, process, appeal |
| **Members** | traits (`disposition_events`), alignment, competence (`transcripts`) | belief, regard, renown, testimony, the record-as-evidence |


**The rule between the layers: the intrinsic layer is never
admissible in the social layer.** No court subpoenas your traits; no
constable reads your disposition ledger. But the intrinsic layer
**colors** the social one — traits already feed the regard baseline
— so people *sense* something about you without ever proving it.
"He seems shifty" is honest inference; "the ledger proves he lied"
is inadmissible. Which is exactly how character works in life.


### → `docs/settlement-model.md` — new section `## Absorbed from towns-slate — The frame: every town is two halves` (suggested: after § 3 Specialization, before § 4 Zoning)

Source: `docs/slates/builds/towns-slate.md § ⭐ The frame: every town is two halves` (lines 80–107).

> **The functional half is why the town exists. The support half is what
> the work does to the people who do it.**

This is economic base theory, and naming it matters because it makes the
"creative" half *non-arbitrary*. The basic sector exports — ore, fruit,
labor. The non-basic sector exists to serve the people the basic sector
employs. A mining town has a boarding house because miners are single men
on rotation. A fruit valley has a packing house because fruit rots.

So the generator for each town's second half is **one question**, and it
is not "what would be cool here":

> *What does this work do to the people who do it?*

That constraint is what makes the support half both **teachable** (it is
real economic geography, not decoration) and **expressive** (the answer
is different in every town, and the difference is character).

⚠ **Both halves are content, but they are not the same KIND of work.**
The functional half is mostly mechanism and mostly shipped — it wants
substrate, brains and gates. The support half is mostly rooms, cast and
prose, and it wants almost no engine work at all. That asymmetry is why
this slate is cheap relative to its payoff, and why it can be cut into
per-town slices that ship independently.

### → `docs/settlement-model.md` § 8 Connective tissue — new subsection `### Absorbed from towns-slate — Terminus is the clearing house` (suggested: right after the *Information is a complete graph* blockquote and its paragraph, before `### ⭐⭐ The cadences are the character`)

Source: `docs/slates/builds/towns-slate.md § ⭐⭐ The realm geometry — Terminus is the clearing house` (lines 109–146; the `### The second geometry` subsection that follows is the slate's own and is not part of this move).

The relation that was missing from every prior locality doc:

> **The towns do not trade with Terminus. They trade with each other
> THROUGH Terminus.**

| town | sends the city | takes from the city |
|---|---|---|
| **Rejection** | ingots — the input to every tool, rig, fixture and fitting | tools, timber, food, wages, and *people* (nobody is born there) |
| **Hinkley Hills** | nothing material — **labor**, and demand | everything; its income *is* Terminus wages |
| **Heart's Delight** | food — the only town that feeds the city | equipment, capital, the market, seasonal hands |

Rejection's storekeeper sells food grown in the valley. The valley's
cannery buys tin smelted at Rejection. **They never meet.** Terminus is
the room they meet in — which is what makes the market square
load-bearing rather than scenery: it is not where you shop, it is where
the realm clears.

Three ways the city is already the centre in **shipped** content, none of
them said out loud until now:

- **Capital.** Rejection's businesses declare `banksAt: goodkin` — the
  counting-houses. Every town's money is in a Terminus vault. That is not
  a convenience; it is why a river authority would ever have teeth, since
  the institution that can freeze an account can settle a diversion
  fight.
- **Entry.** The only arrival terminal is in Terminus
  (`/world/terminus/terminal/thing/arrival-terminal`). Every player lands
  in the city; every other town is somewhere you *choose* to go. The
  towns are destinations, never origins.
- **Knowledge.** The university is in the city. Every Discipline the
  towns exercise gets **credentialed** somewhere else.

⭐ So the city holds the money, the door and the schooling; the towns hold
the ground, the ore and the food. That is a real political geometry, and
it is the reason Terminus — founded by people who wanted no governing —
ends up governing anyway without ever passing a law.

### → `docs/settlement-model.md` § 8 Connective tissue — new subsection `### Absorbed from towns-slate — the realm layout is already von Thünen` (suggested: directly after the clearing-house insert above)

Source: `docs/slates/builds/towns-slate.md § The connective tissue — goods and services in and out`, the lead sentence and the three bullets only (lines 585–595); the closing *Freight shipped →* pointer stays in the slate.

This is not a separate feature. It is what makes the three towns
*necessary* rather than arbitrary, and the realm layout is **already von
Thünen** — nobody has cashed it:

- heavy, low-value, loses mass on processing → **process at the source.**
  Rejection smelts on site rather than shipping ore. Already true, already
  right, and it happened by good instinct rather than by rule.
- perishable, high-value, short window → **preserve, or be close.** Heart's
  Delight gets the cannery and the drying yards for exactly this reason.
- residential outbids agriculture near the centre → **Hinkley is the near
  ring** and grows gardens, not fields.

### → `docs/settlement-model.md` § 8 Connective tissue — new subsection `### Absorbed from delivery-slate — The unifying concept: natural monopoly` (suggested: after the von Thünen insert; alternative home the coordinator may prefer: `docs/compact-political-science.md`)

Source: `docs/slates/builds/delivery-slate.md § Distribution › #### ⭐⭐ The unifying concept: natural monopoly` (lines 324–350; the trailing *⚠ Boundary* paragraph is the slate's own and stays).

The **turnpike trust and the utility are the same business** — high
fixed cost, low marginal cost, one network serving everyone more
cheaply than two could. That is *why* roads, water, power and rail are
**rate-regulated rather than competitive**, and why the toll schedule
being a **`parameter` clause in law** generalizes directly to **the
tariff**.

> **The polity learns "natural monopoly" by meeting it three times** —
> the turnpike, the utility, and then the freight corpo, which is when
> someone finally notices it is a *pattern* and legislates the general
> rule.

> **⭐⭐ And the three BUSINESSES teach three different monopoly SHAPES**
> — completed in [sanitation-slate § The salvage yard as a
> business](./sanitation-slate.md). The **turnpike**'s power is
> **geographic** → **rate cap**; the **depot**'s is a **network
> effect** → **common carrier / non-discrimination**; the
> **salvage-and-materials** arm's is **vertical integration** (own the
> mines *and* the scrapyards) → **structural separation**. *Three
> monopolies, three remedies — a polity that meets all three has been
> taught competition policy by living in it.*
>
> **And a fourth business teaches the flip side: the SECOND-HAND MARKET
> has no monopoly shape at all**, because its inventory is
> **non-fungible and locally sourced** — you cannot corner a market
> where every unit is different. **Monopoly needs fungibility and
> scale; uniqueness defends competition.**

---

## Coordinator (2026-09-22)

- The six top-level handoffs (`measurement.md` ×2, `settlement-model.md`
  ×4) are DEFERRED to the end-of-pass top-level commit, applied once
  alongside doctrine-3's § 7/§ 8 handoffs so each section receives one
  block; the slate sections stay in place until then.
- altar's two theology sections: left (story-bible is not a doctrine-pass
  home). metabolism's Physics-vs-game-design duplicate: for build-3's
  sweep.
