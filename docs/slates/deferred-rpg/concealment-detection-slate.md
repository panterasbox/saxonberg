# Concealment & detection — stealth, searching & secrets (working slate)

> **Status: PARTIALLY SHIPPED (MR!142).** **Thesis 1** (one concealment gate
> on every perceivable) and **Thesis 3** (searching) shipped as the
> concealment/detection + traps build — see
> [concealment.md](../../subsystems/concealment.md) +
> [hazard.md](../../subsystems/hazard.md). **Deferred and retained here:**
> **Thesis 2** — the *hiding* half of stealth (actor-face self-concealment,
> motion-degrades-concealment, NPC detection/response, surprise/ambush
> initiation) — and the **knowledge economy** (sharing/selling/transferring
> found secrets, `frisk`, player-placed concealment). A perception substrate
> — the *sibling of combat, parent of stealth* — surfaced by the stealth and
> searching interrogations off
> [combat-experience-slate.md](./combat-experience-slate.md). Combat consumes
> it (trap-spotting, stealth-detection, frisking, searching the downed) but
> it is broader — the exploration/perception layer. It leans entirely on
> shipped substrate (perception, belief, senses, light, the activity
> framework).

The one-sentence thesis: **every perceivable thing carries a *concealment*,
and what you perceive is concealment vs. your perception resolved by
attention — so a stealthed assassin, a hidden compartment, a concealed trap,
a disguise, and a poisoned drink are all one mechanic, and searching, hiding,
and detecting are verb-surfaces over it.**

---

## Thesis 1 — One concealment gate on every perceivable

Today everything on a room/item is obvious *except* some exits — concealment
lives only on exits. **Generalize it.** Give every perceivable a
**concealment** level, and a single mechanic subsumes five separate ideas:

- secret door = concealed **exit**
- hidden compartment / cache = concealed **container**
- stashed item / clue = concealed **object**
- hidden lever / inscription / keyhole = concealed **detail** (Detailed mixin)
- concealed trap = concealed **deployable** (the arrangement thread)
- stealthed creature = concealed **actor** (the stealth thread)
- poisoned drink that looks fine = concealed **property/state**

All of it is **concealment vs. perception → a belief update, resolved by
directing attention.** We don't build a "searching system" or a "stealth
system" — we build the **concealment gate**, and searching, stealth,
trap-spotting, disguise-piercing, and noticing-the-poison are all consumers.
Searching is the *environmental* face of the exact contest stealth is the
*actor* face of.

---

## Thesis 2 — Stealth (the actor face)

Stealth is **managing others' belief about you** — the fog engine pointed at
your own presence/location/intent. Not a stat-vs-stat roll.

- **The honest surprise attack:** poise is your guard, and a guard requires
  *awareness*. **An unaware target has no poise defense** — surprise *denies
  the poise contest*, it does not add a damage multiplier. The first strike
  lands into an **open** target (the earned crit / called shot, full
  materials-response severity), *deterministically*, because you struck an
  unguarded body. Surprise buys free, uncontested tempo until awareness.
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
- **PC/NPC asymmetry:** the server is authoritative on perception and the
  client never gets hidden data — so an **undetected attacker is simply not
  shown** to a PC (or shown as vague unease) until perception crosses the
  threshold (the honest fog, no metagaming). Being ambushed imposes the
  *situation* (flat-footed → broken poise) but never the *response* (state,
  not will).
- **Blame/initiation:** you don't consent to an ambush → opening a session
  with the target unaware marks the ambusher as the aggressor (the initiation
  record). Ambush is legibly aggression — potent but marked.

---

## Thesis 3 — Searching (the environment face)

Searching is **buying down your fog about the place** — the same fog engine,
aimed at rooms/objects. A hidden thing is one not in your belief until
perception crosses concealment.

- **Passive vs. active:** passive perception catches the obvious (and, for a
  perceptive character, *hints* at the hidden — "the bookshelf sits oddly,"
  "a draft"); active `search`/`examine` directs attention to raise *effective
  perception* against concealment, in a *scope* (room → desk → drawer;
  broad-shallow → narrow-deep).
- **Honest resolution (anti-slots + anti-tedium):** effective perception =
  capacity + attention + conditions/tools vs. concealment; **deterministic-
  given-effort** (no re-roll spam — you find it if you look well enough;
  persistence is monotonic to a ceiling, never a slot machine); **hints
  direct attention** (search where the world points, not every tile — kills
  pixel-hunting); searching is a **costed engaged act** (time + exposure —
  ambushable mid-rummage).
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

- **Belief generalization** — from identity memory to world-facts ("I know
  the loose stone by the hearth"); a natural extension of the store.
- **The knowledge economy** — sharing/selling secrets; its own consumer.
- **Combat's slice** — trap-spotting, stealth-detection, frisking, searching
  the downed. Cycle-1 combat is a *declared* 1v1 (both aware); surprise/
  ambush is a deferred *alternate initiation* (leave the seam:
  `session.opened` carries awareness; surprise = start with broken poise).

## Cross-references

- [combat-experience-slate.md](./combat-experience-slate.md) — the perception
  fog engine, the poker-not-slots stance, morale (surprise = a morale shock).
- [deployables](./combat-experience-slate.md) — concealed traps (the same
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
