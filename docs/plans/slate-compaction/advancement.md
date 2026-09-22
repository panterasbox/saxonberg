# Slate-compaction pass — advancement batch ledger

Seven slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `advancement.md` ·
`help.md`. Line numbers below are the ORIGINAL file's. Code evidence
grepped 2026-09-18 against `packages/server/src/mud/lib/advancement/`
(`ActSignature.ts` · `Advancement.ts` · `Competence.ts` ·
`CompetenceBand.ts` · `TranscriptEntry.ts`), the 67 `Discipline` rows under
`packages/content/**/idea/Discipline/`, `platform/idea/HelpCatalogue.ts` +
`HelpConcept.ts`, `CommandDefinition.getHelpText`, and
`platform/idea/cmd/medical/TreatController.ts`.

---

## docs/slates/builds/advancement-slate.md — 811 → 644 · Status PARTIAL → PARTIAL

The substrate half (Catalog · Transcript · `ActSignature` · Competence ·
conferral · the Dave's-Bar seed) is in code and in `advancement.md`; the
game half (loadout, guilds, focus, stakes, propagation, the social verbs)
is not — grep: no `loadout` / `warm` / `focus` / `reserve` anywhere in
`lib/advancement/*.ts`; `Competence.ts:29` still says *propagation along
`requires` / `synergizes` edges is deferred*; no `persuade` in any verb
YAML or controller; no `Law`. The cuts are all in the substrate half.

### Cut (SHIPPED · DOCUMENTED)
- `## Scope` → the *Catalog / Transcript / Competence substrate* bullet (48–50, 3) — code: `lib/advancement/*`; doc: `advancement.md § Three pieces`
- `## Skills as a content-graph` → intro para + the *Nodes* / *Edges* bullets (175–187, 13) — code: `Discipline` rows with `requires` / `specializes` / `synergizes` (e.g. `platform/idea/Discipline/mixology.yaml`); doc: `advancement.md § Catalog` (*edges are fields on the node*). Pointer line left
- `## The measurement substrate` → intro + the Catalog / Transcript / Competence bullets (211–236, 26) and the *Two faucets* bullet (239–244, 6) — code: `Discipline.ts`, `TranscriptEntry.ts` (`kind: deed | claim`), `Competence.ts` (BKT, bands); doc: `§ Three pieces`, `§ Catalog`, `§ Transcript` (*sibling store, not a chronicle realm*; *no consumer mints claims*), `§ Competence`. Pointer line left. ⚠ The *Subject* naming is the superseded part — see below
- `### Credit assignment` → the two problem/solution paras (269–291, 23) and the *Difficulty is a world-measurement* bullet (294–299, 6) — code: `ActSignature.ts`, `Advancement.creditSignature`; doc: `advancement.md § The act-signature` (the authored Q-matrix, one signature two outputs, difficulty a world-measurement). Pointer line left
- `## Every profession is a first-class path` → para 1, play-loop neutrality (488–495, 8) — doc: `advancement.md` intro (*does it know what a sword is*) + `§ The act-signature`. Pointer line left; the endogenous-ladder argument that follows is kept
- `## Buildable now` → the *substrate is largely shipped* para (756–761, 6), the *small Catalog* bullet (764–767, 4), the *Competence estimator* bullet (772–773, 2), the *revealed through performance* bullet (777–778, 2) — code: the seed rows, `Competence.derive`, `competenceBandFor`; doc: `§ The proof harness`, `§ Competence` (*the lock that beat you last week clicks open*)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Why "spend EXP on stats" is the anti-pattern` (95–112, 18) — code: per-Discipline `Competence.derive` over Transcript rows, difficulty-modulated slip/guess in `Competence.ts`, deeds minted by the resolving loop (`CombatLogic.ts:4500`, `TreatController`) → inserted at `advancement.md § Why there is no experience currency` (15 lines, new `###` after § Three pieces: the five XP failures and the lever each became; the one left standing — monotonic growth — is the deferred loadout's, not the estimator's)

### Superseded — cut
- `## The measurement substrate` → *Subject* as the node name, *a chronicle realm (or sibling)*, *templatePath-keyed competence* — by the code: `Discipline` keyed on `key`, a sibling `transcripts` collection → `advancement.md § Catalog` (*`key`, not templatePath, is the durable join*), `§ Transcript`. Named in the pointer line
- `## Skills as a content-graph` → *Grows without disturbing a running world — keyed on the durable templatePath* (190–196, 7) — by the code: keyed on `key` → `advancement.md § Catalog`. Fork / Canonize / Brands kept
- `## Guilds — institutions over the taxonomy` → the whole body incl. the slate's own 2026-07-28 superseded note (338–385, 48) — by `guild-slate.md` (venue / mentors / credential / affordance: 31 matches; tiers; the chartered training budget; *Open* canon). Heading + a one-line note left because `guild-slate.md:13` links this section and `§ Declared focus` as its substrate
- `## A worked Catalog slice — Dave's Bar` (681–717, 37) — by the code: the seeded slice is `bartending · mixology · recipe-knowledge · appraisal · darts · alcohol-tolerance` under the ISCED-F spine (`§ The proof harness`); the commerce / social leaves it also named (spirits lore, inventory, bookkeeping, salesmanship, reading-people, persuasion, pool, cards) never minted — the note points at `trade-roster-slate § the gap report`, which owns `bookkeeping`

### Kept (UNBUILT)
- `## Scope` (minus the one bullet) · `## The thesis` · `## The build-crafting guarantee` · `## Capacity, not decay — the loadout`
- `## Skills as a content-graph` → Fork · Canonize · Brands (no subtree forking / governed merge anywhere)
- `## The measurement substrate` → the three transfer profiles (no transfer between Disciplines — each estimated independently) · the `performance = technique × body` bullet (see Uncertain) · the loadout bridge para
- `### Credit assignment` → the propagation + information-weighting bullet (mixed: information-weighting shipped as BKT slip/guess; propagation not — kept whole per the paragraph rule) · the residual hard parts (review gate, learned signatures, calibration, novel acts — all in `advancement.md § Deferred`)
- `### θ is readable — treat it as a spoiler` (`§ Deferred` names *the raw-θ "spoiler" view*)
- `## Declared focus` (all) — no focus-context on `TranscriptEntry`; `guild-slate.md:212` cites it as *the advancement-slate substrate*
- `## Three orthogonal social axes` · `## Every profession` (paras 2–4) · `## Interlock` · `## Stakes` · `## Permanence, mortality, and multiplay` · `## The endgame` · `## The lifecycle` — design rationale for the game half; nothing in code
- `## Sensing the social Subjects` (all) — no `read` / `persuade` verb
- `## Buildable now` → the Transcript bullet (see Uncertain) · the loadout bullet · the seed Bartenders' Guild bullet
- `## Open problems` (spine)

### Uncertain — kept
- `## Declared focus` — the guild-slate's note (now cut) said its *chartered uniform training budget* **replaces this section's uniform-flat focus** with charter-allocated primary/secondary weights, while the focus-tagged-Transcript *substrate* stands. The section is kept verbatim and so still describes the uniform-flat shape; requirements must read it through `guild-slate § The conferred advantage`
- `## The measurement substrate` → *performance = technique × body* — the technique half shipped (`CombatLogic.ts:4500` reads `competenceBandFor(MELEE_DISCIPLINE)`); whether the encumbrance / vitals `body` term multiplies it as described I did not verify in `CombatLogic`; kept whole
- `## Buildable now` → *Situated practice → Transcript … gated by the Reserve and run through Activity* — deeds ship; no `reserve` reference in `Advancement.ts`, so Reserve-gated practice is unverified; kept
- `## Sensing the social Subjects` — names `RegardApi` (no such file under `api/`; regard lives in `lib/belief/`) and calls regard *built but inert, consumers deferred*, which is stale (hand-feeding regard, the pets bond). The design (`read` / `persuade` as regard's consumer) is unbuilt; kept
- `## Stakes` → *Death itself becomes "revive to a degraded reserve"* — `mortality.md` shipped `revive` / `reembody` + the `passage` floor; whether the revived body is *degraded* in the sense here is unverified
- `## Permanence, mortality, and multiplay` → *One character at a time* — `connection.md` documents multiplexing (many Interactives → one Avatar), not one-character-per-player; treated as unbuilt policy
- Framing para 3 (*the substrate ~40% shipped … the mechanism — skills, guilds, the growth loop — is a named gap*) is stale (skills shipped) but is the slate's purpose paragraph; kept as spine
- Overlaps for the cluster pass: guilds ↔ `guild-slate` (this slate is now a pointer + the focus substrate); the stakes engine ↔ `economy-slate` Law 2; the permanence distro ↔ `cooperative-slate`; the social verbs ↔ `npc-behavior-slate § Traits`

### Handoff
- none

### Status block
- Left: *the loadout · guilds (venue, mentors, credential, membership-as-affordance) · the Reserve-shaped stakes engine · declared focus · graph-propagated evidence · estimator choice + tuning · the learning-platform sensor bridge* → *the loadout (capacity-not-decay + warm-up) · guilds (…; a seed Bartenders' Guild — the institution design is guild-slate's) · declared focus (the focus-tagged Transcript) · the Reserve-shaped stakes engine · graph-propagated evidence + the three transfer profiles · estimator choice + tuning, the skill-signature review gate + learned signatures · the raw-θ spoiler view · the social verbs `read`/`persuade` over regard · fork / canonize / brand of the Catalog · the world-level permanence distro · the learning-platform sensor bridge (the `claim` producer)*
- Size: a build → a build

---

## docs/slates/builds/college-slate.md — 772 → 771 · Status UNBUILT → UNBUILT

Nothing it designs exists — grep: no `Course`, no item generator, no
`enroll`-as-contract, no exam hall; `HelpCatalogue` is the only
catalogue-with-browser. Every section is kept.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status line *"Status: sketch / pre-requirements. A design pass, not a spec. Written 2026-08-02."* (21–23, 3) — history; the scope paragraphs that followed it in the same blockquote are kept (they carry the slate's purpose)

### Graduated · Superseded
- none

### Kept (UNBUILT)
- everything else: `## Principle` (+ the guardrail + the corollary) · `## The load-bearing decision` · `## Assessment` (+ provenance, the viva, failure) · `## The procedural item generator` (all) · `## The classroom as a place` · `## The University is a composition` · `## Teaching is a job` · `## The social layer` · `## Two courses` · `## Content doctrine` · `## The wiki` (all) · `## Open questions` · `## Build order` · `## What this slate does NOT cover`

### Uncertain — kept
- `### The corollary — the course gates nothing` cites `AdvancementApi.bandFor` — retired by the Api OO sweep; the read is `competenceBandFor` on `AdvancementMixin` (`advancement.md § The owner face`). The decision it states is unchanged
- `### Provenance is already built` and the composition table's *Capability gating — already shipped* row describe shipped substrate (deed/claim, bands) as premises of an unbuilt design; kept because the college decision (*assessment results are Transcript entries, no new ledger*) is not itself built
- `## The classroom as a place` → *Laboratory: the Practicum, which already has five runnable experiments and a calorimeter* — no `calorimet`/`experiment` match under `packages/content/arcana/content`; unverified
- Overlaps for the cluster pass: the `predict` gate ↔ `inquiry-slate`; the nursing lab quest ↔ `medic-judgment-slate`; enrollment-as-contract + the sponsor ↔ `education-integration-slate` Part 4

### Handoff
- none

### Status block
- Left: unchanged items + *the viva · the course-cites-never-restates syllabus + contribution as coursework · Poli Sci 200 (unauthored)* — three UNBUILT sections the old list did not represent
- Size: a build → a build

---

## docs/slates/builds/education-integration-slate.md — 369 → 370 · Status UNBUILT → UNBUILT

No cuts. The second `> **Status: design conversation, captured…**`
paragraph is one paragraph with the slate's scope in it, so it stays
(the one-status-block rule cuts stale blocks, not framing).

### Kept (UNBUILT)
- Parts 0–6, the open questions, the not-covered list — every seam is unbuilt; the substrates it names as shipped (Positions, escrow, conferrals, the `command` Discipline row at `platform/idea/Discipline/command.yaml`) are premises, not the design

### Uncertain — kept
- Part 3's table row *Wage — works now* and Part 6's *command Discipline + formations* are true of shipped code; kept inside unbuilt sections
- Overlaps for the cluster pass: the sponsor ↔ `college-slate § Enrollment-as-contract`; the treasury lane ↔ `credit-slate` / `vocations.md`; the boundary ↔ `eternal-university-slate`

### Handoff
- none

### Status block
- Left: unchanged + *the legislature-curates-the-catalogue one-way rule* (Part 0, unrepresented)
- Size: a build → a build

---

## docs/slates/builds/help-slate.md — 307 → 225 · Status PARTIAL → PARTIAL

Wave 1 is in `help.md`; two things the slate designed shipped in a
different shape and `help.md` had not stated them: standalone concept
topics landed as authored **`HelpConcept` rows** (`platform/idea/HelpConcept.ts`;
rows under `trade-milling` / `trade-baking` / `trade-farming` …; the
concept projector in `HelpCatalogue.ts:344`), and co-located **`help:`**
prose on command views is rendered by `CommandDefinition.getHelpText()`
(`make.yaml:4`). The shell-side search, transclusion, the public face and
the taxonomy/mechanics projectors are not in code.

### Cut (SHIPPED · DOCUMENTED)
- the stale second status block *"Wave 1 shipped (2026-06) … Waves 2–3 shape proposed"* + its précis (12–31, 20) — history; every sentence of the précis is a section that remains or a cut recorded here
- See also → `persistence-architecture-slate.md` (*standalone help topics are plain Documents (a help collection)*) (67–68, 2) — existed only for the superseded item 3
- `## Content model` → item 1 *Projected structured values* (112–117, 6) — code: the command / api / collections projectors in `HelpCatalogue.ts`; doc: `help.md § The boot-warmed index`. Pointer line left. The *harvests, never registers* para (132–134, 3) — doc: same section
- `## The interface` → the uniform-Topic intro + schema block + *N projectors → 1 Topic* + the validate note (140–167, 28) and the `help` verb para (168–172, 5) — code: `HelpTopic` in `@saxonberg/types`, `HelpCatalogue.warm`, `HelpController`; doc: `help.md § The uniform HelpTopic`, `§ The boot-warmed index`, `§ The help verb` (bare fallthrough verb → concept → collection → api). Pointer line left; search/typeahead + transclusion paras kept
- `## Build order` → the Wave 1 para (233–245, 13) — doc: `help.md` (the whole Wave 1 doc)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## The line: help vs wiki vs inspection` (93–109, 17) — code: the three surfaces exist (`HelpCatalogue`, `wiki.md`, `look`/`analyze`) and the line is the rule that keeps a concept out of the wiki → inserted at `help.md § The line — help vs wiki vs inspection` (16 lines, new `##` before § Deferred: the mutability discriminator table + the goblin sentence + why help is developer-maintained)
- `## Content model` → item 3 *Standalone conceptual topics … Plain Documents in a `help` collection* (123–126, 4) — SUPERSEDED by the code (below) and the shipped shape was undocumented → inserted at `help.md § The concept projector — authored HelpConcept rows` (17 lines, new `###` after § Collections projector: the `HelpConcept` fields, template-row-never-instanced, why a data Idea and not a document kind, `help api` is the author surface / concepts are the pedagogy, the fallthrough rung)
- `## Content model` → item 2's shipped half (co-located `help:` on a command YAML) — the item is kept (its *help field on an immutable definition* is unbuilt) but the shipped half was undocumented in `help.md` → inserted at `help.md § Commands projector` (6 lines: the `help:` block renders below the synthesized syntax, one source, never restates the syntax line)

### Superseded — cut
- `## Content model` → item 3 — by the code: `HelpConcept` rows, not a `help` Document collection. One-line note left in the list

### Kept (UNBUILT)
- `## Principle` (mixed — 1–2 shipped as posture; 3–4 the shell substrate) · `## Content model` → item 2 + *help text goes where it goes* · `## The interface` → search + typeahead (the shell's Docs group + client slice) + the transclusion unit · `## Two faces over one index` (all) · `## Open questions` · `## Build order` → Waves 2, 3, Later · `## What this slate does NOT cover` · `## Once shaped into formal requirements` (mixed précis; no help requirements doc was ever written — `git log` shows none — so it is not history)

### Uncertain — kept
- `## Content model` → item 2 names *a `help:`/`description:` block on a command YAML* (shipped), *a doc-comment (TSDoc) on a class* (shipped, via `author-surface.json`) and *a help field on an immutable definition* (unbuilt — no Species/Unit projector); one bullet, kept whole
- `## Two faces` → *`api-model` is both — a topic-kind and a standalone public docs render* — the topic-kind half shipped (`api.*` topics); the standalone render did not; kept
- `## Once shaped into formal requirements` — half its bullets describe Wave 1; kept as a mixed précis rather than cut as history
- Overlaps for the cluster pass: the shared reading substrate ↔ `client-shell-slate`; the ceiling ↔ `spoiler-slate`; `{{help:…}}` ↔ `wiki-slate`

### Handoff
- none

### Status block
- Left: *Wave 2 — taxonomy/unit and mechanics projectors, co-located `help:` prose, the standalone `help` Document collection, the Docs search group, `{{help:…}}` transclusion, the inspection↔help bridge · Wave 3's pre-auth public face · L3 source surfacing* → *Wave 2 — taxonomy/unit and mechanics projectors, `help` fields on immutable definitions, the Docs group in the shell's grouped search + the client typeahead slice, `{{help:…}}` transclusion, the inspection↔help bridge · Wave 3's pre-auth public face + the standalone `api-model` docs render · L3 source surfacing* (co-located prose and the Document collection left the list — shipped / superseded)
- Size: a build → a build

---

## docs/slates/tails/trade-roster-slate.md — 267 → 268 · Status PARTIAL → PARTIAL

No body cuts — the roster tables and the gap report are single tables,
and the only shipped content is rows inside them. The status block was
wrong in both directions and is re-stamped from the catalogue (67 rows;
`find packages/content -path '*Discipline*' -name '<key>.yaml'` per gap
key): **8 of the 22 gap rows ship** — four under other names
(`stockmanship` ← animal-husbandry 0811 · `mining` ← extraction 0724 ·
`colliery` ← fuelcraft 0722 · `teamstering` ← haulage 1041) and four under
their own (`textiles` 0723 · `baking` 0721 · `brewing` 0721 · `butchery`,
⚠ at 0811 not the roster's 0721). The old stamp counted `smelting` as a
gap row (it closes none — the roster's `metallurgy` is a *knowledge* row)
and listed `fuelcraft` and `baking` as unminted (both ship). **14 remain**,
not 15 or 13.

### Graduated (SHIPPED · UNDOCUMENTED)
- the name mapping between the roster's gap rows and the shipped pack Disciplines, which no doc stated (advancement.md named only `mining`, `colliery`, `brewing`, `winemaking`, `butchery`) — code: the nine trade-pack rows → inserted at `advancement.md § Disciplines the trade packs seeded` (20 lines, new `##` before § Deferred: the four renames with codes, the four same-name rows, the `butchery` anchor discrepancy, the rows the roster never asked for, and why `smelting` does not close `metallurgy`). Nothing cut from the slate for it — the table rows stay

### Kept (UNBUILT)
- `## What this closes` (the four vocabularies — no `Trade` object, no `Means`/`Hook` types in code) · `## The roster` (all seven tables) · `## The gap report` · `## Faith lean is a WEIGHT` · `## Generation constraints` · `## Open questions`

### Uncertain — kept
- The ⭐ *does not exist yet* markers in the roster tables are stale for `animal-husbandry`, `extraction`, `fuelcraft`, `textiles`, `baking`, `brewing`, `butchery`, `haulage` (all ship, four renamed); a table cannot be cut below the paragraph, so they stand — read them through the status block
- `## The gap report` → *The catalogue has 41 rows, but 18 are `magic-*` — the non-magical world runs on 23* — now 67 rows / 49 non-magical; stale count, kept
- `## The gap report` → the `butchery` row proposes 0721; the shipped row anchors 0811. Whether the roster's code or the pack's is right is a Discipline question, not this pass's
- `## Open questions` Q1 (*does `Trade` need its own catalogue object*) — still open; no `Trade` anywhere
- Overlaps for the cluster pass: the gallery ↔ `lineage-slate`; the unminted rows ↔ each future trade pack's slate

### Handoff
- none

### Status block
- Left: *the 15 unminted Disciplines (foraging · fuelcraft · electrical-work · carpentry · masonry · leatherwork · ceramics · glasswork · baking · bookkeeping · apothecary · midwifery · letters · wayfinding · mechanisms) · the grid · the gallery* → *the 14 unminted Disciplines (foraging · metallurgy-as-knowledge · electrical-work · carpentry · masonry · leatherwork · ceramics · glasswork · bookkeeping · apothecary · midwifery · letters · wayfinding · mechanisms) · the trade × locality × `Means` grid itself · the lineage gallery that consumes it*
- Size: a wave → a wave

---

## docs/slates/builds/medic-judgment-slate.md — 243 → 244 · Status PARTIAL → PARTIAL

No body cuts. The reasoning layer is unbuilt exactly as the slate says:
`harm.md:523` still reads *dresses a body's worst bleeding wound* and
`TreatController.ts` is the only medical controller; no `assess`-withholds-
names change, no triage, no clinical-judgment Discipline (the catalogue has
`medicine` and `forensics` only). The second status paragraph carries the
audit finding and the inquiry parallel — content, not history — and stays.

### Kept (UNBUILT)
- `## The gap, precisely` · `## The Study scaffold` · `## This slate owns the diagnosis surface` (the 2026-09-15 merge with health-vertical — a decision about the design, kept) · `## The clinical-judgment loop` · `## The pieces` · `## The honesty rails` · `## Content-agnostic vs supply` · `## Build order` · `## Open questions` · `## Hand-off from the consequence build` (`Tariff` + `order treatment` ship — `platform/thing/Tariff.ts`, `retail.md`; the NPC medic brain behind them does not)

### Uncertain — kept
- Line references throughout (`harm.md:196-204`, `advancement.md:96-101`, `recordSignature :184`) are stale — `treat` is at `harm.md:522` now and `recordSignature` was retired for `creditSignature` on the mixin. The status block's pointer was re-stamped to the section rather than a line; the body's numbers stand
- `## Hand-off` → *`analyze patient` deliberately returns candidates plural and unranked* — no `analyze patient` / `candidates` match in `harm.md`, `mortality.md` or `AnalyzeController`; the claim is unverified here (it may live in the consequence build's own doc). Kept
- Overlaps for the cluster pass: the `predict`-gate spine ↔ `inquiry-slate`; the lab quest ↔ `college-slate`; the world medicine is practised in ↔ `health-vertical-slate`

### Handoff
- none

### Status block
- Left: unchanged + *the NPC medic brain behind `order treatment`* (the hand-off section, unrepresented); the stale `harm.md:196` pointer replaced by the section name; the shipped `Tariff` named in Status
- Size: a build → a build

---

## docs/slates/builds/inquiry-slate.md — 212 → 213 · Status PARTIAL → PARTIAL

No body cuts. grep: no `Law` class or catalogue, no `predict` verb
(`predict` matches are prose in `Fade.ts` / `Freshness.ts`), no
lab-notebook, no publish/replicate surface. The second status paragraph
is the slate's origin + thesis and stays.

### Kept (UNBUILT)
- `## The load-bearing distinction` · `## The discovery loop` · `## The pieces` · `## Misinformation — the wrong paper` · `## The unification` · `## Consumers` · `## Open questions / scope`

### Uncertain — kept
- See also → *`advancement.md` — the Competence measurement + the `RecipeKnowledge` "known-of → can-do" knowledge ladder* — `RecipeKnowledge` is in `crafting.md`, not `advancement.md`; the link is misdirected, kept
- `## The pieces` → *Instruments … identification-slate `analyze` seam* — `analyze` / `measure` ship (the status block says so); the row describes them as a reuse, not a build item, so nothing to cut
- Overlaps for the cluster pass: the `predict` gate ↔ `college-slate § Practical` + `medic-judgment-slate`; credibility ↔ `reputation-slate`; the library ↔ `wiki-slate` / `college-slate § The wiki`

### Handoff
- none

### Status block
- Left: unchanged + *deferred: credibility as a renown consumer, the published refutation, misinformation-as-crime* (the misinformation section's social layer, unrepresented)
- Size: a build → a build

---

## Batch totals

| class | count |
|---|---|
| cut (SHIPPED · DOCUMENTED) | 15 |
| graduated then cut | 4 (+1 graduation with nothing cut: the trade-pack name mapping) |
| superseded | 5 |
| kept (UNBUILT) | every other section — 7 slates, ~95 headings |
| uncertain | 24 flagged |
| absorbed / deleted | 0 |

Doc growth: `advancement.md` +35 (two sections), `help.md` +39 (three
inserts). No existing sentence in either doc was edited.

## Hardest calls

1. **The advancement slate's philosophy sections** (thesis, build-crafting,
   interlock, endgame, lifecycle — ~200 lines) are neither shipped nor a
   build item. The rule keeps anything not shipped; I kept them and did
   not inflate `Left` with them. A reviewer who wants the slate to be
   only a backlog will want a second pass with a different rule.
2. **The XP anti-pattern table** was graduated rather than kept. It is the
   *why* behind four shipped decisions and the doc had the decisions
   without the table's framing; the one unshipped row (monotonic → loadout)
   is named in the insert as deferred. Git has the table.
3. **The guild section** — the slate's own superseded note said the section
   *remains as the mechanic's rationale*. I cut it anyway: `guild-slate.md`
   holds the full institution design and cites this slate only for
   § Declared focus, which is kept verbatim. The heading stays so the
   guild-slate's anchor still lands.
4. **The `HelpConcept` shape** is the batch's clearest *shipped in a
   different shape*: the slate wanted a `help` Document collection, the
   code chose a data Idea and wrote down why. That reasoning existed only
   in a TSDoc header until now.
5. **Trade-roster arithmetic** — the old stamp said 7 ship / 15 left; the
   catalogue says 8 / 14, once `smelting` (real, but closing no roster row)
   and `metallurgy` (a *knowledge* row, still open) are told apart.
