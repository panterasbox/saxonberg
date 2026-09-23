# Doctrine-homing ledger — batch 7 (unlinked-6 · race · bulk · party · mql-subscription)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code under
> `packages/server/src/**` + `packages/content/**`, never by the slate's
> own markers. Every MOVE's text is verbatim under `## Handoff` at the end.
> Write list: `docs/subsystems/race.md`, `docs/subsystems/bulk.md`,
> `docs/subsystems/party.md`, `docs/subsystems/mql-subscription.md`; the
> unlinked-6 slates have no insertable doc (Handoff only). unlinked-6's
> `eager-residency-slate` and `client-audio-slate` carry no Doctrine entry
> (the ledger says *none* for each) — nothing to process there; the twelve
> unlinked-6 entries are odometer (3) · deduction (3) · mirror (2) ·
> record-integrity (1) · agency (3).

## Rows

### unlinked-6 · `docs/slates/builds/odometer-slate.md`

- unlinked-6 · odometer-slate · the load-inert rule blockquote — **STAYS**; the rule is *about* the odometer (no system may depend on it), and no counter store, projection or milestone exists anywhere under `packages/server/src` / `packages/content` (the haulage trade's *odometer failure* comment cites the bright line as a term of art, it builds nothing); a reference doc must not carry a review rule for a thing that does not exist. No top-level doc owns it (`design-philosophy.md` is the fidelity axis only).
- unlinked-6 · odometer-slate · `## Principle — XP fuses two things; the lie is the fusion` — **STAYS**; the split argues for the odometer half (the journey tally), which is unbuilt; the capability half is already `advancement.md § Why there is no experience currency`, stated from the other side, so nothing here is missing from a shipped doc.
- unlinked-6 · odometer-slate · `## The bright line — downstream-inert` + `## Why this dissolves the balance problem` + `## Why a powerless counter is engaging` — **STAYS**; three arguments for a tally with no power, and there is no tally; requirements for the capstone build need them intact.

### unlinked-6 · `docs/slates/builds/deduction-slate.md`

- unlinked-6 · deduction-slate · the *Scope discipline* blockquote (thin generic spine, types bring their own mechanics) — **STAYS**; it prescribes the shape of the quest spine, and no quest class, mixin or view exists (`packages/server/src/mud`, `packages/content/*/src`, `content/*/cmd/` — none); it is the requirements-time constraint on an unbuilt thing.
- unlinked-6 · deduction-slate · the *Hard line — not forums* blockquote (truth is shown, not argued or voted) — **STAYS**; it bounds the unbuilt deduction resolution against the shipped forums; `forums.md` states nothing about adjudicating *what happened* (grep `adjudicat|investigation|what happened`: none), and the boundary only has meaning once there is an investigation to bound — it goes into `forums.md` as one line when the spine ships.
- unlinked-6 · deduction-slate · `## One command language, two surfaces` → the *differentiator* paragraph — **STAYS**; the concrete claim (a shared corkboard is trivial in text) is the case for the unbuilt board card; the general truth it instances (text collapses shared surfaces; text-first is social-first) is already `interaction-philosophy.md § Text-first is social-first` / `§ Text is the universal substrate`, so no MOVE is owed.

### unlinked-6 · `docs/slates/builds/mirror-slate.md`

- unlinked-6 · mirror-slate · `## The cheating problem, and the answer` (*density, not verification*) — **STAYS**; it answers the anti-cheat problem of an inbound sensor channel that does not exist (no assertion / sensor / parity seam under `packages/server/src`); `measurement.md`'s *mirror* (Part 5–6, the Mara/Aletheia property) is a different object — the game showing you its own measurement, not the world asserting into the game — so there is no shipped why to duplicate against.
- unlinked-6 · mirror-slate · `## Open questions` → *Sensor silence* (*absence is neutral, and the mirror only ever adds*) — **STAYS**; a leaning inside an open question about the same unbuilt channel; it becomes a doc invariant only when a channel exists to be silent.

### unlinked-6 · `docs/slates/builds/record-integrity-slate.md`

- unlinked-6 · record-integrity-slate · the five one-line theses (*different products* · *a recomputable hash chain is theater* · *verification on our box isn't verification* · *an integrity branch that must be trusted has failed* · *tamper-evidence guarantees the record, never the law*) — **STAYS**; every mechanism they argue for is unbuilt (no `prevHash` / Merkle / beacon under `packages/server/src`; `schema/positions.yaml` still upserts; no `position_events`), and they are embedded in the unbuilt sections that need them; `polity-decision-register.md` records no tamper-evidence decision (grep `tamper|hash chain|anchor`: none), so there is no top-level home lacking them — their published home is Art. VII + the manifesto chapter, as the slate says, neither of which an agent writes.

### unlinked-6 · `docs/slates/builds/agency-slate.md`

- unlinked-6 · agency-slate · *Agency is a property of the EXECUTION CONTEXT* + *authority flows from the principal, attribution stays with the agent* — **STAYS**; both derive the shape of the agency grant, and no grant exists — the only *act-as* seams are the two hand-rolled narrow ones (`businessOfProprietor`, `AccessLogic.isAgentOf` at `platform/idea/api/AccessLogic.ts:146`), neither of which carries a principal/agent split in the context; `call-security.md` already states the constraint they derive FROM (principal is context-derived), which is the shipped half.
- unlinked-6 · agency-slate · *Code-trust NEVER flows through agency — the one axis nothing may launder* — **STAYS**; it is the wizard-axis rule applied to the unbuilt grant. `access.md` carries the general shape (the PM backstop: code trust follows the SEAT; an NPC under a staff chain does NOT inherit authority) but not the agency clause, and there is nothing to attach it to until agency ships. Noted, not a contradiction: the shipped `isAgentOf` opens with an `isWizard` short-circuit that mixes the two axes in the reverse direction — its own docstring calls it *a known wrong shape* and points at the wizard-axis-cleanup slate, so code and doctrine agree; requirements should name it (the compaction ledger already does).
- unlinked-6 · agency-slate · *Place-derivation for the counter; agency for the road* · *Delegation STEERS. Agency ACTS.* — **STAYS**; boundary statements between an unbuilt design and two others (the shipped on-shift conferral in `employment.md` is the *counter* half and is documented there as capability-not-authority; the *road* half and delegation are both unbuilt).

### race · `docs/slates/tails/species-expansion-slate.md`

- race · species-expansion-slate · `## The principle: cast species by persona` — **GRADUATED → `race.md § Why the roster is cast by persona`** (new `###` under *Species — capability*, directly after the roster table); the mechanism shipped — eight casts authored under this rule in `packages/content/species-and-names/content/stuff/idea/species/**` (`trollius.yaml:4`, `ghulius.yaml:5`, `ogrus.yaml:3` each carry the *persona, not law* framing in their own comments) and `race.md`'s roster rows repeated the aside (*slander, not biology*) with no statement of the rule that produced it. Cut from the slate; one pointer blockquote left.
- race · species-expansion-slate · `## The gate: recognizability (audience-relative)` — **GRADUATED → `race.md § Why the roster is cast by persona`** (same insert: canon-first, mainstreamed creatures, folklore as spice, respectful casting); it is the selection rule the shipped roster followed and the one a second cast must pass; cut with the same pointer.
- race · species-expansion-slate · `## The allegory layer: stereotypes at a safe remove` — **GRADUATED → `race.md § Why the roster is cast by persona`** (same insert: prejudice is the belief gap, modeled viewer-side and never as a species stat; the four craft rules; the ghoul exemplar; the genre-convention aesthetic); the engine half shipped — `belief.md § Regard` is a per-directed-pair attitude realm and no `Species` field carries a bias — and the ghoul row is the exemplar in the tree. Cut with the same pointer.
- race · species-expansion-slate · `## Why this is the who-counts canvas, not just flavor` — **STAYS**; it argues for the personhood casts (flesh golem · doppelganger · zombie · synth · mind flayer …), all of which are in `Left` and none of which has a species row; the case belongs with the backlog it motivates.

### race · `docs/slates/builds/species-slate.md`

- race · species-slate · `## The governing rules` (all five subsections) — **GRADUATED → `race.md § Why species differ without ranking`** (new `###` under *Species — capability*, after the casting Why); the rule is already OBEYED by shipped mechanisms — the size pair (`race.md § Size`: *the size is PAID FOR … the incomparability the lineage slate wants*), the no-lifespan-clock decision (`§ DECIDED — curves without lifespans`: *the cleanest violation of the species doctrine*), the natural attack that is *worse than a real weapon* (`combat-hooks.md`) — and the doc invoked *the species doctrine* twice by name without stating it anywhere. The six candidate differences remain unbuilt and remain in the slate. Cut; pointer left (the worked example's *Corrected form is § Difference that costs…, above* now resolves to the pointer).
- race · species-slate · `## ⚠ The worked example: blood type, and a rule restated` — **STAYS**; no `bloodType` exists anywhere in code (verified by the compaction ledger and re-grepped), and the example argues for an authored exception in the unbuilt blood/physiology design (`physiology-slate` is read-only, build in flight); the rule it restates is now in the doc, the illustration stays with the backlog.
- race · species-slate · `## ⚠ What to refuse` — **GRADUATED → `race.md § Why species differ without ranking`** (folded into the same insert as its closing refusal list, with the *synergy is a tendency, class is a prerequisite* refinement); two of its five refusals are shipped decisions (no lifespan mechanic — `§ DECIDED`; no reputation stat — `belief.md § Regard` is per-viewer and no `Species` field carries one) and the other three are the standing authoring rule the shipped roster honours. Cut; pointer left.

### bulk · `docs/slates/tails/bulkable-slate.md`

- bulk · bulkable-slate · `## Material fidelity — demand-driven, not aspirational` + `### Influences (the design DNA)` — **GRADUATED → `bulk.md § Why a Material is modelled at the granularity its interactions read`** (new `####` under *Material identity*, after the *Demo Materials are flat* paragraph); the mechanism shipped — `Material` carries formula / molar mass / `composition` (`lib/material/Material.ts`, `race.md § Material substrate`) and the shipped drinks are flat — and `bulk.md` stated only the parenthesis *fidelity is demand-driven*. The realm-level half (substrate models what content needs, no more; layered presentation) is already `design-philosophy.md § The principle`, so the insert points there instead of duplicating it; the design DNA is compacted to four lines because Larian's surfaces ARE the shipped Floor/spill machinery. Cut; pointer left.
- bulk · bulkable-slate · `## Authoring guidance — discrete Thing vs bulk` paras 1–2 — **GRADUATED → `bulk.md § Authoring — discrete Thing vs bulk`** (new `###` under *The model*, before `BulkSlot`); guidance for two shipped mechanisms (`BulkableMixin`, `Stackable`) that no doc carried — the linguistic tell was nowhere. Para 3 (the crossing verbs — `grate`/`grind`/`freeze` unbuilt) stays, as the compaction ledger's *Uncertain* row already required. Cut; pointer left.

### bulk · `docs/slates/tails/aluminium-can-slate.md`

- bulk · aluminium-can-slate · `## 0. The object, in the real economy` — **STAYS**; it is source text, not a thesis — the compaction ledger already names it as the future `can` wiki article (in `Left`), and no top-level doc owns the real-world packaging loop; nothing in code renders it (no wiki page under `packages/content/**` names the can).
- bulk · aluminium-can-slate · `## 3. The content-pack organising principle, tested by the can` — **STAYS**; the three general rules it restates are already doctrine (*a trade is a PROCESS* — `content-packs.md` l.1168; *a corpo pack is capital + the mark, never products* — `content-packs.md` l.1164/1173, `corpo.md`; *template inheritance does not exist* — `ref-shapes.md` l.896), so nothing is owed to a doc — but the section is those rules APPLIED to items still in `Left` (`remelt` → the furnace trade, the deposit → the polity's law, the `fill` recipe's `outputTemplate` as the only enforcement, the can-making trade taking the empty back), and a pointer cannot carry the homes the backlog was assigned; the shipped half (`can.yaml` + `can-of-cola.yaml` in `trade-bottling`) is exactly as the section says.
- bulk · aluminium-can-slate · `## 7. The can as civic curriculum` — **7.5 MOVED → handoff (`measurement.md`)**; the rest **STAYS**. 7.5 (*the can and the blood — price works / price backfires*) is a realm-level truth about valuation whose topic `measurement.md` owns and lacks: Part 1 states that fusing layers 1 and 2 *gives the scoreboard that tells you what to want* and *Silence on worth* gives the mint argument, but neither carries the one concrete lesson that is IMPOSSIBLE if the engine values (grep `Titmuss|blood|crowding|Gneezy`: none). Verbatim text under `## Handoff`; the slate is NOT cut — the coordinator cuts 7.5 to a pointer on applying it. 7.1–7.4, 7.6, 7.7 argue for the deposit-as-law curriculum and 7.4's ambient litter burden, all unbuilt (no deposit, no litter state, no `remelt` under `packages/content/**`), and stay as the curriculum design.

### party · `docs/slates/tails/party-slate.md`

- party · party-slate · the second status block's *governing discipline* paragraph (*keep the party small and operational … a party is "who I'm doing this with right now"*) — **GRADUATED → `party.md § Why the party is small, operational, and nothing else`** (new `##` before *The governing decision*); it is the why of the shipped shape — `lib/party/Party.ts` carries no teaching, employing or group-XP surface — and `party.md` framed the party only as *the operational unit that feeds combat friend-from-foe*. ⚠ The blockquote is left in place in the slate: it is the status block's framing (*everything below defends that line*), which the compaction rule keeps as spine; its argument now lives in the doc and the two `## Principle` / `## The three-axis wall` pointers under it say so.
- party · party-slate · `## Principle` #1 (*small and operational … a squad ≈2–6*) — **GRADUATED → `party.md § Why the party is small, operational, and nothing else`**; the smallness the tactic presets depend on shipped (`combat-formations.md`) and the insert says plainly that no size cap is enforced (`Party.size()` unenforced, no `maxMembers` — as the compaction ledger found), so the doc carries the property without inventing a gate. Cut with the section; pointer left.
- party · party-slate · `## Principle` #2 (*general-operational; combat is one facet*) — **GRADUATED → `party.md § Why the party is small, operational, and nothing else`**; it is the reason the shipped `form`/`accept`/`muster` are not combat-gated and the tactic is dormant outside a fight. Cut with the section; pointer left.
- party · party-slate · `## The three-axis wall` — **GRADUATED → `party.md § Why the party is small, operational, and nothing else`** (the table verbatim + the two sentences after it); the wall is honoured by what shipped — employment is the `Business` (`employment.md`), the party neither teaches nor employs — and the guild axis, unbuilt, is named as an axis the party must never absorb, which is the standing scope rule rather than the case for the guild. Cut; pointer left.

### mql-subscription · `docs/slates/tails/mql-subscription-slate.md`

- mql-subscription · mql-subscription-slate · `## Principle` (*Client declares; server notifies* + three corollaries) — **DUPLICATE → `mql-subscription.md § Why this shape`** (+ the intro's *a client sends an `mql-subscribe` message naming a query + the fields it wants*); the substrate shipped (`api/mql-subscription.ts`, the per-Interactive registry) and the doc already carries the thesis and all three corollaries (small stable wire · MQL the one language · read-only, mutation on the command bus). Cut to a pointer, which also carries the compaction ledger's caveat that the SERVER now declares cards (`card-surface.md § One birth path`) — the caveat is the card surface's, already documented there, so no doc edit.

## Totals

- 29 entries processed (unlinked-6 12 · race 7 · bulk 5 · party 4 · mql-subscription 1).
- **GRADUATED 11** · **DUPLICATE 1** · **MOVED 1** (7.5 of one entry; the rest of that entry STAYS) · **STAYS 16** · **STAYS (contradicted) 0**.
- Subsystem-doc inserts (all INSERT, no existing sentence touched): `race.md` +2 sections (`§ Why the roster is cast by persona`, `§ Why species differ without ranking`) · `bulk.md` +2 (`§ Why a Material is modelled at the granularity its interactions read`, `§ Authoring — discrete Thing vs bulk`) · `party.md` +1 (`§ Why the party is small, operational, and nothing else`).
- Slates cut to pointers: `species-expansion-slate` (3 sections) · `species-slate` (2) · `bulkable-slate` (1 section + 2 paragraphs) · `party-slate` (2 sections) · `mql-subscription-slate` (1). No slate deleted; no status block re-stamped (nothing cut was in any `Left`).
- For the coordinator: (1) apply the one Handoff below to `measurement.md` and then cut `aluminium-can-slate § 7.5` to a pointer; (2) the `party-slate` status-block discipline blockquote is graduated but retained as spine — say if you would rather it went too.

## Handoff

### → `docs/measurement.md` — `## Absorbed from aluminium-can-slate — 7.5 The required pairing: the can and the blood`

Suggested placement: after `## ⭐⭐ Silence on worth is not silence on quantity — and abstention is not available` (Part 1), as the concrete lesson that fusing layers 1 and 2 destroys. Verbatim from `docs/slates/tails/aluminium-can-slate.md § 7.5` (l.272–291); ⚠ the two relative links re-path from `docs/measurement.md` as `./slates/builds/blood-slate.md` / `./slates/builds/standing-mint-slate.md`:

> ### 7.5 ⭐⭐⭐⭐⭐ The required pairing: the can and the blood
>
> The single most valuable thing this curriculum can ship, and it only
> works if the engine stays out of the valuation:
>
> | | **cans** | **blood** |
> |---|---|---|
> | the act | society needs it | society needs it |
> | price it | **works** — return rate tracks deposit size almost exactly; litter falls; a collector's living appears | **backfires** — paying can *reduce* supply by converting a gift into a transaction (Titmuss, *The Gift Relationship*, 1970) |
> | the mechanism | incentive alignment | **crowding-out** — same shape as Gneezy & Rustichini, *A Fine is a Price* (2000): fining late parents made lateness worse, and it stayed worse after the fine was withdrawn |
>
> Two acts a society needs; opposite correct policies. A player who passes
> a deposit on cans, then tries the same trick on blood and watches
> donation **fall**, has learned something most adults never learn — and
> no essay delivers it. See [blood-slate.md](../builds/blood-slate.md).
>
> ⚠ **This entire lesson is impossible if the engine credits both with
> standing.** That is the concrete reason the mint question
> ([standing-mint-slate.md](../builds/standing-mint-slate.md)) is not ours.
>
