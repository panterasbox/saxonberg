# Concealment & detection — stealth, searching & secrets (working slate)

> **Status: PARTIAL** — Thesis 1 fully shipped; Theses 2–3 substantially
> shipped with real gaps remaining (below) → MR!142 + MR!145,
> [concealment.md](../../subsystems/concealment.md) ·
> [stealth.md](../../subsystems/stealth.md)
> **Left:** the knowledge economy (sharing / selling / transferring
> found secrets, maps as currency) · `frisk` and searching a downed
> body · player-placed concealment beyond pick-up-your-own ·
> ranged / remote / linked traps · resettable / rearming traps ·
> graded awareness states (safe→threat-present→threat-located) as the
> ambush initiation seam · ambush's interaction with morale + the
> two-stage-death (coup) compression · multi-sense (channel-specific)
> hiding · a detection net (allies/lookout/a keen-sensed pet) ·
> deduction-from-clues search · the out-of-combat threat read (name
> collision: `assess` already means the combat/medical condition
> readout) · reconciling `perceives`/`canSee` as one gate
> **Size:** a wave

The one-sentence thesis: **every perceivable thing carries a *concealment*,
and what you perceive is concealment vs. your perception resolved by
attention — so a stealthed assassin, a hidden compartment, a concealed trap,
a disguise, and a poisoned drink are all one mechanic, and searching, hiding,
and detecting are verb-surfaces over it.**

---

## Thesis 1 — One concealment gate on every perceivable — ✅ shipped

See [concealment.md](../../subsystems/concealment.md) § "The gate —
`ConcealableMixin` + `ConcealmentLevel`" (composed on `Thing`/`Creature`/
`Exit`) and § "Honest fog — the enumeration seams".

---

## Thesis 2 — Stealth (the actor face) — ✅ SHIPPED (MR!145)

> Shipped as the stealth & deployables build. `HidingMixin` + the derived
> `PerceptionApi.hideLevelFor`, observer-side `motionExposure`, the ambush
> poise-denial, the `wary` brain, the `TrapKit`/`arm` player-trapper, and the
> unified accountability ledger. See [stealth.md](../../subsystems/stealth.md).

Stealth is **managing others' belief about you** — the fog engine pointed at
your own presence/location/intent. Not a stat-vs-stat roll.

- **Awareness is the pivot / the initiation seam:** a fight has a
  pre-awareness window → mutual awareness ("on"). Awareness is *graded*
  (`safe → threat present → threat located`), each step raising guard. The
  fight starts when the target crosses into awareness.
- **Three depths (the belief realms):** **unseen** (presence hidden) →
  **unrecognized** (identity hidden — disguise) → **unsuspected** (intent
  hidden — the crowd-assassin, seen and known but not marked a threat).
- **Multi-sense:** hide from the *channel they use* (darkness defeats vision,
  not a keen nose or tremorsense; noise discipline for listeners — sneak is a
  slow/quiet locomotion mode trading tempo for concealment).
- **Surprise × morale:** an ambush is a *morale shock* (safe→hopeless
  instantly) — it cracks morale, so a well-sprung ambush can win by **rout**
  before real damage. Denies guard *and* breaks will.
- **Assassination = two-stage death compressed by surprise:** surprise
  collapses *stage 1* (drop an unguarded target in one strike), but the kill
  is still the separate, interruptible **coup** (stage 2). Down ≈ dead when
  isolated/unwitnessed; bodyguards/crowd interrupt the coup → friction ∝
  witnesses, as designed. Blame = murder, but stealth (no witnesses) escapes
  attribution — the smoke-removes-witnesses convergence; **stealth is both
  the weapon and the alibi.**
- **Counter-play:** detection (a perception contest), awareness posture (the
  alert bodyguard), the detection net (allies / lookout / **keen-sensed
  pet**), environment (light/open ground — the arrangement-vs-initiative
  balance). A lone target is assassin-bait; a guarded one is protected.
- **Blame/initiation:** you don't consent to an ambush → opening a session
  with the target unaware marks the ambusher as the aggressor (the initiation
  record). Ambush is legibly aggression — potent but marked.

---

## Thesis 3 — Searching (the environment face)

Searching is **buying down your fog about the place** — the same fog engine,
aimed at rooms/objects. A hidden thing is one not in your belief until
perception crosses concealment.

- **Multi-modal + tools + deduction:** search by sense (tap for the hollow,
  feel the draft); tools (light, glass, probe); and — the Andy-Weir angle —
  **deduce** secrets from clues (the draft *implies* a passage; fresh
  scratches *imply* a door). Searching as reasoning, not rolling; rewards the
  **curiosity trait**.
- **Found → belief → a knowledge economy:** a found secret enters your belief
  permanently and per-viewer; you don't re-search. Another player doesn't
  know until they find it — *or you tell them* → knowledge is transferable
  and *valuable* (maps, cache locations = social currency). (Requires
  generalizing belief from *identity* memory to also hold *world-facts*.)
- **Players hide things too:** stash / cache / conceal-a-trap at a
  concealment = your *hide* competence; finders must beat it. Searching is
  dynamic (find other players' hidden things), and extends to **frisking** a
  person / a downed body (concealed weapon or loot vs. your search).
- **Content discipline (non-negotiable):** secrets are **rewards and
  shortcuts, not required paths** (the immsim multi-pathway — a secret door
  is *a* way, never *the* way); no critical content behind a hard perception
  wall (or heavily hinted + deducible). Discovery is a *beat*, not a tax.

---

## The verb-surfaces over the one gate

`search` / `examine` (active detection) · `hide` / `sneak` (self-concealment)
· `disguise` (identity-concealment) · set-trap (device-concealment, the
deployables slate) · `frisk` (contents-detection) · passive perception (the
always-on baseline). One concealment gate; many verbs.

## Threat reads (sizing someone up before combat)

`assess <person>` **out of combat** = the pre-combat threat read — the flip
side of hiding-your-skill. Derived per-viewer, competence-gated, **banded +
fallible** — never a "threat: 7" stat, only an *impression*. Layered by
readability: the **obvious** (armed/armored/build/state/posture) → the
**reputational** (belief/recognition + renown/notoriety — a known name is a
threat signal) → the **martial read** (skill from stance/economy/scars —
deeply competence-gated, the hardest tier). **The fallibility is the point
(poker):** the unassuming master (concealed skill = an ambush edge) and the
bluffing braggart (projected menace) — sizing up = **your assessment vs. their
self-presentation**, a skill-vs-skill contest, not a lookup; a better assessor
reads *through* the bluff. Self-presentation is a real choice (hide your skill
for ambush vs. project menace to deter). It **feeds the path decision**
(fight/flee/talk/ambush/arrange — upstream of the multi-pathway) and is itself
observable (the standoff). **On-theme:** the threat read is where
misjudging-by-appearance/species bites — belief is the engine, the *bias is
yours* (the species-as-allegory thread). Deferred; the same `assess` verb,
threat-scoped, no new substrate.

## Deferred / boundaries

- **The knowledge economy** — sharing/selling secrets; its own consumer.
- **Combat's slice** — trap-spotting, stealth-detection, frisking, searching
  the downed — superseded: combat is no longer a *declared* 1v1 (multi-party
  `CombatGraph` ships, see [combat.md](../../subsystems/combat.md)), and
  surprise/ambush already shipped as the poise-denial opening, not a
  deferred alternate initiation (see
  [stealth.md](../../subsystems/stealth.md) § "Ambush denies the poise
  contest"). The remaining unbuilt slice (frisking, searching the downed)
  is carried in `Left`, above.

## Cross-references

- [combat-experience-slate.md](../builds/combat-experience-slate.md) — the perception
  fog engine, the poker-not-slots stance, morale (surprise = a morale shock).
- [deployables](../builds/combat-experience-slate.md) — concealed traps (the same
  gate); [wayfaring] — sneak as a locomotion mode (both spun out there).
- [../../subsystems/belief.md](../../subsystems/belief.md),
  [../../subsystems/perception.md](../../subsystems/perception.md),
  [../../subsystems/senses.md](../../subsystems/senses.md),
  [../../subsystems/light.md](../../subsystems/light.md),
  [../../subsystems/boundary.md](../../subsystems/boundary.md) — the shipped
  substrate this leans on (belief, the fog, sense channels, the light dial,
  the exits-only concealment it generalizes).
- [../../subsystems/activity.md](../../subsystems/activity.md) — searching as
  a costed engaged act.

---

## Open: `perceives` vs `canSee`

The local fix and its rationale are recorded in
[concealment.md § Known tension: `perceives` vs `canSee`](../../subsystems/concealment.md).
Full reconciliation of the two gates is still open — see `Left`, above.
