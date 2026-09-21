# Slate-compaction pass — unlinked-9 batch ledger

Seven slates whose status block names no subsystem doc. Branch
`design/slate-compaction`. Procedure: `.claude/skills/compact-slate/SKILL.md`.
Write list: **none** — every graduation is in a *Handoff* section below,
verbatim, with its target doc named. Line numbers are the ORIGINAL file's.
Originals saved under the scratch dir `unlinked-9/orig/` for diffing.

Batch-wide findings first:

- **Every slate in the batch was stamped UNBUILT or a bare tail, and most
  are.** Where the tree contradicted a stamp it was substrate that shipped
  *beside* the slate from another build: the bathroom room + its three
  fixtures (the residences build, `furnishing.md`), the wire suite's
  growth since MR!251 (`packages/wire/src/flows/`), and logistics'
  `LaneCatalogue.planRoute` under pathfinding. Each is recorded per slate.
- **Two kept designs now contradict a shipped decision** and are listed
  under *Uncertain* so requirements reconcile rather than inherit them:
  bathroom's *water-as-utility metering* vs `watershed.md` (*domestic
  metering is an explicit non-goal — the mains stay effectively unlimited
  at the household tap*), and the ones recorded below per slate.

---

## docs/slates/builds/bathroom-slate.md — 141 → 144 · Status UNBUILT → PARTIAL

The stamp said *"no bathroom content, state or fixture exists"*; the
residences build shipped exactly that. `packages/content/generic-objects/content/stuff/location/room/bathroom.yaml`
(a `FurnishableRoom` row with `props:` toilet · basin · tub),
`content/archetypes/bathroom.yaml` (the capability archetype:
`bulkSource: water` + `presence: toilet`), and the three fixture rows under
`content/stuff/thing/fixture/` (`toilet.yaml` prose-only, `basin.yaml` a
bulk source, `tub.yaml` a `Chair` with `restQuality: 1.4` + `warmth: 4`).
Hinkley's houses and Seznick House's units instantiate the row
(`furnishing.md:396-403`, `holding.md:396`). `furnishing.md § Four
archetypes` (the *presence* row) and `§ The LOD ladder` (*toilet prose ·
basin real water · tub a real affordance*) document it. Nothing else in the
slate has code: no cleanliness / hygiene state (`dressingQuality` on
`lib/vitals/Dressing.ts` is consumed by `TreatController` and has no
producer — the row's own comment says so); no `Mirror` class (`perceiver.md:109`
names a mirror only as a hypothetical instrument composition); no
bathhouse anywhere in `packages/content`; no `washroom` / `privy` /
`outhouse` row; no facility-access rule (correct — the slate wants none).
One cut, one re-stamp; the file grew three lines because the status
block and `Left` did.

### Cut (SHIPPED · DOCUMENTED)
- `## Doctrine` → bullet 1 *"No waste. Standing decision, reaffirmed…"* (21–27, 7) — code: `fixture/toilet.yaml` composes no capability mixin (the archetype row's comment: *a test enforces that*); doc: `furnishing.md § Four archetypes` (*what it is for is not modelled*), `§ The LOD ladder`. Replaced by a one-line pointer. The doc carries the what and the LOD *why*; the slate's **dignity** why (the uncanny is asymmetric; the revisit door is closed but labelled → metabolism) is not there → Handoff below

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph (the toilet paradox) · `## Doctrine` bullet 2
- `## The four functions` — 2 Washing (no producer of a cleanliness state anywhere in `packages/server/src/mud`; `Condition.contagion` still *reserved, no consumer*) · 3 The mirror (no self-directed `describeFor` surface; `belief.md` has no mirror) · 4 Privacy (the row comment records the interior lock as *the seam co-lease, guests and the prison's panopticon would consume*; no door in the row carries `Lockable`). Function 1 is under Uncertain
- `## The LOD ladder [DECIDED]` — the **Room** rung shipped (the archetype row); Detail / Fixture are authoring conventions with no test of their own (the hospitality `bar` row carries a basin — the Fixture rung by example); **Venue** (the bathhouse) is unbuilt. Kept whole — a table is one paragraph
- `## The archetype set — deferred to its own design session` — ONE bathroom row shipped, not the closed set of four; the design session has not happened; no district skins
- `## The bathroom debate` — all four bullets + the rail. The first two bullets are doctrine (below); *the provocation is legacy content* and *the federalism layer* are content / governance build items with nothing shipped (no segregated bathhouse, no one-body-plan facility row)
- `## Open questions` 1–5 — all still open. Q2's premise is confirmed by `tub.yaml`'s own comment (*if hot water is ever modelled, this is one field*)

### Doctrine — kept, labelled
- `## The bathroom debate` → *Kernel neutrality is the forcing function* and *Body diversity makes it material; the allegory doctrine makes it survivable* — the laboratory thesis applied to one debate; a candidate for `civics.md § Why` or `docs/design-lenses.md`; the framing *toilet paradox* paragraph is the slate's own spine

### Uncertain — kept
- `## The four functions` → 1 Water (33–37) — the tap half shipped (`basin.yaml`, `bulkSource: water`); the **utility metering** half now contradicts `watershed.md:720-722` (*domestic metering is an explicit non-goal, so there is no demand model to ask*) and `:1118-1120` (*the mains stay effectively unlimited at the household tap; rivalry lives at agricultural and industrial scale*). Kept verbatim as one paragraph; requirements must reconcile the venue's *water line on the books* with the watershed decision
- `## The water-tech gradient [DECIDED]` (62–68) — *municipal taps downtown; pumps and wells at the frontier*: the city half exists as the Conduit ladder (`watershed.md § the Conduit ladder`: gravity vs pumped conduits, the District tank, the standpipe), but *city venues meter water as a utility* is the same contradiction as above; the frontier half (a well, a hand pump, the bucket) has no fixture row — `water-butt.yaml` is the nearest thing, and `watershed.md:922` says the `pump` verb is a bellows and *no pumping verb at all*
- `## The LOD ladder [DECIDED]` — the slate's ladder is per-VENUE (detail / fixture / room / venue); `furnishing.md § The LOD ladder` is per-FIXTURE (*a fixture is modelled to the depth at which the world actually reads it*). Siblings, not the same rule; the venue ladder is not in any doc
- Overlaps for the cluster pass: the water utility line ↔ `stewardship-slate` (cited); the interior lock ↔ `prison-slate` (the panopticon); the debate's amendment-library floor ↔ `legal-code-slate`

### Handoff (belongs in a doc outside my list)
- → `furnishing.md § The LOD ladder` (a second sentence after *the bathroom carries all three rungs at once*), the why the cut bullet carried:

  > **No waste. Standing decision, reaffirmed.** Characters do not
  > defecate or urinate; omitting waste costs nothing, simulating it
  > costs dignity (the uncanny is asymmetric). The revisit door is
  > **closed but labeled**: if pedagogy ever demands the excretory
  > system, [metabolism](../../subsystems/metabolism.md) already
  > teaches intake honestly — that is where the curriculum value
  > lives.

### Status block
- Status: UNBUILT → PARTIAL (the room, the archetype and the three fixtures shipped; the status line names the row and points at furnishing.md)
- Left: *the washing/cleanliness state · the mirror self-recognition read · the closed restroom archetype set · the bathhouse venue · water-as-utility metering · the legacy segregation conventions* → *the washing/cleanliness state · the mirror self-recognition read · the interior lock as a consequence · the closed restroom archetype set + district skins · the Detail / Fixture / Venue rungs · the bathhouse venue · water-as-utility metering (⚠ watershed made domestic metering a non-goal) · the frontier water gradient (pump · well · bucket) · the legacy segregation conventions* (the body wins: privacy, the venue ladder and the gradient were unrepresented; the metering item now carries its contradiction)
- Size: a build → a build

---

## docs/slates/builds/pathfinding-slate.md — 123 → 107 · Status UNBUILT → UNBUILT

Captured three days ago and still exactly true. The census holds at
today's tree: `FireLogic.ts:236-243` flood-fills rooms with a `visited`
set; `packages/content/transport/src/idea/LaneCatalogue.ts:189` `planRoute`
breadth-firsts a compiled lane adjacency (called from
`JourneyController.ts:114` and `lib/behavior/consigns.ts:300`);
`Mobile.firstStepToward` is absent from `lib/spatial/Mobile.ts` (reverted,
as the slate says). No `routeTo` / `findPath` / `NavApi` anywhere in
`packages/server/src` or `packages/content/*/src`; `GotoController.ts:22`
says *no pathfinding — the slate's stated non-goal*. `ServiceRoute.ts`
mentions breadth-first only to say a Journey cannot tell a row from a
search — a row, not a fourth walk. `lint:lib-statics` exists
(`packages/server/package.json`), so Q3's ceiling is real. One cut.

### Cut (SHIPPED · DOCUMENTED)
- `## ⭐⭐ What pets did instead` → the satnav blockquote, the *memory, not navigation* paragraph and the four *what that buys* bullets (61–81, 21) — code: `lib/behavior/homes.ts:1-38` (the header carries the whole why: satnav-not-a-cat, the trail, the earliest-reachable rule, *"lost" needs no code*), `lib/husbandry/Bonded.ts:306-327` (`trail`, persistent) + `:510-520` (`rememberPlace` rewinds); doc: `pets.md § The brains — homes` (*memory, not navigation … rewinds on revisit, clears at home … genuinely cannot get back, and nothing announces it — the BFS this replaced made lost impossible*). Replaced by a two-line pointer; the section's closing ⚠ paragraph (*the first question for any pathfinding build is whether its consumer wants a path at all*) is KEPT — it is the slate's guidance, not the pets design

### Kept (UNBUILT)
- the status block (re-stamped) · the provenance quote · *Sits on* (all four docs exist)
- `## The census — three searches` — the table + both paragraphs (verified above; the ⭐ *not a foregone conclusion* paragraph is the slate's question)
- `## If it is built anyway` 1–5 — all open; no shared primitive exists for any of them to be answered by
- `## What is NOT in scope` — both bullets still true (`homes` is memory-based; `FireLogic` / `LaneCatalogue` are unchanged)

### Uncertain — kept
- the ⭐⭐ `Left` item *decide whether a shared pathfinder should exist at all* — `logistics.md § ⭐⭐⭐ Routing: what the pathfinding actually is` already carries a standing decision: *there is no general pathfinding Api and should not be one yet … when a second edge set needs search, promote the walk then — not before*. The slate does not contradict it (its Q5 is the same acceptance test), but the decision is made and documented; the slate is the build that fires when the trigger does. The re-stamped status line now points at it rather than the body being rewritten
- Overlaps for the cluster pass: `boundary.md:943` and `sandbox.md:708` both note *pathfinding and `reachable` have the same shape and will want the same* seam — the MQL `reachable` seed is a fourth candidate consumer the census does not list

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (one sentence added pointing at logistics.md's standing *not yet*)
- Left: unchanged — *⭐⭐ decide whether a shared pathfinder should exist at all (the pets build concluded not for animals) · the graph vocabulary — exits vs lanes vs conduits vs the elastic Warren · the cost model (legs · distance · difficulty · mode) · where it lives, given `lint:object-verbs` forbids a subject-first Api static · whether the two shipped walks migrate onto it* (every item is a numbered question still in the body)
- Size: a build → a build

---

## docs/slates/builds/presence-hollowing-slate.md — 115 → 111 · Status UNBUILT → UNBUILT

Unbuilt. `hollow` in `packages/server/src/mud` hits one comment
(`AssessController.ts:155`, a diagnosis example) and in content only place
names (`newbie-wilds/crossroads/hollow.yaml`, the fog hollow) and prose;
no `presence` / `hollow` field, condition or mixin on any agent; no
subsystem doc mentions hollowing. `VerbalESPModality` / `EmotiveESPModality`
(`platform/idea/modalities/`) are empty `Modality` singletons — nothing
reads an agent's presence through them. Every *See also* target exists
(`story-bible.md`, `alignment-slate.md`, `magic-items-slate.md`, the
three docs). One cut (the duplicate status block); one clause added to
the stamp.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"Status (2026-07): named, not designed — spun out of the magic-items walk…"* (11–16, 6) — history; its two claims (the physical shadow of the cosmology; two consumers converged) are `## The thing to model` and `## Why it exists`, both kept

### Kept (UNBUILT)
- the status block (re-stamped) · *See also*
- `## The thing to model` (the three canon constraints) · `## Why it exists — two consumers` (sanctity / holy water: no `sanctity` effect reads a presence state — `magic-items.md` has BUC only; ESP: nothing branches on presence) · `## The architectural seam` (a) vs (b) · `## Distinct from consciousness` (`getConsciousness` still on vitals; still orthogonal) · `## Relationship to alignment` · `## Open questions` (all four open) · `## Deferred` (all three)

### Uncertain — kept
- `## The architectural seam` → shape **(b)** (76–82) lists *death-as-departure* and *possession, polymorph-as-vessel-swap, astral/remote presence* as what reification would unlock. The mortality build shipped death-as-departure **without** reifying the relation: `lib/mortality/Shade.ts` is an `Avatar` subclass holding the same identity path and the `PlayerApi` slot, `undead` = *animate without being alive*, and `ConditionApi.reembody(shade, container)` materializes a fresh body (`mortality.md § The shade`, `§ reembody`). Also `WireBody` (sandbox) is a second between-bodies vessel. The weighing in (a) vs (b) should count these as evidence that the fused-class design keeps absorbing vessel changes; the section is kept verbatim and the stamp carries one clause pointing at mortality.md
- Overlaps for the cluster pass: `mortal-vessel-slate` (the shade's diminished-vessel tail) ↔ shape (b); `alignment-slate` ↔ the *in-between reader* question; `magic-items-slate § Sanctity` ↔ consumer 1

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT (one parenthetical pointing at the shade)
- Left: unchanged — *presence-vs-hollow as a physical state on an agent · who perceives it (ESP · the attuned reader dial · sacred instruments) · binary or degree · the present→hollow transition · the reified inhabitant↔vessel model* (each is a body section or open question)
- Size: a build → a build

---

## docs/slates/tails/wire-suite-growth-slate.md — 108 → 122 · Status (none) → UNBUILT

The slate had **no status block at all**; one was added (the file grew by
it). Every deferred seam is still deferred at today's tree, while the
tier it trails has doubled: `packages/wire/tests/` holds **twenty** flow
files (the framing says eleven — history, left as written). Per seam:
(1) `harness/registry.ts:71` — `packs` is *CHECKED, not merely written
down*, and `runner/global-setup.ts` boots one world; no group mechanism.
(2) `farming.dirty.wire.test.ts:12-22` — *the growth arc does NOT port …
until the suite grows a compressed-clock boot group (recorded in the
growth slate)*; `testing.md § The clock ceiling` says *the group itself is
tracked in wire-suite-growth-slate.md*. (3) `farming.dirty:181` — the
pour-the-soil trap and the too-early `pick` refusal *stay with the manual
drive*. (4) `metal-chain.dirty.wire.test.ts:66-95` still asserts
`unknown-verb` for a bare `measure strike` and names the same fork. (5)
`cooking.dirty.wire.test.ts` has no `stir` / `heat` / `plate` / chest
scene. (6) `global-setup.ts:93-97` — *the prose census … is a MEASUREMENT,
not a failure — no ceiling is enforced*. (7) `testing.md § The boot cost` —
*a Mongo snapshot/restore reset path … is recorded as a candidate in the
wire-suite growth slate rather than built*. (8) `e2e/global-teardown.ts:55`
runs `purge-test-characters.ts`; `packages/wire` has no teardown purge.
No cuts.

### Cut
- none

### Kept (UNBUILT)
- the framing paragraph · `## Deferred seams` 1–8 (verified above) · `## What this slate is NOT`
- `## ⭐⭐ Content findings the first run handed over` — the table, one paragraph, kept whole. Spot-checked rows still true: `OfficeController.ts:67` still answers *No such player.* (`office assign`); `trade-fuel/src/` has no `behavior/` dir (no `chars` brain); `spare-ingot.yaml` + `iron-ingot.yaml` both ship the `ingot` keyword; `ContractLogic.expireStale` expires a **claim** past its expiry, not an unclaimed post, so the job-board row stands; `harness/session.ts` has no unsubscribe

### Doctrine — kept, labelled
- `### 6` → the ⚠ paragraph *a prose read that exists because no `subscribableFields` descriptor reaches the fact is a card-surface finding … a wire file may never add a descriptor to make itself assertable* — already documented at `testing.md § The three assertion channels` (⭐ *A wire file may not add a `subscribableFields` descriptor*). Left in place because it qualifies the unbuilt ratchet, not as a standalone item

### Uncertain — kept
- the framing *"eleven flow files"* and the census's *"79 across 11 files"* — the suite is at twenty files; the numbers are the first green run's and are history, not a claim about now. Not rewritten. Whoever ratchets seam 6 must re-measure, not freeze 79
- `### 1` cites *the plan's D3* and `### 6` *plan D1* — the wire-tests plan was retired at its sweep (`docs/plans/` has no `wire-tests-plan.md`); the D-numbers now resolve only through git. `testing.md` carries both decisions (the `packs` check, the census)

### Handoff
- none — `testing.md` already carries the boot cost, the clock ceiling, the census rule and the snapshot candidate, each pointing at this slate

### Status block
- Status: (none) → UNBUILT
- Left: (none) → *boot groups · the compressed-clock group (farming's arc as its first customer) · farming's yard legs (the one-actor problem) · metal-chain's provisioning leg · the crafting cookhouse scene moved to `cooking.dirty` · the prose-census ratchet · a Mongo snapshot/restore reset path · a wire-litter purge · the content-findings handoff table (each row owned elsewhere)*
- Size: (none) → a tail

---

## docs/slates/builds/estate-nesting-slate.md — 106 → 101 · Status UNBUILT → UNBUILT

Still exactly the shape the slate describes. `lib/chattel/Estate.ts:185-205`
pushes `state: ctx.captureState(live)` for every owned good whose
persistence key is not explicit, and `state: {}` + `key` when it is; no
cap, no size check anywhere under `lib/persistence/` or `lib/chattel/`
(no `16`, `byteLength`, `maxBytes`). One detail in Q2 is slightly off:
the destruct-path failure is a `console.error` (`Persistable.ts:365`,
`cleanupOnDestruct: capture failed`), not a `console.warn` — still a
swallowed failure, so the *silent data-loss shape* claim stands; not
rewritten. The mitigation the slate generalises from is shipped and
documented. One cut.

### Cut (SHIPPED · DOCUMENTED)
- `## ⭐ What the pets build already proved` → the first two paragraphs + the code block (57–66, 10) — code: `Estate.ts:190-199` (the keyed branch: `key`, `state: {}`, with the *would diverge from its first meal* comment); doc: `furnishing.md:181-186` (⭐ *A good that persists itself is a REFERENCE in the estate … `EstateEntry.key` with `state: {}` … the overlay and the owner's login both resolve first*), `persistence.md § Keyed nested hosts`, `pets.md:233`. Replaced by a pointer; the section's ⭐⭐ question paragraph and the ⚠ counter-argument (68–77) are KEPT — they are the slate

### Kept (UNBUILT)
- the status block · the provenance quote and its resolution (`holder_snapshots` is one of 48 authored collections — `packages/server/src/schema/holder_snapshots.yaml` exists) · *Sits on*
- `## The thing` (the measurement is history but the mechanism is unchanged — `Estate.ts:202`) · `## ⭐ What the pets build already proved` → the ⭐⭐ and ⚠ paragraphs · `## The questions` 1–4 (all open; Q3's *only four location classes* matches `furnishing.md:173` *the four location classes that compose `Persistable`*) · `## What is NOT in scope`

### Uncertain — kept
- `## The questions` → 2 — says `console.warn` in `cleanupOnDestruct`; the code is `console.error` at `Persistable.ts:365`. Same shape (swallowed), wrong verb; left as written
- Overlaps for the cluster pass: Q4's *no migrations, ever → a DB drop* ↔ the standing project rule (`CLAUDE.md`, memory); the container-vs-containable model (Q3) ↔ `furnishing.md § Owner-based persistence` where the overlay decision already leans containable

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged — *⭐⭐ decide what an estate entry should CARRY — a reference, a copy, or a copy under a cap · the 16 MB document ceiling and what happens at it · whether a good's state belongs in the owner's record at all now that `EstateEntry.key` proves it need not · the migration for entries already written* (Q1–Q4, one to one)
- Size: a build → a build

---

## docs/slates/tails/distance-perception-slate.md — 96 → 96 · Status UNBUILT → UNBUILT

Unbuilt, and the seeding facts still hold: `lib/perception/Modality.ts:77-90`
(`MAX_HOPS = 2`, `EXIT_TAU = 1.0`), `platform/location/Crossing.ts:3-7`
(the bespoke dynamic `tower` detail — *there is no `ClockTower` Stuff*),
`ScryableMixin` per `perceiver.md`. None of the four patterns has code:
no `vista` / `distantDescription` / `landmark` anywhere under
`packages/server/src/mud`; `LookController.ts:82-88` sends `look <exit>` to
`lookAtTarget(exit)` — the exit's own face, never the far room; nothing
annotates an exit from a modality walk (*from the north: something
snarling* has no producer — `Concealable.ts:81`'s `concealmentHint` is the
nearest thing and is per-object); `senses.md § What's NOT in this build
(Wave 2+)` still lists no distance work as done. The interim authoring
rule is recorded at `demo-content-requirements.md:1097-1101` and
`:506`, a requirements doc that is still live. No cuts.

### Cut
- none

### Kept (UNBUILT)
- the status block · the framing paragraph · *Seeding facts* (all four verified) · `## The four patterns` 1–4 · `## Interim authoring rule` (a standing constraint until pattern 1; its only other home is an ephemeral requirements doc, so it stays here) · `## Cross-references` (every target exists; the `ref-shapes.md` link is `../../ref-shapes.md`, correct despite its `subsystems/` label)

### Uncertain — kept
- `## The four patterns` → 2 *Bounded peek* names the flag `--peek`; `cmd/perception/look.yaml:47-55` already ships `look --peek` meaning *render prose without changing focus* (skips the `focus-update` phase). The one-hop peek would need another spelling or would overload a shipped option — a requirements call, not a cut
- Overlaps for the cluster pass: pattern 4 (the danger-sense exit annotation) ↔ `stealth.md`'s `wary` brain and the ambush consent gate — the *unconcealed danger only* clause is the same rule; pattern 3 ↔ `magic-items-slate` (what buys privileged reach)

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged — *vista references (a `Detail` resolving a remote Stuff) · the bounded one-hop peek (`look <exit>` / `--peek`) · what buys privileged multi-hop reach, and its tiers · the danger-sense exit annotation* (patterns 1–4, one to one)
- Size: a wave → a wave

---

## docs/slates/builds/demo-slate.md — 95 → 94 · Status UNBUILT → UNBUILT

The stamp holds. Per item of the demo cluster, checked against
`packages/content` and the server: (1) no `lesson-completed` /
`exam-passed` / issuer adapter anywhere — the only webhooks are Kick's
(`backend/KickWebhookRoutes.ts`), and `advancement.md:17,78` still defers
external evidence; (2) no aged / seeded demo world — `demo` under
`packages/content` and `docs/subsystems` hits nothing; (3) no conferral
ceremony — `ceremon` hits only `Login.ts` / `SandboxLogic.ts` prose and
`advancement.md` has none; (4) no aid post — `aid.?post` matches no
content row, and `trade-medicine` ships two `analyze` controllers and no
location; (5) no fountain row — `fountain` appears only in `fill.yaml` /
`goto.yaml` help text and a transport corridor's prose; (6) the mobile
floor it wants to check exists (`client-shell.md § The mobile bar`, the
pull-down, the command sheet) but no record of a phone check with a fight
and a forum session; (7) production prep, not code. One cut in *Held
decisions*.

### Cut (SHIPPED · DOCUMENTED)
- `## Held decisions this list waits on` → *Contracts merge (MR !149) for the storm-contract/ford cohort cuts* (92–93, 2) — the branch merged: `contract.md` (*built on `feat/work-contracts`*), `lib/commerce/` + `ContractLogic.ts`. Replaced by a struck one-liner with the pointer

### Kept (UNBUILT)
- the status block · the capture paragraph (every source artifact exists: `education-videos.md`, `study-com/strategy.md`, `docs/lenses/`, `staging/wishbook.md`) · the organization note (`build-menu.md` and `guild-slate.md` both still exist; the *reconciling the three lists* pass is the slate-backlog taxonomy's generated README, but the note is framing, not a build item)
- `## The demo cluster` 1–7 (verified above)
- `## Adjacent backlog` — all nine bullets; an index into lens entries and other slates (`economy-slate.md`, `inquiry-slate.md`, `narration-slate.md` exist), kept whole
- `## Held decisions` → the resonance feel-test (no theme decision recorded in `message-rendering.md` beyond the shipped cascade) · guild-slate reconciliation (`guild-slate.md` is UNBUILT)

### Uncertain — kept
- `## The demo cluster` → 6 *Mobile-floor check* — the object of the check shipped (`client-shell.md § The phone's play surface`, `§ The mobile bar`), so *"shootable as-is or a scoped punch-list"* may already be answerable; nothing records the fight + forum phone session, so it stays
- `## Adjacent backlog` → *the three extensibility bridges* — pieces shipped in different shapes: brains ship in packs via `src/behavior/` (`content-packs.md`), and the item-effect surface is `magic-items.md`'s `EffectContext` + the three item classes; a *vetted brain catalog* and a *scripted-behavior brain* (a brain that runs a `scripting.md` script) have no code. The bullet is an index line, kept whole
- `## Adjacent backlog` → *Economy gym* — `test:gym` (`vitest.gym.config.ts`) is the combat balance bench, not an earn/spend simulation; still unbuilt
- Overlaps for the cluster pass: item 2 (the aged demo world) ↔ `authored-vs-procedural-slate` and the guild slate's halls/porters; item 4 ↔ the medic vertical (`harm.md`); item 3 ↔ `lenses/moments.md`; item 1 ↔ the credential seam in `advancement.md`

### Handoff
- none

### Status block
- Status: UNBUILT → UNBUILT
- Left: unchanged — *the mock issuer adapter · the aged demo world · the threshold-ceremony beats · aid-post content · the fountain acoustic prop · the mobile-floor check · the rehearsed authoring walk* (items 1–7, one to one; the adjacent backlog is an index into other slates and is deliberately not in `Left`)
- Size: a build → a build

---

## Batch totals

| slate | lines | Status | Left items | Size |
|---|---|---|---|---|
| bathroom | 141 → 144 | UNBUILT → PARTIAL | 6 → 9 | a build → a build |
| pathfinding | 123 → 107 | UNBUILT → UNBUILT | 5 → 5 | a build → a build |
| presence-hollowing | 115 → 111 | UNBUILT → UNBUILT | 5 → 5 | a build → a build |
| wire-suite-growth | 108 → 122 | (none) → UNBUILT | 0 → 9 | (none) → a tail |
| estate-nesting | 106 → 101 | UNBUILT → UNBUILT | 4 → 4 | a build → a build |
| distance-perception | 96 → 96 | UNBUILT → UNBUILT | 4 → 4 | a wave → a wave |
| demo | 95 → 94 | UNBUILT → UNBUILT | 7 → 7 | a build → a build |

784 → 775 lines. Cuts: 6 (SHIPPED · DOCUMENTED) · 0 superseded · 0
graduated (write list empty; 1 Handoff, to `furnishing.md`) · 0 ABSORBED
· 0 deleted. Two slates gained lines because a status block was added
(wire-suite) or `Left` grew (bathroom).

Hardest calls:
1. **Bathroom → PARTIAL.** The stamp said nothing existed; the residences
   build shipped the room, the archetype and three fixtures. Only the
   *no waste* bullet was cut — everything else (washing, mirror, bathhouse,
   the venue ladder) is genuinely open — but two kept sections now
   contradict `watershed.md`'s *domestic metering is a non-goal*, so they
   sit in Uncertain rather than being trimmed.
2. **Pathfinding's pets section.** The shipped `homes` design is fully
   documented (`pets.md` + the `homes.ts` header) so the description was
   cut, but the section's closing ⚠ paragraph is the slate's own guidance
   and stayed — cut at paragraph granularity, not section.
3. **Wire-suite had no status block.** Adding one is the only way to
   re-stamp; the framing's *eleven flow files* (now twenty) was left as
   history rather than rewritten.
4. **Demo's adjacent backlog** is an index of nine other slates' items, some
   partially shipped in other shapes; it was kept whole and kept out of
   `Left`, with the partial-shipped notes in Uncertain.
