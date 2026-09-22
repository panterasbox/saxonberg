# Combat batch — compaction ledger

Batch key: **combat**. Slates: `builds/combat-slate.md`,
`builds/combat-experience-slate.md`, `builds/consequence-slate.md`.
Doc I may insert into: `docs/subsystems/combat.md` only. Graduations
belonging elsewhere (harm.md, contract.md, mortality.md,
combat-formations.md, accountability.md) are recorded as pointers
(already documented there) or Handoff entries (undocumented) below —
never written into those docs by me.

## Findings (read before trusting any slate's own ✅/Left claims)

- `docs/subsystems/combat.md` (1134 lines) is exceptionally
  comprehensive and already documents almost everything combat-slate.md
  and combat-experience-slate.md describe as design intent: the session,
  poise, tempo, terms/consent, the blame ledger (now
  `accountability.md`'s), two-stage death/coup, morale, fleeing,
  weapon-playstyle, the feint/fog/Sharpness experience pass, and the gym.
  Most of both slates' bodies are SHIPPED · DOCUMENTED.
- combat-slate.md's proposed **hook-point catalog** (dot-namespaced
  events like `combat.session.opened`, six category tables, N/R/X/B/A/L
  consumer classes) was **not** implemented as designed — grepped, zero
  hits. What shipped instead is the three-surface `@hook` grammar
  (instrument/participant/venue) documented in `combat-hooks.md`. This
  is SUPERSEDED — by the code — not a cut-with-pointer of the same
  design.
- combat-slate.md's Thesis 7 (resolution & exits) proposed a **per-party
  goals** model (`escape`/`capture-alive`/`protect-VIP`/…) layered under
  the shared `terms`. Grepped for all named goal literals: zero hits.
  What shipped is a flat `CombatResolution` enum (`first-blood | yield |
  incapacitation | death | draw | disengage`, `CombatSession.ts:66`) —
  no per-party goal object. The **two-stage death** and **coup
  attribution** (tactic-governed right/credit/decision, blame
  institution-derived) parts of the same thesis DID ship, and are
  documented — two-stage death in `combat.md`, coup attribution/
  governance in `combat-formations.md` § "Coup governance: the right,
  the call, and the facts" (outside my doc list — pointer, not
  graduated).
- combat-slate.md's Thesis 7 **chase** (persistent pursuit-session,
  decaying contact tether, multi-room) did **not** ship. What shipped
  (Cycle 2) is a single-step opposed-lite disengage at the movement
  controller's pre-traverse gate — no persistent pursuit session, no
  tether. The chase design is kept as UNBUILT but flagged Uncertain: it
  now assumes a break leaves a *hunting* relationship that survives room
  transitions, which contradicts the shipped model where a successful
  disengage simply removes the actor from the session.
- combat-slate.md's status block's `Left` item **"morale + de-escalation
  suite"** is stale on the morale half: `lib/combat/Morale.ts` shipped
  (extensively documented in combat.md). De-escalation as a mechanized
  verb was tried (`fight parley`) and **cut in its own MR review**
  (documented in combat.md § "Why there is no verb for talking a fight
  down"); the open design surface for third-party intervention moved to
  `intervention-slate.md` (not mine to touch).
- combat-experience-slate.md's own status block is materially accurate
  (Theses 3/4/9/10/part-2/14 shipped, self-audited) — verified against
  code and combat.md/combat-formations.md, confirmed correct. Thesis 12
  (de-escalation) is explicitly self-annotated "closed" in the slate's
  own body, superseded by `intervention-slate.md` — treated as
  SUPERSEDED here too, cut in full.
- Thesis 13 (morale & surrender) individual-morale half shipped
  (combat.md § Morale, § A beast does not take a yield) — cut with
  pointer; the **group-morale (rout/rally/berserk/waver)** half did not
  ship (verified: no rally/rout/waver/berserk tokens anywhere in
  `lib/combat/`) — kept.
- consequence-slate.md's own status block ("the eighteen waves SHIPPED,
  MR!254") is **accurate and confirmed**: `git log` shows the full
  `feature/consequence` wave sequence (W0–W17) merged
  (`a058a7813 Merge branch 'design/consequence' into 'master'`), and
  spot-checks confirm the wound→poise ceiling (combat.md), the 8-arm
  unification (now 5, `lint:condition-arms` ceiling=5, confirmed live),
  `resolution.by` (harm.md), diminishment/`recovering` (harm.md), the
  guard contract (contract.md), and the repair-shop/necropolis/
  trade-medicine wake (W13–W17, `fdaf916f6`) all landed. This slate is
  now almost entirely SHIPPED · DOCUMENTED, spread across combat.md
  (mine), harm.md and contract.md (not mine — pointers only).
- ⭐ **One genuine SHIPPED · UNDOCUMENTED gap found, and it belongs to
  harm.md, not combat.md** — W7 (`7a1fce88c`) shipped
  `AfflictionRecord.inflictedBy` (the `Trauma.inflictedBy` twin,
  stamped from `ExecutionContextApi.getActingAuthor()`, never
  overwriting a producer-set stamp) on `packages/server/src/mud/
  platform/idea/Condition.ts`, so an affliction now records who caused
  it exactly as a wound does — but `harm.md` (which documents
  `Trauma.inflictedBy` at its "attribution without owning blame"
  passage) was never updated to say so. Recorded as a Handoff entry
  below, verbatim, since harm.md is outside my insert list.
- consequence-slate.md's Design/W7 text itself ("the `afflict` door —
  `ConditionApi.afflict`/`relieve`, gated like `inflict`") did **not**
  ship as designed — the build's own commit message explains why: a new
  Api static would have been the exact "thin Api wrapper around a
  single object method" antipattern CLAUDE.md forbids. What shipped is
  the attribution stamp at the existing `VitalsMixin.afflict()` door.
  SUPERSEDED — by the code — noted in the consequence-slate cut.

No section anywhere cited a heading that no longer exists in its own
file (nothing to report under that clause).

## `builds/combat-slate.md` — 1086 → 520 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## Thesis 1` body (session/terms/consent/blame/three-case severity),
  minus the purge paragraph (2 lines) — code: `lib/combat/{CombatSession,
  CombatTerms}.ts`, `platform/idea/api/CombatLogic.ts`; doc: `combat.md`
  § The session, § Terms & consent, § `isSentient`.
- `## Thesis 3` body (3 of 4 conferral channels + instruments-expose-
  capabilities + cross-gating + injury-edits-menu), minus the augment
  channel paragraph (4 lines) — code: `Species.naturalAttacks[]`,
  `Discipline.conferrals`, `commandContributions`; doc: `combat.md`
  § Gambits.
- `## Thesis 5` body (the bar-fight-shove walkthrough + engine/creator
  boundary, 47 lines) — code: `CombatNarration.ts`, `ReactionApi`; doc:
  `combat.md` § Narration + its own sequenced-trace example.
- `## Thesis 6` body in full (poise/tempo/tick-loop/concurrency/
  legibility/Master-Apprentice/stop-condition, ~196 lines) — code:
  `lib/combat/{Poise,Tempo,CombatSession}.ts`; doc: `combat.md` §
  Poise, § Tempo, § The session (concurrency, graduated this pass);
  Master-Apprentice: `combat-formations.md` (pointer only).
- `## Thesis 7`'s two-stage-death + coup-attribution paragraphs (24
  lines) — code: `lib/combat/Coup.ts`, `combat-formations.md`'s coup
  hooks; doc: `combat.md` § Two-stage death — the coup;
  `combat-formations.md` § Coup governance (pointer only).
- `## The hook-point catalog` in full (150 lines) — grepped, zero
  matches for any literal hook name; doc: `combat-hooks.md` § The three
  surfaces (pointer only; the shipped shape supersedes the design, see
  Superseded below).
- `## Settled decisions` — 12 of 16 items — code/doc as cited per-item
  above; trimmed to the 4 still-open items.
- `## Open questions` — items 2 (tick tempo), 3 (transient-state
  storage), 4 (hook catalog), 5 (NPC tactic symmetry), 6 (de-escalation)
  — doc: `combat.md` § The session, § The experience pass, § "The enemy
  — a combat brain, invoked directly", § "Why there is no verb for
  talking a fight down".
- `## Once shaped into formal requirements` — superseded by the shipped
  build; doc: `combat.md`'s own `## History`.

### Superseded — cut, one-line note kept
- `### The three exit families` (Thesis 7) — by the shipped flat
  `CombatResolution` enum (`first-blood | yield | incapacitation |
  death | draw | disengage`), not the proposed
  Resolution/Withdrawal/Dissolution taxonomy.
- `### Fleeing — a contestable maneuver, not a button` (Thesis 7) — by
  the shipped single-step opposed-lite `disengage()` at the movement
  controller's pre-traverse gate, not the proposed 2+-tick sequence.
- `### Mechanically` (Thesis 7) — by the shipped `@hook`
  instrument/participant/venue grammar, not the dot-namespaced event
  catalog it referenced.

### Kept (UNBUILT)
- `## Thesis 2` in full — combat's integration into the employment
  economy (contract kinds, party-shape/staffing) never shipped; grepped
  for every named contract kind and `hire-a-crew`/`hire-and-compose`,
  zero hits outside this slate and a TPA-pack comment.
- `## Thesis 3`'s augment-conferred-gambit residual (kept as a short
  paragraph).
- `## Thesis 4` in full — the affordance taxonomy (activation/effect-
  domain/persistence axes); doctrine partially realized (reactive,
  windowed openings) but "sustained" stances and most "field" effects
  are still unbuilt, and the taxonomy itself is not documented anywhere
  as a framework.
- `## Thesis 7`'s per-party-goals paragraph (trimmed to state what
  shipped instead) and `### The chase` subsection in full (see
  Uncertain below).
- `### Guards — an application, not an engine feature` — no `guards`
  brain exists anywhere in `lib/behavior/` or any content pack.
- `## The client experience (UX tiers)` in full — no `CombatCard`
  exists in `packages/client`.
- Thesis 1's purge paragraph, Thesis 2 in full, the employment/goals/
  augment/purge/tuning residuals now folded into the re-stamped status
  block's `Left`.

### Uncertain — kept
- `### The chase — a persistent pursuit-session on a decaying tether` —
  looked for `chase`/`pursuit`/a persistent tether object in
  `lib/combat/` and `lib/activity/`; found nothing (only unrelated
  substring hits on "routing"). Kept because genuinely unbuilt, but it
  now **contradicts** the shipped fleeing model: the chase design
  assumes a broken engagement leaves a persistent "A is hunting B"
  session that survives a room change, while the shipped `disengage()`
  simply removes the actor from the session with no residual hunting
  state. A future design pass needs to reconcile or explicitly re-found
  the chase against the shipped shape, not build it as designed here.

### Handoff (belongs in a doc outside my list)
- (none from this slate — the one graduation-worthy gap found in this
  batch, the affliction-attribution stamp, belongs to
  `consequence-slate.md`'s section below.)

### Status block
- Left: `pursuit / the chase · rout & rally retreat · the morale +
  de-escalation suite · the guards intervention brain · the client
  CombatCard · NPC-vs-NPC crews · the composure/luck axis` → `pursuit /
  the chase (flagged contradictory) · rout & rally retreat · the guards
  intervention brain · the client CombatCard (+ terms-handshake render)
  · NPC-vs-NPC crews · the composure/luck axis · combat's employment-
  economy integration · per-party goals as a resolution model · the
  augment-conferred-gambit channel · group payout/blame split · the
  institutional purge · competence-curve tuning (gym red cells)`. Net
  growth: the morale/de-escalation item is gone (shipped/resolved-
  differently), five new residuals surfaced by verification replace it.
- Size: `a build` → `a build` (unchanged — the residual, principally
  Thesis 2's employment integration plus the chase/goals/client-card
  work, is still build-sized, not a tail).

## `builds/combat-experience-slate.md` — 1012 → 625 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Two duplicate/stale status blocks merged into one canonical block —
  the old "Partially realized" narrative block described a state one
  build behind current.
- `## Thesis 2` body (arc-beats, beat-intensity, planning-in-real-time),
  minus nothing — code: `BeatIntensity`, `Coup.ts`; doc: `combat.md`
  § The dramatic arc, § Two-stage death, § "The enemy…".
- `## Thesis 3` + `## Thesis 4` bodies in full (68 lines) — code:
  `CombatFog.ts`, materials-response `energyFor`; doc: `combat.md`
  § The experience pass, § The exchange.
- `## Thesis 6` body in full — code: `WeaponProfile.ts`, `Sharpness.ts`;
  doc: `combat.md` § Weapon playstyle & the hand-slot economy.
- `## Thesis 7`'s "The reagent shelf" survey table (28 lines) — each row
  cites a subsystem already documented in its own doc (materials-
  response.md, belief.md, light.md, thermal.md, bulk.md, respiration.md,
  encumbrance.md, spatial.md, metabolism.md, posture.md, biome.md).
- `## Thesis 9` + `## Thesis 10` bodies (61 lines) — code:
  `scripts/combat-gym.ts`; doc: `combat.md` § The combat gym, § "The
  enemy — a combat brain, invoked directly".
- `### The body pipeline` (Thesis 11, 11 lines) — code:
  `platform/agent/Corpse.ts`, the reset-sweep veto; doc: `mortality.md`
  (the corpse as a forensic Creature), `residency.md` § "The corpse
  joins the veto roster" (both outside my doc list — pointer only).
- `## Thesis 12` body (88 lines) — the design proposal + its own
  ⚠⚠ callout; the callout's substance is now verbatim in `combat.md`
  § "Why there is no verb for talking a fight down" + § Onlookers, and
  the slate's own text already says T12 is closed. Trimmed to a short
  pointer + the one still-general insight kept (see Kept below).
- `## Thesis 13` body minus the group-morale paragraph (30 lines) —
  code: `lib/combat/Morale.ts`; doc: `combat.md` § Morale (extensive),
  § "A beast does not take a yield".
- `## Thesis 14` elaboration (57 lines, the reach/balance/guard/shield/
  hand-slot bullet detail) — code: `WeaponProfile.ts`,
  `WeaponSwitch.ts`; doc: `combat.md` § Weapon playstyle & the hand-slot
  economy, verified point-for-point identical to the design.
- One bullet of `## Thesis 16` ("the default is complete") — doc:
  `combat.md` § Narration.
- `## Thesis 17` body in full (57 lines), including its own "[Verified
  against origin/master]" corrections, which are now `combat.md`'s own
  text almost verbatim — doc: `combat.md` § Narration, § The exchange,
  § The experience pass.
- `## Corpus & build order` in full (35 lines) — superseded by
  `combat.md`'s own `## History`.
- `## Open threads`'s combat-gym and weapon-playstyle-depth items —
  shipped, see Theses 9/14 above; `ranged.md` shipped separately.

### Kept (UNBUILT / doctrine)
- `## Thesis 1` in full — the arrangement/exchange/aftermath time-domain
  framework; doctrine, not itself built or documented as a framework
  anywhere, and still frames the open aftermath work (Thesis 11).
- `## Thesis 5` in full — the composure/luck axis; `g(composure)` is
  still `≡ 1`, confirmed live in `lib/combat/Sharpness.ts`.
- `## Thesis 7`'s composition rules, GlassAlley template, and slated
  extensions (68 lines) — grepped for `GlassAlley`-style shove-into-
  hazard composition and every named combo, found only the unrelated
  demonstrator room; no combo mechanic exists.
- `## Thesis 8` in full — no caltrops/smoke-bomb/oil-flask/stimulant
  items exist anywhere in `packages/content/**`.
- `## Thesis 11` minus the body pipeline (aftermath's arc/stakes/
  recovery decomposition, "ending well", cycling-as-labor) — no
  coroner/scrapper job market tied to combat exists (Terminus's
  undertaker is flavor content with no mechanized contract).
- `## Thesis 12`'s condensed "still open" residual (the PC/NPC
  will-asymmetry as reusable negotiation doctrine) — no diplomacy
  Discipline exists (confirmed in the hand-off note below, unchanged).
- `## Thesis 13`'s group-morale paragraph — grepped `lib/combat/` and
  `combatant.ts` for rally/rout/waver/berserk, zero hits.
- `## Thesis 14`'s top pointer paragraph (trimmed, not cut) — records
  what shipped vs. what's still deferred (grapple/clinch, formation
  geometry).
- `## Thesis 15` in full — no BodyPlan-derived contest-shape dispatch
  (has-guard?/has-vitals?/has-morale?/bleeds?) exists; every fightable
  creature today is a simple biped/quadruped.
- `## Thesis 16` minus the one cut bullet — the hook grammar exists
  (combat-hooks.md) but is spoken by nothing that ships, per the
  hand-off note.
- `## Interrogated → spun out into sibling slates` — a bookkeeping
  record of where design moved (mortal-vessel-slate.md,
  concealment-detection-slate.md, deployables/wayfaring); still
  accurate, kept as spine.
- `## Cross-references` — kept as spine.
- `## ⭐ Hand-off from the consequence build` — re-verified against
  current code: `CombatResolution.disengage` still has zero callers
  (confirmed); the hook-grammar seam count updated from 21/17 to the
  current `lint:unconsumed-seams` measurement (18, ceiling 19); the
  diplomacy-Discipline gap confirmed still open.

### Status block
- Left: `T5 composure/luck · T7/T8 loadout-as-chemistry · T11 aftermath
  · T12 de-escalation · T13 morale & surrender · T15 the non-humanoid
  bestiary · T16 expressive authoring` → `T1 doctrine · T5 composure/
  luck · T7's composition rules + T8 loadout-as-chemistry · T11
  aftermath (minus the body pipeline) · T13's group-morale · T15 the
  non-humanoid bestiary · T16 expressive authoring`. T12 is gone
  (closed, superseded, pointer to intervention-slate.md); T13 narrowed
  to its group-morale residual only.
- Size: `a build` → `a build` (unchanged).

## `builds/consequence-slate.md` — 1161 → 142 lines · Status PARTIAL → PARTIAL (mostly ABSORBED)

This slate's own status block claimed "the eighteen waves SHIPPED
(MR!254)" and was verified accurate: `git log` shows the full
`feature/consequence` wave sequence merged
(`a058a7813 Merge branch 'design/consequence' into 'master'`), and
spot-checks confirmed the wound→poise ceiling, the 8-arm unification
(now measured live at ceiling=5, was 8), `resolution.by`, diminishment/
`recovering`, the guard contract, and the W13–W17 wake all landed.
Given that, this pass cut far more aggressively than the other two
slates in this batch — nearly every section was SHIPPED · DOCUMENTED,
spread across combat.md (mine), harm.md, mortality.md and contract.md
(not mine — pointers only).

### Cut (SHIPPED · DOCUMENTED)
- `## The gap`, `## ⭐⭐ Combat is a minigame`, `## ⭐⭐⭐ Player
  expectations`, `## ⚠ The armour failure mode`, `## ⭐ What is actually
  wired`, `## Finding 0` through `## Finding 6` (all findings, ~460
  lines) — every finding describes a defect the wave sequence fixed;
  code: `Vitals.reconcileConditions` (now 5 arms), `CombatLogic`'s
  wound-ceiling/outcome-model sites, `Condition.ts`'s `signature`/
  `resolution`/`contagion` fields (now consumed); doc: `combat.md` § The
  wound ceiling, § Morale; `harm.md` §§ on the effect channel,
  `resolution.by`, the progression laws (7→5 arms); `mortality.md` §
  Diminishment.
- `## The design` sections A, B, C, E, F, G in full (~190 lines) — code
  as above; doc: `combat.md` (A, E via the wound ceiling + Advancement
  sections), `harm.md` (B, the consequence table; C, the wake — repair
  shop/necropolis/guard content), `mortality.md` (G, "Losing a fight and
  dying are deliberately different punishments" — matches this design's
  own language almost verbatim).
- `### D. The non-martial hook — composure` — the hook (`Sharpness.g()`
  ≡ 1) shipped and is documented in `combat.md` § Sharpness; the axis
  itself stays open (tracked on combat-experience-slate.md T5).
- `## The three clocks` (26 lines) — graduated into `combat.md` § Poise
  ("The three clocks, and why no abstract health metagame is needed"),
  then cut here.
- `## The lens pass` (37 lines) — a design-time 5-lens audit of
  decisions that all shipped; the decisions are documented at their
  sites above, the audit itself is superseded by the shipped reality.
- `## Scope — what this build takes` in full (~155 lines: the wave
  table, `lint:unconsumed-seams` rationale, the clinic-split rationale,
  the `governs`-rename rationale, the slate-survey table) — a build
  plan whose every wave shipped; superseded by `combat.md`/`harm.md`/
  `mortality.md`/`contract.md`'s own sections and by `git log`
  (`feature/consequence`, MR!254).
- `## Open questions` Q1, Q3, Q4, Q6, Q7, Q8, Q9 (7 of 9) — resolved by
  what shipped, pointers recorded in the compacted body.

### Superseded — cut, one-line note kept
- The Design/W7 text ("the `afflict` door — `ConditionApi.afflict`/
  `relieve`, gated like `inflict`") — superseded by what actually
  shipped: the attribution stamp at the existing `VitalsMixin.afflict()`
  door, because a new Api static would have been the antipattern
  CLAUDE.md forbids (a thin wrapper around a single object method). See
  the Handoff entry below.

### Kept (UNBUILT)
- Open question Q2 (does contusion cost anything outside a fight) —
  grepped for a contusion/endurance coupling, found none; low-stakes,
  genuinely still open.
- Open question Q5 (where do the terms go — the legal-primitive lift
  next to governance/contracts) — no such slate exists; genuinely open
  and currently homeless.

### Doctrine (graduated, not kept in the slate)
- `## ⛔ The rejected fork — recorded so nobody re-proposes it` —
  graduated into `combat.md` § Poise (see Cut above); this is the one
  piece of this slate that was never "shipped" (it was rejected, not
  built) but was valuable enough to move into the subsystem doc rather
  than lose, since combat.md is exactly where "why poise never
  generalizes" belongs and nowhere else stated it.

### Handoff (belongs in a doc outside my list)
- → `harm.md`, near its existing "attribution without owning blame"
  passage (the `Trauma.inflictedBy` discussion): **W7
  (`7a1fce88c`) shipped `AfflictionRecord.inflictedBy` — the
  `Trauma.inflictedBy` twin for afflictions, stamped from
  `ExecutionContextApi.getActingAuthor()` at the existing
  `VitalsMixin.afflict()` door, and never overwriting a stamp a
  producer set deliberately. The gap it closes: a wound has always
  known who dealt it; an affliction never did, so poisoning — the one
  kind of harm that is deliberate, premeditated and quiet — was the one
  kind the world couldn't attribute. An unattributed affliction stays
  unattributed on purpose (most harm has no author; inventing one would
  sweep the weather into the crime ledger). `harm.md`'s own header
  comment and the "Consequence for anyone building an affliction
  driver" correction note (2026-07-31) predate this and should be
  checked for staleness against it.** This was never written into
  `harm.md` by the build that shipped it (confirmed: `git show
  7a1fce88c --stat` touches `Condition.ts`/`Vitals.ts`/tests only, not
  `docs/subsystems/harm.md`).

### Status block
- Left: `de-escalation reinterpreted (→ intervention-slate) · necropolis
  wants to be a sixth locality (→ towns-slate + end-of-life-slate)` →
  `the terms/consent lift (Q5, unowned) · contusion's endurance cost
  (Q2, minor) · necropolis → towns-slate + end-of-life-slate ·
  de-escalation's act-half → intervention-slate · blood/composure/
  CombatCard already tracked on their owning slate/doc`. Considered
  ABSORBED (deleting the file) but did not: Q5 (the terms/consent lift)
  has no owning slate anywhere in the tree, so this file is its only
  recorded home — deleting it would lose that open thread with nowhere
  else for it to land. Recommend the coordinator revisit at the next
  cluster pass once/if a governance-adjacent slate exists to receive Q5.
- Size: `a build (two, now — see Left)` → `a tail` — the remaining work
  is two small, mostly-homeless open questions, not a build.

---

## Coordinator (2026-09-20) — handoff applied

- `harm.md § ConditionApi.inflict` (the *Inflicter from context* bullet)
  — `AfflictionRecord.inflictedBy` paragraph inserted (verified:
  `platform/idea/Condition.ts:99`, `lib/vitals/Vitals.ts:2436-2439`).
