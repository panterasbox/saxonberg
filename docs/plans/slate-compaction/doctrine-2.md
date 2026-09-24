# Doctrine-homing ledger — batch 2 (unlinked-2 · location · weather)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code, never by the slate's own
> markers. Every MOVE's text is verbatim under `## Handoff` at the end.

## Rows

### unlinked-2 · `docs/slates/builds/guild-slate.md`

- unlinked-2 · guild-slate · `## What a guild is` — **STAYS** — argues for the `Guild` Idea + mysteries/calls/marks, none of which exists (`grep -rl Guild packages/server/src/mud packages/content/*/src` → two unrelated test fixtures only); the wish-fulfilment thesis is the case requirements will need.
- unlinked-2 · guild-slate · `### What fell out of the audit` (finding 1, *trust-work is engine-work; labor-work is player-work*) — **STAYS** — the finding argues for the UNBUILT launch roster (Factors automated out, Advocates survive) and cannot be cut below the paragraph without losing that consequence; its realm-level premise is already owned by `vocations.md § the disposal technique: DECOMPOSE` (the notary as the first honest NO) + § *"Automate what the record already knows; make a vocation of what it does not"* — substance present, the guild one-liner is a restatement, so nothing to hand off. ⚠ note for requirements: the finding says the conserved ledger *kills the auditor*; `vocations.md`'s register still lists the auditor as *designed* (independence + competence) — reconcile there, not here.

### unlinked-2 · `docs/slates/builds/api-normalization-slate.md`

- unlinked-2 · api-normalization-slate · `## Part 3` (*split on COHESION, not on density*) — **STAYS** — the rule governs the UNBUILT normalization pass (status block re-verified 2026-09-19: still 93 `api/*.ts`, no refactor made); `architecture.md` has no cohesion/density text (`grep -i 'cohesion\|scannab\|uniformity' docs/architecture.md` → nothing) and a reference doc must not carry the case for a refactor that has not happened.
- unlinked-2 · api-normalization-slate · `## 6.1` (*Scannability = can you predict the member's name*) — **STAYS** — a metric term for the same unbuilt pass; `MixinApi`'s 156 `isX` predicates are shipped but the doctrine is about how to size a split, not about the predicates. Coordinator option: if the layer's shape doctrine is ever homed in `architecture.md § The Api ↔ logic-singleton split`, this goes with Part 3 and 6.2 together — not piecemeal.
- unlinked-2 · api-normalization-slate · `## 6.2` (*a shared `lib/` directory is the honest system boundary*) — **STAYS** — argues for the influence-cluster merge, which is UNBUILT (`api/influence.ts`, `renown.ts`, `producer.ts`, `conviction.ts`, `provenance.ts` all still present over one `lib/standing/`); the placement test is the argument requirements will need.
- unlinked-2 · api-normalization-slate · `## 6.3` (*the export-discipline rule MANUFACTURES type-shaped Apis*) — **STAYS** — an open question about a standing CLAUDE.md rule (`api/array.ts`, `api/path-pattern.ts` still exist; nothing decided where a system-less utility lives); unresolved, so it stays where the decision will be made.
- unlinked-2 · api-normalization-slate · `## 6.5` (*Grouping, not merging* + `### ⛔ …the pattern is RETIRED`) — **STAYS (contradicted)** — the barrel pattern was reversed by the user 2026-09-13 and is kept as a record of a road not taken; the one true fact inside it (frame attributed from the defining module, captured at decoration time, never the access path; never route a `lib/`→`api/` back-call through a barrel) is **already in `call-security.md § decorateApiClass`** (lines 510–515, stamped *graduated from the api-normalization slate, 2026-09*) — so nothing further to hand off.
- unlinked-2 · api-normalization-slate · `# Part 7` intro (*facade work is work that silently does not hot-reload*) — **STAYS** — the paragraph is the framing of the UNBUILT facade:logic measure (first item in `Left`); the split's own why (Apis are static + direct-imported, hence not reloadable; the logic singleton is the HMR boundary) is already documented in `hot-reload.md § Api logic singletons` and `architecture.md` (the Api tier is both halves of the split), so the shipped part is DUPLICATE in premise and the rest argues for the measure.

### unlinked-2 · `docs/slates/builds/amendment-library-slate.md`

Whole slate UNBUILT: no catalog Document, no module registry, no amendment adoption path anywhere in `packages/server/src/mud` or `packages/content/*/src` (`grep -rli amendment` → `Office.ts` + two farming controllers, all incidental uses of the word); `civics.md` rules the statute engine out by doctrine.

- unlinked-2 · amendment-library-slate · `## The spine` (the six principles) — **STAYS** — the thesis of a layer none of whose parts exist; the six principles are the case requirements will need, and no top-level doc owns "governance-as-config" (`polity-decision-register.md`, `compact-political-science.md` have no module/lego/preset text).
- unlinked-2 · amendment-library-slate · `## Prior art` — **STAYS** — sources for the same unbuilt layer; a reference doc has no section this belongs in until the library exists.
- unlinked-2 · amendment-library-slate · `### The pocket veto is excluded by construction` (*the executive's power is to stop, never to complete*) — **STAYS** — a consequence of the governance sweep's machine-enactment pipeline designed in `legal-code-slate § The sweep`, itself UNBUILT (no enactment/veto-window code; `grep -rli 'enact\|veto'` hits are unrelated — `canEvict` vetoes, catalogue warm-ups); the pipeline it reasons from does not exist, so the reasoning stays with it.
- unlinked-2 · amendment-library-slate · the four *pedagogy* blockquotes (elections l.436–439 · free movement l.458–461 · the common carrier l.473–476 + the rate-cap/duty-to-serve line · right-of-way l.517–519) — **STAYS** — each restates *discovering why beats being told* as the reason a specific UNBUILT module is a lego and not kernel; the argument belongs beside the module it justifies. (The common-carrier passage's *remedy matches the SHAPE of the monopoly — geographic by price, network by access* is realm-level and `settlement-model.md` does not carry it, but it is argued for a module that does not exist, so it is not a MOVE; flagged for the coordinator in case the depot-as-network-effect line is wanted in `settlement-model.md § The depot` when freight lands.)
- unlinked-2 · amendment-library-slate · `### Already kernel` — **STAYS** — three claims (open floor = petition; traits inadmissible; exit is bedrock) that tell the drafter what NOT to draft; they rest on `forums.md`'s open organizer and the enforcement slate's intrinsic/social split (a design claim, not code — `grep -i inadmissib docs/subsystems/trait.md` → nothing), so they are neither shipped-and-undocumented nor decisions the register owns; left as written.

### unlinked-2 · `docs/slates/builds/institutions-slate.md`

- unlinked-2 · institutions-slate · `## The principle everything below is an instance of` (*the platform never decides who, only how long* + *author the ethos, never the outcome*) — **STAYS** — the governing thesis of an UNBUILT layer (no entity form, no charter document, no terms on charters; only `influence.md` carries the fragment *standing is a rate*); `measurement.md` has no *who/how long* text, so it is neither duplicate nor a top-level move — it is the case requirements will need.
- unlinked-2 · institutions-slate · `# Part 3` opening blockquote (*title over an extent is the only real power … theater is the product*) + the user's frame (l.36–41) — **STAYS** — argues for the committee/show separation, which is UNBUILT: `packages/content/corpo-goodkin/pack.yaml` still has the corpo's organization holding title over `/corpo/goodkin` (`corpo.md § The board is the committee` documents that shape as current), i.e. the finding it corrects is still the shipped state.
- unlinked-2 · institutions-slate · `## Committees are gods in exactly one place` (*No authored field may create money*) — **STAYS (contradicted)** — stated as a rule *the lint family holds*, but no such lint exists (`grep 'lint:' packages/server/package.json` → nothing money-shaped) and the code does the opposite today: `Business.openingCapital` is `authorable: true` (`platform/idea/Business.ts:137`) and `BankingLogic.ts:404` mints `openingCapital ?? openingCapitalMinor()` — `banking.md § Opening capital` documents the authored override as the design. The lint is in `Left`; the economic-bootstrap build (`build-1`, in flight) may move this — leave it to that sweep.

### unlinked-2 · `docs/slates/builds/blood-slate.md`

Whole slate UNBUILT: no blood type, donation or transfusion code (`grep -rli 'bloodtype\|transfus' packages/server/src/mud packages/content/*/src` → a vitals characterization test and a `Metabolic.ts` comment only); `TreatController.ts` has no consent or consciousness gate.

- unlinked-2 · blood-slate · `## ⭐ Blood type` (*Endow what creates a relationship. Never endow what creates a ranking.*) — **STAYS** — the endowment rule argues for the UNBUILT genotype/phenotype endowment; it is owned by `lineage-slate § The four kinds of value` and restated here with its application — the restatement is the slate's own case, and the owner is a slate, not a doc (overlap is the cluster pass's business, noted already in unlinked-2).
- unlinked-2 · blood-slate · `#### Objection 2 — "it reads as blood purity" — INVERTS` (*blood type is independent of species*; *difference that COSTS is character; difference that RANKS is essentialism*) — **STAYS** — the RULE (blood type independent of species; an incompatible-blood species is *more fragile, not purer* and its answer is its own donor drive) argues for an UNBUILT mechanic and cannot be cut below the paragraph; the governing species rule it cites (*difference that COSTS is character; difference that RANKS is essentialism*) was homed **during this pass** by a sibling batch at `race.md § Why species differ without ranking` (uncommitted in the same worktree) — so the restatement here is now a DUPLICATE in premise, kept only for the blood-specific application it is wrapped around.
- unlinked-2 · blood-slate · `### The blood economy` (*blood donation is the cleanest possible TEST OF THE SOFT-SKILLS THESIS*) — **STAYS** — a measurement thesis whose test object (donation as a costly, unrewarded, recorded act) does not exist; `measurement.md` has no soft-skills/costly-act text, and a top-level doc must not carry the case for a test that cannot yet be run.
- unlinked-2 · blood-slate · `### ⭐⭐⭐ Where CONSENT finally lands` (*implied consent in an emergency*; *a substance administered without consent is harm*) — **STAYS** — the consent predicate is in `Left` and nothing codes it (`grep -i consent packages/server/src/mud/platform/idea/cmd/medical/TreatController.ts` → nothing); `accountability.md` is the ledger it names, and carries fight/hazard consent, not treatment consent — the generalisation past blood is design for the recovery/treatment cycle (`build-4` is on `design/treatment`), which will take it from here.

### unlinked-2 · `docs/slates/builds/legibility-slate.md`

- unlinked-2 · legibility-slate · `## Principle` (*Multiplicity has no representation anywhere in this stack* + *the authored count and the rendered group are not the same fact*) — **STAYS** — argues for four UNBUILT parts (`ref-shapes.md:896` still states *Template inheritance does not exist*; no `extends:` in any content row; no `count` on `props:` entries); the thesis is what makes them one build, and requirements will need it verbatim.

### unlinked-2 · `docs/slates/tails/language-slate.md`

- unlinked-2 · language-slate · `## Principle` (*Languages are data, not behavior… the render-side gate is the only piece of code the system grows*) — **STAYS** — argues for the `Language` Idea + catalogue and the render gate, both UNBUILT: what shipped is `MARK_SCRIPTS`, a `const` vocabulary in `lib/description/Marked.ts:93` (code, not data rows) and no speech/read garble gate anywhere; the shipped written half is already documented at `perceiver.md § read — the marks substrate` (stamped *graduated from the language slate*). ⚠ the principle's `/lib/language/<name>` row path contradicts *nothing instances `/lib/`* — already flagged in the status block's `Left`, so no separate contradiction row.

### unlinked-2 · `docs/slates/tails/instrumentation-slate.md`

- unlinked-2 · instrumentation-slate · `## ⚠ The aether line — a modem is not a sense organ` (*physical sensing can never ride the aether base*; *the aether is the textbook; the instrument is the lab*) — **GRADUATED → handoff (`augmentation.md § The three-base capability model + the aether hosting relation`)** — the three-base model SHIPPED (`lib/augmentation/AetherHosted.ts`, `AetherMixin` host, `Species.innateMixins`; `augmentation.md` l.230–310) and the doc states what rides each base (comms + wallet as hosted updates, `TravelCard`/`PaymentCard` as corporeal twins) but never the RULE that constrains base assignment or its why; the sensorium walk even leaves `_grantsModalities` open on hosted updates (*"substrate-only in v1"*), so the rule is the only thing telling an author not to hang a photodiode on an update. Text in `## Handoff`; **the slate section is left in place** until the coordinator's insert lands (cut-after-diff rule) — then cut l.75–106 to a one-line pointer.
- unlinked-2 · instrumentation-slate · `## One thing that is accidentally right, and should be doctrine` (*`analyze` is what you can work out. `measure` is what an instrument tells you.*) — **DUPLICATE → `command-routing.md § Affordance attribution — source, not category`** — unlinked-2's handoff was applied (l.536–541, stamped *graduated from the instrumentation slate, 2026-09*); **cut** from the slate (7 lines), a 3-line pointer left under the heading.
- unlinked-2 · instrumentation-slate · `### The line between a channel and a bespoke verb` (*Readings are channels. Procedures are verbs.*) — **STAYS** — the channel/verb line is the design rule of the UNBUILT `MeasuringMixin` (`channels` + `read`, one `measure` verb, no subcommands — status re-verified: no `MeasuringMixin`, `Sextant.commandContributions` still names the whole `measure.yaml`).
- unlinked-2 · instrumentation-slate · `## ⭐⭐ Perceive vs. interpret` (*You smell to notice. You analyze to know.*; *the sensorium and the instrument set are one continuum*) — **STAYS** — argues for route-gated `analyze` (each analysis declares its routes; the output names the route), UNBUILT (`analyze` still ungated; `biome.md § Instruments + verbs` documents `analyze atmosphere` as running *without an instrument* and doubling as a debug dump); the shipped rung it cites (organ-gates-modality widened by augments) is already in `senses.md § Organ-gates-modality widened with augments`. *Modalities closed, channels open* is half shipped (seven `Modality` singletons) and half the unbuilt channel vocabulary — stays with the rest.
- unlinked-2 · instrumentation-slate · `## The convergence (why this is not merely allegory)` — **STAYS** — the gamification/transhumanism thesis is the slate's case that instrumentation-inside-the-fiction is worth building (UNBUILT); it argues *from* `measurement.md`'s mirror (Part 5–6, shipped) rather than adding to it, and `measurement.md` has no self-extension/transhumanism text — so neither duplicate nor a clean move. Coordinator flag: if `measurement.md` ever wants the *mirror with receipts = a transhumanist artifact* line, this is where it is (l.197–209).
- unlinked-2 · instrumentation-slate · `## Two of this slate's open questions, answered` (#7: *asymmetric capability between species is fine; "difference that ranks" is about characterization, not capability spreads*) — **STAYS (contradicted)** — a user ruling on the UNBUILT species-intrinsic instrument roster. ⚠ During this pass a sibling batch homed the species doctrine at `race.md § Why species differ without ranking`, and that text applies *difference that RANKS* to **capability** (refuse stat modifiers — *one scale, therefore a ranking*; *a good species difference changes WHERE YOU CAN GO and WHO YOU NEED — never how hard you hit*), whereas this ruling says the doctrine is about characterization *not capability spreads* and *if some species are 'better' that's fine*. Both are the user's words on different days; the two are reconcilable (incomparability ≠ balance) but not as written — requirements for the intrinsic roster must reconcile them. Coordinator decision flagged.

### location · `docs/slates/builds/multilocation-slate.md`

- location · multilocation-slate · `## Principle` (six one-liners) — **mixed, cut at list-item granularity**:
  - items 1, 2, 3, 5 — **DUPLICATE → `location.md § Core model` + `§ Base mechanism vs lounge policy`** — the Warren shipped (`lib/location/Warren.ts`, `LoungeWarren`) and the doc states each with its why (*orthogonal to `Zone`, not owned by it* — a membership fact, not a spatial one; *coordinator, not a containment tier* + *host is a runtime role*; the base/policy split with *the base never imports the lounge*; buds-when-full / merges-when-empty). Cut (8 lines), a 7-line pointer left; the *not hard-shard* contrast survives in the slate's framing paragraph (spine).
  - item 4 (*heterogeneous by role + cardinality — one knob, not two substrates*) — **STAYS** — argues for the multi-role/cardinality catalog, UNBUILT (first `Left` item: today's base ships one elastic role + a host).
  - item 6 (*drain, don't slam*) — **STAYS (contradicted)** — `LoungeWarren.reconcile()` is a passive occupancy-watch + timed reap, no admission block, no active rerouting (location ledger § Superseded, decision 6); the active drain is a `Left` item, so the principle stays as the design it still argues for, with the contradiction already recorded there.

### weather · `docs/slates/tails/weather-slate.md`

- weather · weather-slate · `## Dealbreakers` (all 5) — **GRADUATED → `weather.md § Why the dealbreakers bind every consumer`** (new section, 24 lines, inserted before § Wave 2 — the coexistence resolve) — the substrate SHIPPED (`WeatherLogic` stateless, `weatherAt(time, locality)` pure, address-tree seed, zero-when-absent deviation) and `weather.md` carried each constraint as a property of what was built, scattered (§ Why procedural · § Locality binding · § Activation's *no-dependency guarantee* · *Enrichment, not a gate*), but nowhere as the checklist that binds the five designed-and-unbuilt consumers; the insert is a faithful compaction (every phrase diffed present). Slate section cut (13 lines) to a 4-line pointer; the slate's later `§ The rule every family consumer must honour` (Dealbreaker 2 restated for the unbuilt family) is left untouched — it sits beside the unbuilt consumers it governs.

## Totals

| outcome | count |
|---|---|
| GRADUATED | 2 (1 applied — weather.md; 1 via handoff — augmentation.md) |
| DUPLICATE | 2 (instrumentation § accidentally right → command-routing.md; multilocation § Principle items 1/2/3/5 → location.md) |
| MOVED (top-level, handoff) | 0 |
| STAYS | 24 |
| STAYS (contradicted) | 4 (api-normalization § 6.5 · institutions § Committees are gods · instrumentation § open question #7 vs `race.md`'s new *Why species differ without ranking* · multilocation § Principle item 6) |

Entry count: 28 (unlinked-2) + 1 (location) + 1 (weather) = 30 entries; outcomes sum to 32 because the one mixed entry (multilocation § Principle) carries three outcomes (DUPLICATE · STAYS · STAYS-contradicted).

Files changed by this batch: `docs/slates/tails/instrumentation-slate.md` (−7 +3) · `docs/slates/builds/multilocation-slate.md` (−8 +7) · `docs/slates/tails/weather-slate.md` (−13 +4) · `docs/subsystems/weather.md` (+26) · this ledger.

## Handoff

### → `docs/subsystems/augmentation.md § The three-base capability model + the aether hosting relation` (INSERT after the canonical-statement blockquote and the `AetherMixin` host paragraph, before `### The hosting relation`)

Source: `docs/slates/tails/instrumentation-slate.md § ⚠ The aether line — a modem is not a sense organ` (l.75–106; verbatim preserved there until this lands — then cut it to a one-line pointer). Faithful compaction:

> **The base-assignment rule: physical sensing can never ride the aether
> base.** The aether implant *mediates the aether* — communication and
> information unbounded by physical space. An instrument is the opposite
> kind of device: it must **transduce physical reality at a location**,
> and nothing about connecting to a network gives you a photodiode. So:
>
> | Base | Carries | Never carries |
> |---|---|---|
> | **Aether (`Idea`)** | comms, the credential wallet, records access, **reference lookup** | any physical measurement |
> | **Corporeal (`Thing`)** | instruments that actually measure — **carried** in a pack or **installed** in a body slot (the difference is the slot, not the base) | — |
> | **Intrinsic** | species senses | — |
>
> The line pays for itself pedagogically, which is why it is the right
> line: over the aether you can look up *what granite's conductivity is
> supposed to be*; you cannot tell whether **this rock** is granite
> without an instrument. **The aether is the textbook; the instrument is
> the lab** — reference knowledge vs. measurement, and the competent
> player does both and compares. (The sensorium walk leaves
> `_grantsModalities` open on hosted updates as substrate; this rule is
> what says no *physical* modality may ever be granted that way.)
> *(Graduated from the instrumentation slate, 2026-09-21.)*

---

## Coordinator (2026-09-22) — handoff applied

- `augmentation.md § The three-base capability model` — the
  base-assignment rule inserted before *The hosting relation*;
  `instrumentation-slate § The aether line` → a pointer.
- The species-doctrine reconciliation (race.md's *difference that RANKS*
  vs the user's *capability spreads are fine* ruling) is for the
  intrinsic-roster requirements; both texts now stand, labelled.
