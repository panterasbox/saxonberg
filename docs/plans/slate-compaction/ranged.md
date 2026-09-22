# Slate-compaction pass — ranged batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `ranged.md` only
(one existing sentence corrected, no inserts needed — every decision the
slates carry that shipped is already stated in `ranged.md`,
`combat.md`, `combat-formations.md` or `materials-response.md`). Line
numbers below are the ORIGINAL file's. Originals saved under the scratch
dir `ranged/orig/` for diffing. Code was verified in
`packages/server/src/mud/lib/combat/**`, `lib/behavior/**`,
`lib/perception/**`, `lib/boundary/**`, `platform/thing/equipment/**`,
`platform/idea/api/{CombatLogic,MagicLogic}.ts`,
`platform/idea/cmd/combat/**`, and the platform / generic-objects /
saxonberg-lounge content packs.

Three things a reviewer should know first:

1. **The ranged slate is mostly honest backlog.** 1025 lines, and only
   Wave 1 + the injury build's launcher slice have shipped: `RangeBand`,
   `AimResolution`, `DeliveryProfile` (+`penetration`), `EnergySource`,
   `Launcher` (four fields: `energySource` · `muzzleSpeed` ·
   `projectileTemplate` · `readySeconds`, plus the `readyAtS` clock),
   `Projectile` (`calibre` only), `shoot`, `throw`, `fight
   advance/withdraw`, the splash consent gate, the `deliverAt` band gate.
   **Nothing else in the slate has code**: no `Cover` mixin
   (`AimResolution.ts:34` — *"`cover` resolves as `stand` until cover
   exists"*), no point→blunt armour conversion
   (`materials-response.md § Deferred` still names it), no fouling axis
   on anything but water, no `elasticity` anywhere, no cartridge /
   magazine / action / chambering fields (the flintlock musket row is
   `energySource: chemical · muzzleSpeed: 316 · readySeconds: 12` and
   nothing more), no archer / skirmisher / marksman / sentry brain, no
   `skirmish` / `firing-line` preset (four presets seeded), no band
   preference on any role, no vista, no per-metre acoustics
   (`AudienceGather.ts:86` still `PER_HOP_TAU = 0.01`, `MAX_HOPS = 2`),
   and the lounge's "taser" is the melee `StunBaton`
   (`office-taser.yaml`'s own header: *"the less-lethal family (a real
   taser) is the ranged tail's business, not this"*). So the cuts are
   ~120 lines and `Left` grew from 4 items to a full roster.
2. **One `Left` item on the combat-tactics slate is contradicted by a
   shipped ruling.** *"the `physical` conduit channel for cross-room
   shots"* — `ranged.md § Deliberately out of scope` makes cross-room
   fire **load-bearing** (*"what makes leaving through an exit a genuine
   escape"*), `MagicLogic.deliverAt` keeps the same-scene check for the
   same reason, and no `physical` channel exists on any `Conduit`
   (`lib/boundary/{Conduit,SoundConduit,SmellConduit}.ts`). Kept
   verbatim under Uncertain, flagged for requirements.
3. **One morale claim was superseded by shipped code and the roadmap in
   `ranged.md` still listed it.** `lib/combat/Morale.ts` shipped morale
   as an **engine-derived read** (`combat.md § Morale`), not as brain
   doctrine; the slate's paragraph was cut with a pointer and the W3 row
   of `ranged.md § The roadmap` got the doc's own strikethrough
   treatment (see *One existing sentence changed*, below).

---

## docs/slates/builds/ranged-slate.md — 1025 → 910 · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Foundations (already decided, already shipped)` → all four bullets (23–76, 54): relationship-not-coordinates — code: `lib/combat/CombatGraph.ts`, `RangeBand.ts`; doc: `ranged.md § Bands are relationships, not positions`. The room caps the bands + the per-zone gap + the research note — code: `Location.getLinearExtent()`, `CartesianLocation` `extent` override (the slate's *"single named dependency"* shipped); doc: `ranged.md § The arena caps the ladder` (*Extent is deliberately ONE number*). Band extension + advance/withdraw as gambits — code: `fight.yaml` `advance`/`withdraw`, `resolveBandStep`; doc: `ranged.md § Opening the gap, and closing it`. Consent inherits + cross-room out of scope — code: `CombatApi.initiate` (the one handshake `throw` and `shoot` share), `MagicLogic.ts:1362` same-scene check; doc: `ranged.md § One initiation handshake`, `§ Deliberately out of scope`. Heading + one pointer paragraph left. ⚠ The band vocabulary is a **shape supersession** — the slate designed `close/short/medium/far`, the code shipped `close · reach · near · far` with `short` explicitly not a band (`ranged.md` l.46 box); the pointer says so.
- `## The unifying abstraction — delivery at range` → the one-shape paragraph + table + the thrown-effect-carriers paragraph (80–99, 20) — code: `DeliveryProfile.ts`, `ThrowController.ts`, `CombatLogic.ts:4635` (the thrown-carrier resolve + splash shares), `HazardDelivery.range = 'ranged'`, `DischargeOptions.origin`; doc: `ranged.md § The one abstraction`, `§ Splash, and the gate over it`, `§ The two adopted seams`, `§ throw` (*a potion only acts if its `route` is `contact`*). The **arrows-and-knives paragraph (101–107) is KEPT** — mixed: arrows as a Stackable shipped (`platform/thing/equipment/Projectile.ts`) but spent projectiles persisting/recoverable, fletching, thrown-balance and `elasticity` have no code (`ShootController.ts:84`: ammunition is spent, nothing lands in the room)
- `### Launcher` → the `energySource` paragraph (237–242, 6) — code: `lib/combat/EnergySource.ts` (`ENERGY_SOURCES = muscle | stored-elastic | chemical`, `READINESS_HOLDS`, `electrical` parked in the module doc); doc: `ranged.md § Readiness — one field, four families`. The bow / crossbow / gun field bullets and the runtime-state / derived bullets are KEPT (the shipped `Launcher` carries none of them)
- `## The Delivery Profile — one contract, every projectile` → the intro + the six-field table + *"cannot tell an arrow from a bullet"* (311–325, 15) — code: `lib/combat/DeliveryProfile.ts` (`energyJ · channel · stability · integrity · payload · penetration`); doc: `ranged.md § The Delivery Profile` (incl. the ⭐⭐ `penetration`-as-pressure paragraph). The fit-asymmetry paragraph is KEPT (graded archery fit is W3 in the doc's roadmap; there is no spine/draw match anywhere)
- `## Resolution — placement, not to-hit` → the intro paragraph (336–338, 3) and the *target's answer* · *base matrix* · *competence buys tempo, never steps* bullets (343–354, 12) — code: `lib/combat/AimResolution.ts` (`AIM_LADDER`, `RANGE_ANSWERS`, the 3×5 `matrix` at l.103–107, the step modifiers, `resolve` takes no competence input); doc: `ranged.md § Resolution — placement, not to-hit` (+ the Wave 1 status box: engine wires `snap` and three answers; `cover` resolves as `stand`). Replaced by one pointer + one combined pointer bullet. **The aim-ladder bullet (340–342) is KEPT** under the paragraph rule: *"Aim decays on movement or band change"* has no code — `AimResolution.decaysWhileHeld` is a predicate on the muscle-held case only, and nothing wires held/settled beats — and the doc does not carry it
- `### LOS` → bullet 1 *Intra-room LOS does not exist* (496–498, 3) and bullet 3 *sight may cross; combat may not* (507–512, 6) — doc: `ranged.md § Deliberately out of scope` (both sentences, near-verbatim). Pointer bullets left; the **authored-vistas bullet (499–506) is KEPT** — no `vista` anywhere in `src/mud`
- `### Poise by energy source — the honest balance lever` → body (543–550, 8) — code: `EnergySource.ts` (`READINESS_HOLDS`, `holdPoisePerBeat`), `Launcher.ts`; doc: `ranged.md § Readiness` (*"it does not tire you … the cleanest balance lever"*, the holds-free column). Heading + pointer left; the pointer notes the bow's hold window itself is still W3 (`ranged.md § roadmap`)
- `## Multi-party` → the *bands do not compose* paragraph (730–741, 12) — doc: `ranged.md § Bands are relationships, not positions` (near-verbatim, including the prose test). Pointer left
- `## Multi-party` → consequence 2 *withdrawal is per-edge* (758–762, 5) — code: `fight withdraw` *"on ONE threat at a time"* (`fight.yaml:16`); doc: `ranged.md § Opening the gap` (*"three attackers is three withdrawals"*). Pointer item left, numbering preserved
- `## Magic parity` → body (933–937, 5) — code: `MagicLogic.ts:1360–1378` (the band gate; `magic.spellEnvelope` seeded `far`); doc: `ranged.md § The two adopted seams`, `§ The one abstraction`. Heading + pointer left
- Open questions **Q4** (948–951, 4) — the matrix values ship (`AimResolution.ts:103–107`), doc `ranged.md § Resolution`; pointer left noting held/settled beats ride W2's held aim. **Q5** (952–954, 3) — resolved relationally, `ranged.md § Splash`. **Q18** (989–991, 3) — `lib/combat/Morale.ts` is a shared derived read, never brain-local (`combat.md § Morale`); the ammo-dry trigger is not among `MoraleInputs` and is pointed at Q13. **Q19** (992–994, 3) — every edge opens at the arena max, ambush at `close` (`ranged.md § Opening the gap`). One pointer line each, numbering preserved

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none. Every shipped decision the slate carries is already in `ranged.md`, `combat.md` or `materials-response.md`.

### Superseded — cut
- `## Resolution` → *Area arrival = the hazard substrate … a placed hazard* (365–370, 6) — by the code: splash resolves **relationally** over the target's `close` set with `Dose` shares (`CombatLogic.ts:4644–4667`, `combat.range.splash*` dials) and the remainder pools through `pour`; no hazard is placed → `ranged.md § Splash, and the gate over it`. The doc's roadmap keeps *the lingering residue hazard* as W2. Pointer bullet left
- `## NPC brains` → *Morale is brain doctrine* (701–706, 6) — by the code: `lib/combat/Morale.ts`, an engine-derived read consumed by the brain (outnumbered · side going down · wounds · terms · onlookers) → `combat.md § Morale`. Pointer left; the ammo-dry trigger has no input and stays open in the kept *Ammunition is free drama* paragraph

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph
- `## The unifying abstraction` → the arrows-and-knives paragraph (mixed, see above)
- `## The old GunCode, re-examined` — whole (no cartridge / magazine / jam / tracer code; the one gun row has no feed, action or reliability)
- `## Guns — the worked hard case (the political architecture)` — whole, points 1–6 (no credential-locked issue, no powder recipe or its absence as policy, no use-of-force spec, no registration beyond the generic chattel stamp). Point 2's *"competence never gates whether a gun fires"* is realised (`resolve` takes no competence) and documented, but the point is one paragraph with the unbuilt four-rules / negligent-discharge design — kept whole
- `## The field model` → the store-causes discipline paragraph (framing for the unbuilt fields) · `### Launcher` bow/crossbow/gun bullets + runtime state + derived · `### Projectile — family fields` (only `calibre` shipped; grain, profile, spine, fletching, head, thrown-balance do not exist) · `### Cartridge` · `### Magazine` · *the statute table and the collector table are the same table*
- `## The Delivery Profile` → the fit-asymmetry paragraph
- `## Resolution` → the aim-ladder bullet (see above) · *Suppression is a held aim* (roadmap W2) · *Placement class × Delivery Profile → the wound* (placement scales splash dose and gates miss/hit only — `CombatLogic.ts:4645`, `ShootController.ts:154`; no vitals-zone reach) · *Burst*
- `## Mitigation` → `### Armor rides the response grid` whole (see Uncertain for truth 1) · `### Less-lethal` whole (the taser is a `StunBaton`; no `bag` form, no net, no spray, no NMI condition)
- `## Gun policy — which layer holds what` — whole (see Doctrine)
- `### LOS` → the authored-vistas bullet · `### Acoustics — make sound match light` whole (`AudienceGather.ts` still `MAX_HOPS = 2` / `PER_HOP_TAU = 0.01`; roadmap W3)
- `## Cover — the shield's static cousin` — whole (no `Cover` mixin; `AimResolution` pins `cover → stand`)
- `## Formations — what ranged adds` — whole. The opening paragraph restates `combat-formations.md` (three hooks, never scripts gambits) and is kept as the framing the two rulings depend on; no band preference on any role, no `skirmish` / `firing-line` (`content/platform/idea/CombatFormation/` seeds exactly `default · focus-fire · vanguard · master-apprentice`; `combat-formations.md § Deferred` — *Skirmish/Kite dies and revives with ranged*)
- `## NPC brains — doctrine, not plumbing` — all but the morale paragraph: the two framing paragraphs (the shipped `combatant` contract and feint-parity principle, which the four doctrines inherit), the two kiting governors, the four-doctrine table (no `archer` / `skirmisher` / `marksman` / `sentry` in `lib/behavior/`; `wary.ts` has a spoken challenge and no use-of-force ladder; `enforces.ts` is the melee house-peace brain), the formation seam, *Ammunition is free drama*, *Deferral discipline*
- `## Multi-party` → *aim is a single-target commitment* + its three bullets · consequences 1 and 3 · the grief seam
- `## Risk and the unskilled — ignorance, never dice` — whole (no readout ladder, no ND, no malfunction; roadmap W2 *readout ladder + cross-reading*, W4 *negligent-discharge leg*)
- `## Condition and crafting` — whole (no fouling on any weapon; `DurableMixin` + `Keen` are the two shipped axes; no assembly, no pattern keys, no catastrophic failure, no ammunition craft chain)
- `## Open questions` — Q1–3, Q6–17, Q20–27

### Doctrine — kept, labelled
- `## Guns — the worked hard case` — the framing paragraph and point 4 (*the ceiling is the curriculum*; kernel neutrality) are the pedagogical thesis of the whole gun design
- `## Gun policy — which layer holds what` → *What we encourage, and how* · *The design's own balance goals* (death consequential and uncommon; danger is geography) · *The worked case — the gun on campus* (*wall the checkpoint, don't camera the quad*)
- `## Risk and the unskilled` → the user's stated cultural position · *The rail, in bold: risk must never come from dice* (also `uncertainty.md`'s resolutional ban) · *Why this is not a thumb on the scale*
- `## Condition and crafting` → *Why (3) matters beyond mechanism: interchangeable parts is the industrialization story*

### Uncertain — kept
- `### Armor rides the response grid` → truth 1 *Stab armor ≠ ballistic armor* (380–386) — **partly realised** by shipped `penetration` (`ranged.md § The Delivery Profile`: *an arrow beats mail by being a point, not by arriving at firearm pressure*) and `Construction.ts:230–235` (`mail: point: 'fail'`, `padded: point: 'poor'`); but no soft-ballistic textile construction exists, and the paragraph is inseparable from the unbuilt W2 armour design. Kept whole; requirements should treat the arrow-vs-bullet half as done
- `## The old GunCode` → *the poker layer* paragraph (148–159) — says cover *"rides the concealment substrate (partial presence-concealment degrading targeting)"*; the slate's own later `## Cover` section separates cover from concealment (*cover ≠ concealment … two numbers*). Same-slate tension, kept for requirements to reconcile
- `## Open questions` **Q3** cross-room fire and **Q9** energy weapons — both *parked* rather than resolved; `ranged.md § Deliberately out of scope` carries the parking. Kept as open because parking is not an answer
- **Q11** *Multi-party ranged* — the first half (per-edge bands to A and B) is shipped and documented (`ranged.md § Bands`); the second half (can one held aim cover two approaches) is the kept *aim is a single-target commitment* design with no code. One item; kept whole
- **Q12** *Reload/span in the tempo economy* — readiness shipped as a clock read (`Launcher.readyAtS`, `ranged.md § What the injury build took off this roadmap`) but *"readiness as committed actions … interruptibility, partial reload"* is explicitly still W3/W4 in the same section. Kept
- **Q21** *Shoot-into-melee consent check* — the splash consent gate shipped (*deliberate vs collateral*, `ranged.md § The consent gate`) but a stray *miss* landing on a third party has no mechanism (`ShootController` resolves miss as nothing). Kept
- **Q27** *The incapacitation consent pass* — `ranged.md § Resolution` says incapacitation *"needed its own rung on the consent ladder"*, and the roadmap W3 row still lists *the incapacitation rung*. `CombatTerms.ts:30` has `incapacitation` as a **stop condition** (yield · incapacitation · death), which is a different question from consenting to be made helpless by an NMI / restraint condition; unclear whether the doc's *rung* means the shipped stop condition or the W3 item. Kept
- Overlaps for the cluster pass: `## Cover` ↔ `combat-tactics-slate` Thesis 1's `Covering`-status bullet (superseded there, pointer to here); `## Formations` `skirmish` ↔ `combat-formations.md § Deferred` + `combat-tactics-slate` (pointer to here); the acoustics fix ↔ any perception/acoustics slate; the gun-policy layer table ↔ `enforcement-slate.md` (the slate itself says so); the Practicum range ↔ the magic Practicum

### Handoff (belongs in a doc outside my list)
- none. (The morale correction lands in `ranged.md`, which is mine; `combat.md § Morale` already carries the decision.)

### One existing sentence changed in `ranged.md`
- `§ The roadmap`, W3 row: *"the four NPC doctrines + morale + NPC ammunition"* → *"the four NPC doctrines + ~~morale~~ **shipped as a derived combat read** ([combat.md § Morale]; the ammo-dry trigger is still open) + NPC ammunition"*. The code proves the pending item false (`lib/combat/Morale.ts`; `combat.md § Morale`), and the row already uses this strikethrough convention for readiness and the field model.

### Status block
- Status line: added *"and the injury build took `LauncherMixin`, `Projectile`, `shoot`, one-number readiness and `penetration`"* (the doc's own `§ What the injury build took off this roadmap`)
- Left: *W2 cover + armor · W3 bows/crossbows/less-lethal/acoustics · W4 guns (the field model, reliability, registration) · the range, armory and accessory content* → the full roster: *W2 — authored cover (directional · destructible · leased) + overturnable furniture · armor on the response grid (point→blunt, proof marks) · suppression / held aim + aim decay · placement→wound zones · burst · the readout ladder + cross-reading · authored vistas · the formation band preference + `skirmish`/`firing-line` · W3 — graded archery fit + `elasticity` · per-metre sound attenuation · the less-lethal family + the incapacitation rung · the four NPC doctrines + NPC ammunition + reload commitment · shooting into a melee + its consent check · W4 — the gun field model (launcher · projectile · cartridge · magazine) + the GunCode conversions · the political architecture + the launch regime · negligent discharge + the ignorance-not-dice rail · fouling as the fast axis, the assembly, pattern keys, grade-buys-reliability, catastrophic failure, the ammunition craft chain · the gun-policy layer table · the range, armory and accessory content* (the body wins: every kept section was represented by one of four wave labels)
- Size: a build → a build

---

## docs/slates/tails/combat-tactics-slate.md — 338 → 192 · Status PARTIAL → PARTIAL

Both theses shipped, and the second status block already said so — but
the slate still carried the pre-build design of each as live body. Thesis
1's *binary engaged-status* model was replaced wholesale by ranged Wave 1
(four bands per edge, `fight advance`/`withdraw`, the arena cap) and
Thesis 2 by the combat-formations build (`CombatFormation`, four presets,
no reward knobs). What remains unique to this slate is one contradicted
idea (the `physical` conduit channel) and the four magic-interplay
questions banked from the magic build.

### Cut (SHIPPED · DOCUMENTED)
- the second status block *"both theses SHIPPED; the ranged surface is what remains"* (10–25, 16) — history; every fact in it is `combat-formations.md § History` (the rename, Skirmish deferred, the reward knobs superseded) and the canonical block was re-stamped to carry the pointers
- *See also* → the `activity.md` bullet (51–55; *"a combat round is a sustained engagement"* — false since `combat.md § Cycle 2`: the session is a plain N-container), the `grouping.md` bullet (56–58), the `locomotion-as-activity` bullet (59–61), the `standard-model.md` bullet (69–71; *tactics want to be authored `Idea` singletons* — shipped as `CombatFormation` at `/platform/idea/CombatFormation/<name>`, `combat-formations.md § The CombatFormation Idea`). Four links serving only the cut Thesis 2 / integration sketch; the two philosophy links are kept
- `## Thesis 2 — Party tactics` → the intro paragraph (154–158), `### Lineage` (160–176), `### The standout preset — Master-Apprentice` (178–199), `### The preset table` (201–215) — code: `lib/combat/CombatFormation.ts`, `content/platform/idea/CombatFormation/{default,focus-fire,vanguard,master-apprentice}.yaml`, `PartyApi.formationPathOf`, `runInterceptionPass`; doc: `combat-formations.md` (intro carries set-policy-then-watch and the DA:O rejection; § The `CombatFormation` Idea carries the four presets; § Deferred carries Skirmish/Kite + Phalanx). Heading + one pointer paragraph left; `### Why this is text/social/AI-native` KEPT (Doctrine, below)
- `## Open questions` → all six (253–266, 14): Q1 combat exists (`combat.md`); Q2 reward balance — superseded, no knobs (`combat-formations.md § The command Discipline`, `§ History`); Q3 preset count — four, *add when content asks* (`§ Deferred`); Q4 interception order — roles in priority order, holders in roster order (`§ The three hooks`); Q5 solo — *"solo" is not a concept* (`§ The total resolution chain`); Q6 enemy tactics — NPC≈PC, the `combatant` brain is formation-aware (`§ Surface`). One pointer line each, numbering preserved
- `## What this slate does NOT cover` → bullets 1–4 (272–278, 7): *the combat system itself … not yet designed* (false — `combat.md`), geometric ranged refused (`ranged.md § Deliberately out of scope`), the activity framework, the party subsystem. Replaced by one line; the per-character-scripting bullet (279–282) KEPT — its *"could return later if players demand"* deferral has no doc home
- the closing line *"Geometric fidelity, per-character gambits, and enemy-side tactics wait for their own waves"* (337–338, 2) — enemy-side formations landed (`combat-formations.md § Surface`). Replaced by one line saying so

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none

### Superseded — cut
- `## Thesis 1 — Combat as engaged relationships` → the provoking-belief paragraphs, the *"locked in melee with X"* reframe and its three bullets, the *machinery already exists* intro, the engagement-framework bullet, the room-size bullet, the cover-and-flanking-as-status bullet, the layering paragraph, and *worth deleting the false belief* (96–128, 133–148; 49 lines) — by the code: `lib/combat/RangeBand.ts` (`close · reach · near · far` per edge, not a binary lock), `fight.yaml` `advance`/`withdraw` (kite/close), `Location.getLinearExtent()` → the arena cap (not a skill modifier), `MagicLogic.ts:1362` + `ranged.md § Deliberately out of scope` (*artillery from the next room* ruled out as load-bearing), `combat.md § Cycle 2` (the session is not a `SustainedEngagement`), and cover as an authored object with a `cover` **answer** stepping the placement ladder (`AimResolution.ts`, `ranged-slate.md § Cover — the shield's static cousin`), not a `Covering` hit-chance status. One pointer paragraph left, naming each supersession; the **`physical` conduit bullet (129–132) KEPT** (see Uncertain). *Opt-in range bands for the rare room* is the exact opposite of what shipped — bands are universal and derived
- `## Shape of the integration (sketch, not a build)` (237–247, 11) — by the build: `CombatFormation` not `CombatTactic`; the Party holds a path string + `roleAssignments` (`combat-formations.md § The total resolution chain`, `§ Roles are sets`); no `SustainedEngagement` round. Heading + pointer left
- `## Once shaped into formal requirements` → the boil-down list (288–306, 19) — by the three builds; every bullet shipped in a different shape or was replaced (the engaged-status primitive → bands; `CombatTactic` → `CombatFormation`; the preset set → four; reward scaling → none; the tests → `CombatLogic.test`, the gym formations matrix). Heading + pointer left; the two survivors are named (the `physical` conduit, cover → ranged-slate)

### Kept (UNBUILT)
- the status block (re-stamped) · the framing paragraph · the *combat-slate* blockquote (a cross-reference) · *See also* → `design-philosophy.md`, `interaction-philosophy.md`
- `## Thesis 1` → the `physical` conduit bullet (see Uncertain)
- `## What this slate does NOT cover` → the per-character gambit-layer bullet
- `### Magic interplay questions` — whole (see Uncertain): no range attenuation in `MagicLogic.deliverAt` (a band **gate** only, l.1371–1376); no interpose on a cast; cover does not exist; counterspell-vs-cover has no cover to contrast with

### Doctrine — kept, labelled
- the provocation paragraph (*"not where games like this shine … coordinated, legible, social party strategy"*)
- `## Principle` — the four principles (1, 3, 4 realised by `CombatGraph` and `CombatFormation`; 2 *codify emergent behavior* is the slate's thesis)
- `### Why this is text/social/AI-native` + *"If a combat sentence ever goes in the README … it should be this, not arrows"* — the medium argument; the AI-tutor-as-master line is stated nowhere else

### Uncertain — kept
- `## Thesis 1` → **the `physical` conduit transmissivity channel** (129–132) and the `Left` item built on it — **contradicted by a shipped ruling**: `ranged.md § Deliberately out of scope` (*"Sight may cross a vista; combat may not … what makes leaving through an exit a genuine escape"*), `MagicLogic.deliverAt`'s same-scene check kept *for that reason*, and `ranged-slate.md` Q3 *cross-room fire — parked entirely; revisit only with a consent design*. No `physical` channel exists on `lib/boundary/{Conduit,SoundConduit,SmellConduit}.ts`; `design-philosophy.md § How this lands for ranged actions` still proposes it. Kept verbatim; requirements must reconcile it against the ruling rather than inherit it. (Its non-combat reading — *can a body / an object pass this boundary* — may survive as a boundary concern; that is not this slate's claim)
- `### Magic interplay questions` → the intro paragraph says *"when this slate's ranged model is designed, that seam adopts it"* — it did (`ranged.md § The two adopted seams`), but the band model, not this slate's engaged-status model; and the attenuation bullet's *"cross-room 'distance' = the conduit/transmissivity hops"* is the contradicted premise above (distance is a **band**, and there is no cross-room delivery). The bullets also name the superseded `Covering` status. Kept whole under the paragraph rule; the four questions themselves are open
- the *combat-slate* blockquote (31–39) — says `combat-slate.md` *"supersedes its 'combat system itself… not yet designed' deferral"*; that slate is itself a builds/ slate the combat build consumed. Kept as spine; the cluster pass decides
- Overlaps for the cluster pass: `Left`'s cover and Skirmish items were **moved**, not lost — `ranged-slate.md § Cover` and `§ Formations` (`skirmish` preset), both cross-named in the re-stamped Status line; `combat-formations.md § Deferred` also lists Skirmish/Kite. The per-character gambit layer ↔ `combat.md § Deferred` (*the contextual gambit affordances*)

### Handoff (belongs in a doc outside my list)
- none. (`combat-formations.md` and `combat.md` already state every shipped decision this slate carried; nothing needed inserting. The `physical`-conduit contradiction is a design reconciliation for requirements, not a doc paragraph.)

### Status block
- Status line: added `combat-formations.md` as a second pointer, and *"cover-as-status and the Skirmish preset are now ranged-slate.md's (§ Cover, § Formations)"*
- Left: *cover-as-status (ranged W2) · the `physical` conduit channel for cross-room shots · the Skirmish / Kite preset · the magic-interplay questions at `MagicLogic.deliverAt`* → *the `physical` conduit channel for cross-room shots (⚠ contradicted by ranged.md's cross-room ruling — see the compaction ledger) · the magic-interplay questions at `MagicLogic.deliverAt` (bolt vs cover · interpose · attenuation · counterspell vs cover) · a per-character gambit layer, only if players demand it* (cover and Skirmish moved to the ranged slate, which owns their live design; the gambit-layer deferral was in the body and unrepresented)
- Size: a wave → a tail

---

## Batch totals

| | before | after | cut |
|---|---|---|---|
| `ranged-slate.md` | 1025 | 910 | 115 |
| `combat-tactics-slate.md` | 338 | 192 | 146 |
| **total** | **1363** | **1102** | **261** |

- Graduations: 0 (nothing shipped was undocumented)
- Subsystem-doc edits: 1 sentence in `ranged.md § The roadmap` (the morale strikethrough)
- Handoffs: 0
- Slates deleted (ABSORBED): 0
- Uncertain entries: 8 on ranged, 4 on combat-tactics
- Hardest calls: (1) the aim-ladder bullet — kept whole for one undocumented clause (*aim decays on movement*) even though the ladder itself shipped; (2) Thesis 1 — cut as **superseded** rather than shipped, because what shipped is not what it designed (a binary lock vs a four-rung ladder; opt-in bands vs universal derived bands), and its one survivor contradicts a ruling; (3) the ranged slate's *Guns* and *Gun policy* sections — 150 lines with a few realised sentences inside unbuilt paragraphs, kept whole under the paragraph rule and labelled doctrine rather than trimmed; (4) the morale paragraph — superseded in shape (engine read, not brain doctrine), which also exposed the stale item in `ranged.md`'s own roadmap.
