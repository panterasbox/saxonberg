# Doctrine-homing ledger — batch 6 (governance · textiles · wiki · renown · emotes · mixins)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code under
> `packages/server/src/**` and `packages/content/**`, never by the slate's
> own markers. Every MOVE's text is verbatim under `## Handoff` at the end.
> Write list: `docs/subsystems/governance.md`, `docs/subsystems/textiles.md`,
> `docs/subsystems/wiki.md`, `docs/subsystems/renown.md`,
> `docs/subsystems/emotes.md`, `docs/subsystems/mixins.md`.

## Rows

### Ledger `governance.md` — slate `docs/slates/builds/cooperative-slate.md`

Code check (2026-09-21): the polity substrate that exists is offices +
committees (`lib/governance/Office.ts`, `api/compact.ts`), the three
standing stocks (`lib/standing/`) and the conviction clock with **no verb
consuming it** (`influence.md` § Conviction). No legislature, no
delegation, no judiciary, no constabulary, no recusal, no sortition, no
elections, no archive — `grep -rli 'delegat|franchise|sortition|prosecutor'`
finds nothing polity-shaped under `packages/server/src/mud/`. Every entry
below argues for that unbuilt machinery, so every entry STAYS. Two facts
bear on the whole set: `docs/subsystems/governance.md` is the *Office
substrate* doc (seats), not the polity's design doc — none of this doctrine
is a *why* for a seat; and `docs/compact-political-science.md` (l.20) names
this slate as a **primary source** — "the rationale behind the provisions"
— so the slate is where a top-level doc already expects the argument to
live. No listed MOVE target owns the polity thesis (`design-philosophy.md`
is the fidelity axis only; the register is decisions).

- governance · cooperative-slate · `## Why this shape — native-digital governance` + `### Affordances …` + `### What does not dissolve` + `### The reframe` — **STAYS**; argues for the shape of a polity (batched elections → continuous allocation, delegation, computed deliberation, forkable exit) of which only the conviction clock exists, and the one shipped slice's why is already in `influence.md` § Conviction ("Why no pool"); the slate is the course doc's cited rationale source.
- governance · cooperative-slate · `## The two laws` intro + Law 1 wording discipline — **STAYS**; an operator/author writing rule (never *investor/share/equity/return/dividend*) with no other home — `governance.md` names no chamber and the Capital House is unbuilt (`influence.md`: capital faucet deferred).
- governance · cooperative-slate · `### The franchise is the deepest power — and who holds it` — **STAYS**; argues for a three-sided box (legislature specifies · executive implements · judiciary verifies) around the standing code — none of the three boxes exists; the influence stocks ship uncontained.
- governance · cooperative-slate · `## Parties & delegation` intro + `### Parties are delegation brands` + `### The design stance` — **STAYS**; delegation, the PM/confidence layer and the sortition judiciary it reasons about are all unbuilt.
- governance · cooperative-slate · `### A hill, not a wall — and the hill *is* the game` — **STAYS**; the friction stack it describes (2-of-3 chambers, a public archive, spirit-review, a generality requirement) is unbuilt end to end; only the outbound money seal (`banking.md`) exists.
- governance · cooperative-slate · `## Engagement — the substrate every guardrail rests on` (whole, incl. the 2026-07-31 correction box) — **STAYS**; the guardrails it says rest on engagement (delegation, amendment quorum, fork-not-quit) are unbuilt; the one shipped sliver — standing decays with inactivity, real-time — is already the *what* and *why* of `participation.md` § Two clocks, and that doc is outside this batch's insert list anyway.
- governance · cooperative-slate · `## Deliberation` intro (Robert's Rules rations a serial floor the medium lacks) — **STAYS**; there is no deliberation surface (no argument-map, no caucus, no bill lifecycle); the forums Subject layer that exists is not a legislature.
- governance · cooperative-slate · `### Code-first enforcement` → the surveillance thesis — **STAYS**; argues for the three-branch split as the leash on real-world sensor data; no branch exists, and no top-level doc owns the surveillance thesis (`compact-political-science.md` § design decisions has "Enforcement by code" as a seminar prompt, not this argument).
- governance · cooperative-slate · `### Rule-of-law enforcement — the mudcopping fix` — **STAYS**; constabulary, appeals judiciary, recusal and the mod log are all unbuilt; wizard = legislator + cop + judge is still literally the shipped state (the code-trust axis, `access.md`).
- governance · cooperative-slate · `### Moderation is the on-ramp` — **STAYS**; an adoption-path argument for organs (conduct code, ban appeals, tamper-proof mod log) none of which ship; the office/standing split it names as the one familiar seam is the only piece that exists and `governance.md` already states that split in its own words.
- governance · cooperative-slate · `### Institutions, not hierarchies` → the first three paragraphs — **STAYS**; argues for chartered executive institutions with their own staffing and judicial oversight; the office substrate ships heads (seats) and hands (committees) but no charter, procedure, rotation or review — the doctrine is the case for the unbuilt half.
- governance · cooperative-slate · `### The root-power floor` — **STAYS**; "make picking up the gun a visible coup" needs the transparency floor (archive) + cheap exit (fork) — neither ships; no top-level doc carries it (`polity-decision-register.md` mentions fork only as the exit degree, `stewardship-doctrine.md` is unrelated).
- governance · cooperative-slate · `### Separation that scales with population` → the governing property — **STAYS**; per-matter recusal, sortition and the transparency floor are unbuilt, so *never fails closed or wide open* is a property of a design, not of the code.

### Ledger `textiles.md` — slates `textiles-slate.md`, `cosmetics-slate.md`

Code check: the chain ships in `trade-textiles` / `trade-dyeing` /
`trade-tailoring`; `trade-dyeing/…/thing/household-vat.yaml` is rung zero
and its header + `DyeVat.ts:9-15` carry the domestic-trade reasoning;
`CraftedMixin` stamps the maker; no cosmetics pack, no hair/leather dye
path, no magic garment, no maker-prose routing (`SewController.ts` claims
it and does not perform it — the compaction ledger's handoff).

- textiles · textiles-slate · `### Which grid cells the trade actually touches` — **STAYS**; the footprint table is the map for magic-on-textiles, which is unbuilt (no garment is an item host, OQ16/OQ19 open); the one shipped fact — magic cannot spin, a mage is capital — is already `textiles.md` § Magic.
- textiles · textiles-slate · `### ⚠ The market: Fortnite's model is a MINT, and cannot be imported` — **GRADUATED → `textiles.md` § The three businesses › *Why the shape is buyer-side*** (second paragraph); the conserved chain + the maker's mark are shipped and the doc carried the businesses without the why the market is not a faucet. Slate: heading + pointer.
- textiles · textiles-slate · `### ⚠⚠ Re-sort the build around the BUYER` — **GRADUATED → `textiles.md` § The three businesses › *Why the shape is buyer-side*** (first paragraph); the shipped shape IS buyer-side (mill consigns, `measure` free, household pot rung zero) and only the code comment said why dyeing is the domestic trade. Slate: heading + pointer.
- textiles · textiles-slate · `## The four-lens pass (2026-09-02)` intro — **STAYS**; framing for the kept Lens 4 section, not a why for any mechanism; nothing to home.
- textiles · textiles-slate · `### Lens 4 · Gamification & self-improvement — the thinnest lens` — **STAYS**; the player-knowledge loop rides shipped derived-`clo`, but the section's load is the solvability constraint (garments specialized enough that no outfit is universally right) and the legibility tuning it feeds — OQ15, open and unverified; the argument requirements will need.
- textiles · cosmetics-slate · `# ⭐⭐⭐ The load-bearing find: dye is not a cosmetics input` — **GRADUATED → `textiles.md` § The chain, as it ships** (new paragraph after *Grade is staple length*); the structural decision shipped (dyeing is a textiles trade pack, no cosmetics industry exists) and the doc only listed hair dye as deferred without the reason there is no second chain. Slate: heading + pointer.
- textiles · cosmetics-slate · `## ⭐⭐⭐ Why this does not collide with *never selectable*` — **STAYS**; defends an unbuilt mechanism (socially legible graded grooming — no `Looks` cell, no barber verb) against an unbuilt rule (lineage's appearance substrate has not shipped); `identity.md` is outside the insert list and has no shipped consumer for it.

### Ledger `wiki.md` — slates `wiki-slate.md`, `notification-slate.md`, `spoiler-slate.md`

Code check: the wiki ships (`api/wiki.ts`, the components `help` /
`composition` / `image` / `infobox`, snippets, the two-axis reveal
model); no notification substrate exists (no `Notification` class, no
`notification_events` collection, no `NotificationApi`); the percept-side
spoiler protection (reveal conditions on `look` / `analyze` / the Scene)
does not exist — `spoiler` reaches `FieldMetaEntry` and the wiki tree
only (the compaction ledger's grep, re-confirmed).

- wiki · wiki-slate · `## Principle` → item 2 *Function over form* — **DUPLICATE → `wiki.md` § Why the wiki is out-of-fiction, and why it is ours** (*a reference reading surface, deliberately out-of-fiction … you look things up out-of-world*); the librarian-NPC aside is a not-built consequence, not a design the slate argues for. Slate: one-line pointer in place.
- wiki · wiki-slate · `### Content: MML-as-MDX` → *Transclude, don't copy — and a page exists only if it's editorial* — **GRADUATED → `wiki.md` § What this build does NOT do › *Rejected, not deferred*** (new paragraph after the two refusals); transclusion shipped (`composition`, `help`) and the doc carried *read, never copied* without the authoring test for when a page exists at all. Slate: one-line pointer.
- wiki · notification-slate · `## Principles` (the five) + `## ⭐ Not a second message bus` — **STAYS**; the substrate is UNBUILT end to end (no event, no subscription, no template); the thesis is exactly what requirements will need.
- wiki · spoiler-slate · *The load-bearing decisions* 1 + `## Principle` 1 (*best-effort, not security; open source is the limit*) + Q1's confirmation — **STAYS**; it states the rigor of the percept-side protection, which is unbuilt; the shipped wiki half is *stronger* (a server-side delete) so the sentence is not a why for anything in `wiki.md`; `design-philosophy.md` is a MOVE target for the fidelity axis only and does not carry it (grep: nothing).
- wiki · spoiler-slate · `## Principle` (the four-line restatement) — **STAYS**; restates decisions 1–4 of an unbuilt design, three of which the compaction ledger already flags as kept-but-contradicted (*earned* reveals vs `wiki.md` § appetite is not epistemics; *role* vs the shipped authoring ladder) — the contradiction is recorded there under *Uncertain*.

### Ledger `renown.md` — slates `reputation-slate.md`, `standing-mint-slate.md`

Code check: `lib/standing/RenownStanding.ts` + `RenownEvent.ts`, regard
in the belief realm, `RenownApi` — shipped; no `susceptibility` field on
any NPC, no CHA roll anywhere (the negative half holds); no
distributional impact statement, rater agency, disclosure law or audit
vocation (`grep -rli 'impact statement|rater|disclosure'` under
`packages/` → nothing on point).

- renown · reputation-slate · `## Principle — measure, don't assign` — **GRADUATED → `renown.md` § Why measure, don't assign** (new section after the intro); the mechanism shipped (regard + renown, no roll) and the doc stated the stance in one clause without the argument (*you type your actual words* → charisma is an output → the scalar unbundles into three; no die-gating). Slate: heading + pointer, susceptibility still named as the deferred knob.
- renown · standing-mint-slate · Parts 1, 5, 7, 8, 9 — **STAYS**; every mechanism they argue for is unbuilt (published weights as content, the impact statement, rater agencies, disclosure law, the audit vocation, wiki-carries-arguments), and two top-level docs name this slate as the canonical carrier — `measurement.md` § Silence on worth (*the argument is recorded in full in standing-mint-slate*) and `polity-decision-register.md` Tier 3 (*handed over intact*); the five tests already went to the register by the 2026-09-20 coordinator pass. The realm-level line *it is a morality score* is therefore neither MOVE (the owners point back here) nor DUPLICATE (they carry the conclusion, not the argument).

### Ledger `emotes.md` — slate `docs/slates/tails/emotes-slate.md`

Code check: `lib/social/Soul.ts` (`SoulMixin` on `Character`, the
`social.emote.render` setting, `.payload({ verb, emoji, tags })` — the
server emits both shapes); the `Emote` document kind; the client's
per-channel toggle is the deferred Layer 2 (`emotes.md` § What's deferred).

- emotes · emotes-slate · `## Principle` → the three claims — **GRADUATED → `emotes.md` § What emotes are vs. what they aren't** (*Why prose is primary*, new paragraph after the first); the doc stated claims 1–2 as facts and emoji-as-payload as a fact, but not why prose is primary (distinct · scales · abstracts — the `bogleg` lineage · keeps NPCs out of the uncanny valley) nor that the glyph is the recipient's choice, both of which the shipped shape realizes (server composes once, viewer's setting picks). Slate: heading + pointer, Layer 2 named as the still-deferred half.

### Ledger `mixins.md` — slate `docs/slates/tails/mixin-slate.md`

- mixins · mixin-slate · `## Principle` — **STAYS (contradicted)**; the first sentence (*a mixin earns its place by carrying state or behavior*) is the live test, but the *flag ⇒ property on `PropertiedMixin`* half is contradicted by the props rule (`CLAUDE.md`: a prop is only for a runtime-computed key; anything authored or narrowed on is a mixin field) and by `mixins.md` § Marker mixins (a pure flag for a cross-cutting lookup is a legitimate mixin), and the *sim-physics collapses to property tags* clause by what shipped (the slate's own § Properties on Thing marks it superseded). The contradiction was not in the mixins ledger's *Uncertain*, so a one-paragraph ⚠ note now sits beside the section in the slate; nothing inserted into `mixins.md` — the doc's § Before proposing a mixin already carries the test that replaced it (capability vs relation; base-class vs opt-in).

## Handoff

None. No entry in this batch qualified as a MOVE: the realm-level
doctrine here (the cooperative slate's polity thesis; the standing
mint's *it is a morality score*) is doctrine whose named top-level
owners — `compact-political-science.md`, `measurement.md`,
`polity-decision-register.md` — point back at the slate as the
canonical carrier of the argument, so it stays where they say it is.

## Totals

| outcome | count |
|---|---|
| GRADUATED | 6 (textiles ×3 · wiki ×1 · renown ×1 · emotes ×1) |
| DUPLICATE | 1 (wiki-slate Principle 2) |
| MOVED | 0 |
| STAYS | 21 |
| STAYS (contradicted) | 1 (mixin-slate Principle) |
| **entries** | **29** (governance 13 · textiles 7 · wiki 5 · renown 2 · emotes 1 · mixins 1) |
