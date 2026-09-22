# Doctrine-homing ledger — batch 9 (unlinked-5 · money · cms · livelihood · unlinked-9 · residency)

> Pass: doctrine homing (see `.claude/skills/compact-slate/SKILL.md` § The
> doctrine-homing pass). Branch `design/doctrine-homing`. One row per
> Doctrine entry of each assigned compaction ledger; outcomes are
> `GRADUATED → <doc §>` · `DUPLICATE → <doc §>` · `MOVED → handoff (<doc>)`
> · `STAYS` · `STAYS (contradicted)`. Home is decided by the STATUS of what
> the doctrine argues for, verified against code under
> `packages/server/src/**` + `packages/content/**`, never by the slate's own
> markers. Every MOVE's text is verbatim under `## Handoff` at the end.
> Write list: `docs/subsystems/banking.md` (money), `docs/subsystems/cms.md`
> (cms), `docs/subsystems/employment.md` + `docs/subsystems/contract.md`
> (livelihood), `docs/subsystems/residency.md` (residency); unlinked-5 and
> unlinked-9 have no insertable doc (Handoff only). Read-only (build in
> flight): `credit-slate`, `economy-slate`, `auction-slate` — rows recorded,
> nothing changed.

## Rows

### unlinked-5 · `docs/slates/builds/flowers-slate.md`

- unlinked-5 · flowers-slate · `## The frame — a costly signal, and the mechanism transfers intact` — **STAYS**; the costly-signal frame is the case for a flower-shaped good that does not exist (no flower row, no florist, no act record — `packages/content` has flowers only as prose in `meadow.yaml` and forestry's oak/hazel), and `measurement.md`'s layer-2 table carries no flower example to be a duplicate of; it becomes the `measurement.md` layer-2 exemplar when the build lands, not before.
- unlinked-5 · flowers-slate · `## What must not happen` — **STAYS**; five guardrails for an unbuilt build (no meanings table, no `+regard`, no stat effect, nothing requires a flower, no scripted bubble) — they constrain requirements, and nothing shipped can be documented as obeying them.

### unlinked-5 · `docs/slates/tails/patina-design-pack.md`

- unlinked-5 · patina-design-pack · `## Part 0 — The gap, stated from the doctrine's own words` — **STAYS**; the argument for a mechanism that does not exist — no `patina` anywhere under `packages/server/src` or `packages/content`; an object's best outcome is still *unchanged*, which is exactly the gap the section states.
- unlinked-5 · patina-design-pack · Part 2's principle *patina narrows the distribution; it never moves the ceiling* — **STAYS**; the objects-side restatement of a rule `stewardship-doctrine.md:285` already carries for people (*buys precision and access, never a multiplier*) — its object-side instance is unbuilt, so there is nothing for a reference doc to explain yet; it is the doctrine-doc paragraph when patina ships.

### unlinked-5 · `docs/slates/builds/end-of-life-slate.md`

- unlinked-5 · end-of-life-slate · `## ⭐⭐⭐ There is no natural death, and it decides the shape` — **STAYS**; the first half is a constraint `race.md` (§ the `lifespanMin`/`Max` passage, incl. the pets amendment: bites for non-sentient animals only) already carries verbatim, and the section's own content — *every death is sudden, so end-of-life is OTHER PEOPLE'S WORK* — is the thesis for custody/rite/remembrance, none of which exists (no burial, funeral or rite anywhere in `packages/server/src/mud` beyond the word in unrelated catalogues); a reference doc cannot carry the case for an unbuilt vertical.

### unlinked-5 · `docs/slates/builds/call-security-pass-slate.md`

- unlinked-5 · call-security-pass-slate · `## The design position (the user's, recorded 2026-09-02)` — **STAYS**; it is the position for a pass that has not run — no `@Audited` / `audit_events` exists under `lib/security`, the ungated+sealed set is still audit-pending, and `call-security.md:980-993` deliberately POINTS at the slate for "the design position" as its own build; graduating it now would put the case for an unbuilt gate system in the reference doc and orphan the doc's pointer. Becomes `call-security.md § Why` when the pass lands.

### unlinked-5 · `docs/slates/builds/map-slate.md`

- unlinked-5 · map-slate · decision 3 / Principle 3 *layered presentation for space* — **STAYS**; the general rule (*players see prose, students see physics, same engine*) is already `design-philosophy.md § Principle 3: Layered presentation`, and what the slate adds is its APPLICATION to a map that does not exist (no map card, minimap or renderer in `packages/client/src`) — the on-thesis case for an unbuilt build, which the slate's requirements will need. Nothing to move: the doc lacks nothing general, and the specific is unbuilt.

### unlinked-5 · `docs/slates/tails/incapacity-slate.md`

- unlinked-5 · incapacity-slate · `## ⭐⭐⭐ And observe-first is the pattern this slate should COPY` — **STAYS**; the section's argument is for *impound on a claim* (unbuilt — no impound, claim or custodian path exists) and AGAINST building one into contracts; the half that is shipped (expire-on-touch, no sweep/counter/registry) is already documented as mechanism at `contract.md § states` (`:293-295`, *No sweep, no counter*). The generalisation — *expire-on-touch and impound-on-claim are one instinct, one layer apart; the house pattern is reconcile/expire on the next read, never a sweep* — has no top-level home in the MOVE table (`antipatterns.md`/`architecture.md` are outside this pass's write list); flagged for the coordinator as a candidate `antipatterns.md` entry (*a sweep where an on-read reconcile would do*), which is a decision, not a homing.

### unlinked-5 · `docs/slates/builds/hunting-slate.md`

- unlinked-5 · hunting-slate · `## The frame — the pest *is* the resource` — **STAYS**; the argument for a hunting vertical that does not exist (no `hunt`/`track` verb, no wild-population record, no game taken from a field anywhere in `packages/content`; farmstead D60's animal pressure is itself unbuilt) — requirements will need it.
- unlinked-5 · hunting-slate · `## ⭐⭐ Game law` (*restricts WHO may take it, not HOW MUCH* + both readings true at once) — **STAYS**; civics doctrine for content no polity has been able to pass — there is no game-law statute, poaching offence, warden contract or warrant office in code — and `compact-political-science.md` is not a MOVE-table home, so the case waits with the build; when a polity can pass such a law it is the natural `compact-political-science.md` example (coordinator's call then, not a homing now).
- unlinked-5 · hunting-slate · the method-ladder paragraph *expertise is discrimination, and precision costs an act — fourth independent instance* — **STAYS**; the general rule is already housed (`design-lenses.md § 3` — *expertise IS discrimination*, the tasting worked example; `ranching.md § handle — precision costs an act (D24)`), and what the slate adds is the tracking INSTANCE, which is unbuilt (no sign-reading, no `track`); nothing general to move, the specific stays with its build.

### unlinked-5 · `docs/slates/tails/explicit-targeting-slate.md`

- unlinked-5 · explicit-targeting-slate · (no Doctrine entry — the ledger records *none*; the asymmetry thesis graduated with the build to `command-spec.md`) — nothing to process; row recorded for completeness.

### money · `docs/slates/builds/economy-slate.md` — ⚠ READ-ONLY (build in flight); rows recorded, nothing changed

- money · economy-slate · `## The two laws` (Law 1 · Law 2 · `### The two scarcities`) — **STAYS (contradicted)**; Law 2's *no upkeep-or-it-decays / no rent on owned space* is contradicted by the shipped shell clock + tenure terms (`holding.md § Two clocks` reconciles it for GOODS only, and `§ Terms — who OWES the upkeep` is exactly a scheduled maintenance bill on owned space); the two-scarcities compute metering is unbuilt. ⚠ Law 1 alone is a clean GRADUATE candidate — `banking.md:29/81/426` and `retail.md:72` obey it by name without stating it, and `banking.md`/`holding.md` cite the slate as the laws' HOME (money ledger finding 2) — deferred: the slate is read-only and the in-flight credit build is editing `banking.md`; coordinator inserts a `banking.md § Why — the two laws` (Law 1 verbatim; Law 2 with the shell exception written beside it) after the build lands.
- money · economy-slate · `## The economy is a closed conservation loop` (stages 1–4) — **STAYS**; stage 3's *bounded merchant* is unbuilt (`retail.md § Deferred` — the NPC buying for its own coin is retail S2), so the loop is not yet closed in code; the shipped halves already carry their why (`crafting.md:85-92` no loot-faucet treadmill; `banking.md § Conservation` the supply identity; `retail.md § Deferred` consignment-never-buys). Read-only regardless.
- money · economy-slate · `## Currency: hybrid (soft coin + barter)` — **STAYS**; soft coin shipped (the zorkmid `Coin` stack), barter + provenance-priced bespoke exchange has no verb or clearing path — the section is the case for the unbuilt half. Read-only regardless.
- money · economy-slate · `## Quality is a verdict, not a property` — **STAYS**; the shipped surface is a material `Grade` + `condition` (the slate's own italic pointer to `crafting.md`), and the observer-relative verdict — different observers, different purposes, different verdicts — exists nowhere in code (the ledger's *Uncertain: observer-relativity*); unbuilt thesis. Read-only regardless.
- money · economy-slate · `## Transaction clearing: stance, not property` + the three ways — **STAYS**; path 1 shipped as the standing `PricedOffer` and `retail.md:72` already carries its why in one line (*worth lives on the offer, never on the good*); paths 2–3 (bespoke converge, social gift/debt) are unbuilt. Read-only regardless.
- money · economy-slate · `## The bazaar must be worth the walk` — **STAYS**; there is no bazaar, market arena or dispersed stalls to walk (retail S4 deferred) — the argument for an unbuilt place. Read-only regardless.
- money · economy-slate · `### NPCs are both bootstrap scaffold and disengagement backstop` — **STAYS**; the backstop half shipped as the `covers` brain and `employment.md § The shifts + covers brains` documents the mechanism but not this why (*player presence is additive and replaceable, never load-bearing*) — a GRADUATE candidate → `employment.md § Why` (≤ 8 lines) once the slate is writable; the bootstrap half (*genesis is a fully NPC-staffed living economy*) is a content claim two venues partially realise. Deferred: read-only.
- money · economy-slate · the closing throughline (*build the honest substrate, tune the balance against reality*) — **STAYS**; a maxim over the deferred macro layer (capital markets, monetary policy), which is unbuilt; `design-philosophy.md` is the fidelity axis only, so no MOVE-table home. Read-only regardless.

### money · `docs/slates/builds/money-integrity-slate.md`

- money · money-integrity-slate · Finding 3's retrospective paragraph (*a term that looks like a missing reservoir may be a duplicate of one already counted elsewhere*) — **DUPLICATE → `banking.md § Open-choice decisions log` #12** (and `§ Reporting consumers`, `fullReconcile`'s two subtleties); the doc already carries the lesson in the slate's own words — *before adding any term to a conservation identity, ask what already represents it* — plus the snapshot-term corollary; cut from the slate, one-line pointer left inside the struck Finding-3 subsection.

### money · `docs/slates/builds/credit-slate.md` · `currency-slate.md` · `multi-currency-slate.md` · `auction-slate.md`

- money · credit / currency / multi-currency / auction — (no Doctrine entries in the ledger for these four slates; `credit-slate` and `auction-slate` are read-only besides) — nothing to process; row recorded for completeness.

### cms · `docs/slates/builds/cms-slate.md`

- cms · cms-slate · `## Principle` (the five one-line theses) — **STAYS (contradicted)**; thesis 1 (*one app, one session, two aware surfaces*) shipped as three CARDS in one feed, not two surfaces (`cms.md § The CMS is a CARD`), and thesis 5 (*your editor, not ours* — the external-editor path) is contested twice (`git-workflow.md` shipped snapshot-and-push from the box with no sync-in path; `cms-connectors-slate` sets the VS Code extension aside for WebDAV/Remote-SSH). Theses 2–4 are shipped AND already carried with their why (`cms.md § Save go-live` — *save is authoritative, the server re-validates*; `§ Gating` — source `isWizard`, content per-path, *there is no author tier*; `studio.md` — the form emits the same artifact), so nothing in the block is homeless; the block stays whole because two of five are contradicted and requirements must pick.
- cms · cms-slate · `### Three authoring surfaces, one backend` — **STAYS (contradicted)**; its vocabulary is superseded (*lease-scoped trees* → parcel title + `canAtPath`, `access.md`) and its third tier (*external editors via git*) is the same contradicted answer as thesis 5; the truth that survives — one gated core under every surface — is already documented as mechanism (`git-workflow.md § the governing constraint` + the SURFACES → ONE GATED CORE diagram at `:52`, `cms.md:134` *REST adds no new authorization surface*). The in-game light tier is `scoped-authoring-slate`'s and the external tier `cms-connectors-slate`'s — both unbuilt.

### cms · `docs/slates/builds/cms-connectors-slate.md`

- cms · cms-connectors-slate · `## Part 3` → `### ⭐ Source already has a connector, and it is called SSH` — **STAYS**; the deployment fact it rests on is already documented (`git-workflow.md § The governing constraint: the working tree IS the live server`; `deployment.md` the SSH relay + shell users), and what the section itself argues is SCOPE for an unbuilt build — no WebDAV, no MCP, no personal access token exists under `packages/server/src/backend` — so the conclusion (*the gap is content and documents*) is the case requirements will need, not a reference fact.
- cms · cms-connectors-slate · `## Part 4 — ⚠⚠ The split that should drive the whole design` — **STAYS**; the two rows it stands on are shipped and carry their why already (`cms.md § Gating` the table; `access.md § The code-trust lockdown` — *anyone who can author a line of TypeScript can subvert the whole security apparatus*), and the thesis built on them — *two different products wearing one name; scope the token to the safe one* — is design for the unbuilt token/connector; nothing shipped is explained by it yet.

### livelihood · `docs/slates/builds/livelihood-slate.md`

- livelihood · livelihood-slate · `## Load-bearing decisions (the spine)` (6 items) — **GRADUATED → `contract.md § Why — the labor market routes fun; the engine verifies only what it simulates`** (items 3 · 5 · 6, faithful compaction, 24 lines INSERTED before `§ Dials`); items 1, 2, 4 were already carried with their why (`vitals.md` no health scalar; `contract.md` opening — *kill→reward is severed*; `banking.md § The money model` — the CB is the only mint), while 5 (*a wrapper around an underlying activity*) and 3 (*you cannot code significance*) appeared in no doc although the mechanisms they explain shipped (the closed template vocabulary; breach = row + regard nudge, no global reputation; the issuer-only settlement hook). ⚠ The spine text is RETAINED in the slate under the compaction skill's spine rule (it is the frame §§6–8, unbuilt, still hang off) with a pointer line added beneath it — so this is a graduation without a cut; the coordinator may trim the spine when §§6–8 build.
- livelihood · livelihood-slate · `### 5.2` → *the agent's real job* bullet — **GRADUATED → `contract.md § Why`** (the third bullet there: specify / pay / react / bear-spec-risk, the empty-box example); its realisation is the shipped issuer side of a gig (`post` a templated condition · escrow · `onContractSettled` + the regard nudge · `holdsFor` checks the letter), which the compaction ledger could not yet name; cut to a one-line pointer in §5.2.

### unlinked-9 · `docs/slates/builds/bathroom-slate.md`

- unlinked-9 · bathroom-slate · `## The bathroom debate` → *Kernel neutrality is the forcing function* + *Body diversity makes it material; the allegory doctrine makes it survivable* — **STAYS**; what the two bullets argue for is a designed obstacle course whose provocations are unbuilt (no segregated bathhouse, no one-body-plan facility row, no locality law a legislature could pass over room access — `legal-code-slate` is unbuilt and `civics.md`'s Government carries no statute body), so *the legislature inherits no answer* is a promise about content that does not exist yet; the shipped ingredient — the kernel ships no facility-access rule — is an absence, not a mechanism a doc explains, and the allegory half is already housed as the why at `race.md § casting` (*species are defamiliarized vehicles for group allegory … a bias is modeled viewer-side, never as a species stat*).

### unlinked-9 · `docs/slates/tails/wire-suite-growth-slate.md`

- unlinked-9 · wire-suite-growth-slate · `### 6` → the ⚠ paragraph (*a prose read that exists because no `subscribableFields` descriptor reaches the fact is a card-surface finding … a wire file may never add a descriptor*) — **DUPLICATE → `testing.md § The three assertion channels, and what each owns`** (`:641-644`, the ⭐ rule in the same words); the paragraph's job of qualifying the unbuilt ratchet is done by a one-line pointer, which is what replaced it.

### unlinked-9 · `pathfinding` · `presence-hollowing` · `estate-nesting` · `distance-perception` · `demo` slates

- unlinked-9 · the other five slates — (no Doctrine entries in the ledger) — nothing to process; row recorded for completeness.

### residency · `docs/slates/builds/spawn-distribution-slate.md`

- residency · spawn-distribution-slate · `## Static sibling — and what's new` — **STAYS (contradicted)**; its vocabulary names a retired instruction (`populates: onto` — the static form is the `props:`/`cast:` designation with `PopulatesMixin`'s two once-flags, `templates.md`), and the dynamic form it introduces is half-shipped: the item half is the recurring spawn sweep, already documented with its why (`residency.md § The sweep is a faucet`, `§ Zone fields the spawn sweep reads`), while the creature half the section actually frames (on-demand spawn, a wandering-population tick) has no code (`create-monster`/`procgen`/`NpcGenerator` — no hits). A ⚠ note recording the stale vocabulary and the split was added beside it in the slate (the residency ledger had no *Uncertain* entry to carry it); nothing to insert into `residency.md`.

## Totals

29 entries: GRADUATED 2 · DUPLICATE 2 · MOVED 0 · STAYS 21 · STAYS (contradicted) 4.
Files touched: `docs/subsystems/contract.md` (one INSERT), `livelihood-slate.md`,
`money-integrity-slate.md`, `wire-suite-growth-slate.md`,
`spawn-distribution-slate.md`, this ledger. Read-only slates untouched.

## Handoff

None — no entry in this batch met the MOVE rule (a realm-level truth a
top-level doc lacks). The two decisions flagged for the coordinator are
recorded in the rows above (incapacity's observe-first generalisation as
a candidate `antipatterns.md` entry; economy-slate's Law 1 as a
`banking.md § Why` insertion after the credit build lands).
