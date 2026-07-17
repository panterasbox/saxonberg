# Stealth & deployables — requirements

The **player-facing half of concealment**: hiding *yourself* and planting *your
own* traps — completing the vertical the [concealment & detection build](../subsystems/concealment.md)
opened. That build made concealment **authored-static** (a room hides a trap, a
creature is authored lurking) and shipped the per-viewer detection engine. This
build makes concealment **actor-driven and dynamic** — you decide, on the spot,
to disappear or to set a snare — and it makes the consequences *legible*: the
keystone is a **unified harm-consent / culpability substrate** that combat,
ambush, and traps all feed, so "you hurt someone who didn't agree to be hurt"
is *one* crime, however the hurt was delivered.

Seeded by [concealment-detection-slate.md](../slates/deferred-rpg/concealment-detection-slate.md)
(**Thesis 2** — the hiding/actor face — and the deferred player-trapper +
knowledge-economy surface). Leans on shipped substrate: the detection engine
(`PerceptionApi.perceives` per-viewer), the concealment gate (`ConcealableMixin`),
combat's consent + blame layer (**generalized, not duplicated**), the crafting
substrate (kept **thin**), the parcel/property substrate (the anti-grief gate),
and the NPC behavior/brain system (the detection *response*).

## Goals

- **Dynamic self-concealment (`hide`).** An actor can enter a `hidden` **state**
  on demand whose *level* is a deterministic `f(hide competence, available cover
  in the room, light, stillness/posture)`, resolved against **each observer's**
  perception by the shipped engine (so some perceive you, some don't). It is
  **broken by** motion (the observer-side of `sneak`/`walk`/`run`), by attacking,
  and by an observer who actively `search`es and beats your level. No stealth
  dice — deterministic given inputs (the poker-not-slots line).
- **Motion degrades concealment.** The `sneak`/`walk`/`run` modes (shipped
  detection-side) gain their **observer-side** effect: sneaking barely degrades
  your concealment, walking degrades it, running breaks it — the moving-target
  detection window.
- **NPC awareness → response.** An NPC is already a valid `perceives()` viewer
  (detection is free); the new part is **behavior** — a `wary`/`guard` brain
  that watches/searches its space and **reacts on detect** (alert / approach /
  attack) vs. stays oblivious on fail. A behavior-system consumer, not new
  global machinery.
- **Ambush → combat.** Attacking from **undetected** concealment opens the
  combat session with the target unaware: surprise **denies the poise contest**
  (the target starts pressed/broken) — the free-advantage opener — via combat's
  already-reserved `session.opened` awareness seam. The attribution marks the
  ambusher as the aggressor.
- **Player-trapper.** `arm`/`set` a **carried** trap into a room or onto an exit;
  the placed trap's concealment is derived from **your** `hide` competence (the
  shared spine with self-hiding). **Acquisition is thin** — a `TrapKit` carried
  item you obtain and deploy; **no recipe/component economy** in v1.
- **One unified harm-consent / culpability substrate.** Combat, ambush, and
  traps all feed a single **"was harm inflicted on X by Y, and did X consent?"**
  model → one `crime` derivation + one attribution ledger, keyed on the victim.
  **Combat migrates onto it** (its combat-specific blame becomes one consumer,
  byte-preserving today's crime behavior); ambush and traps are the other two.
- **A `stealth` `Discipline`** (the hiding face, the opposed sibling of
  `awareness` — one contest, two competences) grading self-hiding and trap-set
  concealment.
- **A reachable demonstrator** proving the loop: an NPC you can sneak past /
  ambush, and a place you can plant a trap for another agent.

## Non-goals

- **The full trap-crafting economy.** Recipes, components, materials-into-a-trap,
  a maker's mark on traps — **deferred.** v1 acquisition is the thin `TrapKit`
  (obtained ready-made; `arm` deploys it). The crafting substrate is reused only
  if a one-line "assemble a kit" seam is trivial; otherwise the kit is authored/
  purchasable content.
- **The knowledge economy.** Sharing / selling / transferring found secrets or
  known trap locations; maps as currency. (The *personal* found-memory shipped.)
- **Ranged / remote traps + linkages.** A dart *across* a room, a plate-here →
  blade-*there*. Still the future ranged-delivery build (the reserved seam in
  `HazardDelivery`).
- **The deep grapple/clinch game, formation/geometry, NPC-vs-NPC stealth crews.**
- **Non-combat threat-reads** (`assess <person>` out of combat).
- **Disguise-as-concealment unification.** The identity-disguise stack
  (`Disguisable`/`RecognitionApi`) stays its own axis; hiding *presence* and
  masking *identity* meet only at the naming step (as belief.md documents).
- **Resettable / rearming placed traps, and trap retrieval/re-pocketing** beyond
  a simple pick-up-your-own. One-shot v1 (the hazard build's stance).

## Surface decisions

### The unified culpability substrate is the keystone — combat migrates onto it
There is **one** answer to "did the victim consent to being harmed by this
actor?", and **one** attribution ledger from which `crime` derives. Combat today
owns `combat_attribution_events` + `CombatAttributionEvent.deriveBlame` (`crime`
= a sentient killed under non-consented lethal terms) — this build **extracts
that into a harm-agnostic culpability substrate** (a `lib/` substrate + a gated
`*Api`/`*Logic`) and **migrates combat onto it byte-identically** (combat's crime
outcomes are unchanged; its blame becomes one *consumer* of the shared ledger).
Ambush and sprung traps are the other two producers. The consent input:
combat carries per-edge `CombatTerms`; ambush/traps default to **non-consented**
(you didn't agree to be snared), so harming a **non-consenting sentient** derives
`crime`. This is the load-bearing, riskiest piece — a parallel trap-crime model
would be the rejected mistake. `ConditionApi.inflict` (the common harm
chokepoint, already carrying `inflictedBy`) is the natural producer site.

### `hide` is a state resolved per-observer, broken by the world — not a roll
Self-concealment is a **dynamic state** (the sibling of a posture), not an
authored field and not a dice roll. Entering it computes a **level** from
`hide` competence + the room's available cover + light + stillness/posture; the
shipped `PerceptionApi.perceives(observer, you)` resolves it per-observer against
each observer's perception. It is **broken** by movement (mode-scaled — the
observer-side of the care↔speed axis), by attacking, and by an observer whose
active `search` beats the level. Deterministic; server-authoritative honest fog
(you are absent from the world of observers who don't perceive you).

### Motion-degrades is the observer-side of the shipped care↔speed axis
The `sneak`/`walk`/`run` modes already carry a `noiseLevel` and feed traverse-
time *detection* (self-side). This build lights their **observer-side**: your
movement mode scales how much motion degrades your concealment to onlookers
(`sneak` ≈ hold, `walk` = degrade, `run` = break). The `movement.attention.*`
dials get observer-side siblings.

### NPC awareness is a brain, not new events
Detection of a hidden actor by an NPC is free (`perceives()` with the NPC as
viewer). The new surface is a **`wary`/`guard` brain** (path-resolved, per the
behavior system) that watches/`search`es and, on a state-change to *detected*,
reacts (the existing brain action seam — alert/approach/attack); on fail it stays
oblivious. No new global event; witness/cadence triggers as today.

### Ambush rides combat's reserved awareness seam
`session.opened` already carries awareness. Opening combat against an unaware
(un-perceiving-you) target = an **ambush**: the target's poise starts
pressed/broken (surprise denies the opening poise contest), the aggressor gets
the free first exchange, and the attribution records the ambusher as initiator
(feeding the unified crime layer). No new combat session type.

### Trap acquisition is thin; placement is property-gated
A `TrapKit` is a carried item (obtained ready-made — authored/purchasable; **no
recipe/component loop**). `arm <kit> [here | on <exit>]` deploys a concealed
`Trap` whose concealment level = your `hide` competence (the shared spine).
**Anti-grief = the parcel/property substrate**: you may place freely on property
you hold; placing in a **public/shared** space is *allowed but crime-marked*
(via the unified layer) if it later harms a non-consenting sentient. Pick up your
own un-sprung placed trap; no rearm.

### A `stealth` Discipline, the opposed face of `awareness`
Hiding and detecting are one contest's two competences. A new `stealth`
`Discipline` (seeded data, sibling of `awareness`) grades the `hide` level and
the trap-set concealment; `awareness` (shipped) grades detecting/searching them.
No new advancement machinery.

## Constraints

- **Reuse, don't duplicate.** Detection = the shipped `PerceptionApi.perceives`
  per-viewer engine; concealment = `ConcealableMixin` (dynamic level now, same
  gate); **consent/blame = combat's, generalized** (the one hard refactor — combat
  migrates, outcomes byte-identical); crafting = **thin** (kit, not recipes);
  anti-grief = the **parcel** substrate; NPC response = the **behavior/brain**
  system; ambush = combat's reserved `session.opened` seam. No parallel systems.
- **Deterministic — no stealth dice.** Hide/detect resolution is a deterministic
  function of competence × cover × light × motion × the observer's perception.
- **Server-authoritative honest fog.** A hidden actor is absent from the world of
  observers who don't perceive them — never "present but flagged hidden," no
  client leak (`nothing-is-pure-client`).
- **Crime is derived, never a stored stat.** The unified culpability layer is a
  dumb append-only ledger + derive-on-read `crime` (the `CombatAttributionEvent`
  precedent, generalized), keyed on the victim's durable `templatePath`.
- **Module taxonomy.** The culpability substrate in its own `lib/<name>/` +
  gated `*Api`/`*Logic`; `hide` as an actor mixin/state, not a controller
  behemoth; the `stealth` Discipline + the `wary` brain as data/strategy modules;
  the `TrapKit` a `Thing`. No free-floating helpers; all tunables `AppSettings`
  dials.
- **Anti-grief is a completeness requirement, not a follow-up** — property-gated
  placement + crime-marking ship *with* the trapper loop (per
  `anti-grief-resource-guards`).

## Acceptance criteria

- **`hide` works per-observer and the world breaks it.** An actor entering
  `hide` is perceived by a high-perception observer and not by a low one (same
  scene); moving (walk/run) degrades/breaks it; attacking breaks it; an
  observer's `search` that beats the level reveals them. Deterministic tests.
- **Sneak past / get caught.** A `sneaking` or hidden actor traverses past a
  `wary` NPC that fails to perceive them (no reaction); a detected one triggers
  the brain's response. Tested through the real perception + behavior paths.
- **Ambush denies the poise contest.** Opening combat from undetected
  concealment starts the target pressed/broken (surprise) via `session.opened`;
  a non-ambush open is unchanged. Tested.
- **The crime layer is unified.** An **ambush kill** and a **sprung player-trap**
  on a non-consenting sentient BOTH derive `crime` through the **same**
  culpability substrate that combat uses — and combat's own crime outcomes are
  **byte-identical** to pre-migration (a regression test pins this). One ledger,
  one derivation.
- **Plant a trap.** `arm <kit>` deploys a concealed `Trap` (concealment = the
  placer's `hide` competence); placement is refused/allowed by the property gate;
  a public placement that harms a non-consenting sentient is crime-marked. The
  placer can pick up their own un-sprung trap.
- **A reachable demonstrator** exercises the whole loop: sneak past (or ambush)
  an NPC, and plant a trap another agent springs — placed reachably without
  breaking standup.
- **Docs**: a `docs/subsystems/stealth.md` (or the hiding face folded into
  `concealment.md`) + a `docs/subsystems/culpability.md` (the unified crime
  substrate) or a section; doc-map + architecture entries; the slate's **Thesis
  2** ticked, the knowledge economy still named deferred.
- **Tests** cover the decidable pieces: hide resolution (deterministic,
  per-observer, break conditions), the sneak-vs-`wary`-NPC path, ambush poise-
  denial, the **unified `crime` derivation** (ambush + trap + combat through one
  substrate) + the combat byte-identical regression, trap placement + property
  gate + crime-marking. Integration validated via the demonstrator.

## Cross-references

- Seeding: [concealment-detection-slate.md](../slates/deferred-rpg/concealment-detection-slate.md)
  (Thesis 2 — the actor/hiding face; the player-trapper + knowledge-economy
  deferrals).
- Substrate consumed (shipped): [concealment.md](../subsystems/concealment.md)
  (the detection engine, `ConcealableMixin`, `search`, the `sneak`/`run` modes),
  [hazard.md](../subsystems/hazard.md) (`HazardMixin`/`Trap`/`HazardDelivery` —
  the placed trap), [combat.md](../subsystems/combat.md) (the consent/`CombatTerms`
  + `combat_attribution_events`/`deriveBlame` blame layer being **generalized**;
  the reserved `session.opened` awareness seam; poise), [behavior.md](../subsystems/behavior.md)
  (the `wary`/`guard` brain), [advancement.md](../subsystems/advancement.md) (the
  `stealth` Discipline), [parcel.md](../subsystems/parcel.md) (the property gate),
  [crafting.md](../subsystems/crafting.md) (thin acquisition seam), [belief.md](../subsystems/belief.md)
  (identity-vs-presence — disguise stays its own axis).
- Related memory: [[species-as-race-allegory]] (the deferred threat-read/bias
  thread), [[anti-grief-resource-guards]] (placement gating), [[never-half-grown-everything-a-business]].
