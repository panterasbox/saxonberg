# Concealment & detection — requirements

The exploration/perception layer the RPG has been missing: **whether a thing
is *there* at all**, resolved per-viewer. Today the world hides only *identity*
(the belief/recognition/disguise stack — *who* someone is, resolved only after
you can already perceive them) and one dead-end primitive (`Exit.hidden`, a
one-way "never displayed" flag with **no reveal path** — `setHidden` has zero
callers, no `search` verb). This build makes **presence** concealable and
discoverable: a single `concealment` gate on every perceivable, resolved
against a viewer's effective perception by directed attention, landing a
per-viewer *discovery* in belief. **Traps are the flagship first consumer** —
they finally generalize the `GlassAlley` one-off (`onEntered → inflict`,
explicitly "NOT a `HazardMixin`") into a real hazard substrate, and they need
real counterplay (you can spot and disarm a trap), which is exactly what the
concealment/detection engine provides.

Seeded by [concealment-detection-slate.md](../slates/deferred-rpg/concealment-detection-slate.md)
(Thesis 1 — the one gate; Thesis 3 — searching), plus the deferred
HazardMixin/trap taxonomy in [harm.md](../subsystems/harm.md) and the
trap/detection seams in [locomotion.md](../subsystems/locomotion.md). Leans
entirely on shipped substrate — perception, belief, senses, light, the
activity framework, the materials-response `inflict` path — building the
concealment gate + traps + a **care↔speed movement axis** (`sneak`/`walk`/
`run`, the risk-dial at the trap seam), not a parallel "searching system" or
"stealth system."

## Goals

- **Every perceivable carries a `concealment`** (obvious … deeply hidden),
  subsuming the exits-only `Exit.hidden` — usable by an **exit** (secret
  door), a **container** (hidden cache), an **object** (stashed item), a
  **detail** (hidden lever/inscription/keyhole, `DetailedMixin`), a
  **deployable** (a trap), and an **actor** (a passively-authored ambush
  creature — free, a creature is a perceivable).
- **Perception resolves concealment per-viewer, deterministically.** A viewer's
  *effective perception* (capacity + directed attention + conditions — light,
  tools, sense channel) vs. a thing's concealment decides whether it is
  perceived at all. **Deterministic-given-effort** — no re-roll slot machine;
  persistence is monotonic to a ceiling. A concealed thing a viewer hasn't
  found is genuinely **absent from that viewer's world** (server-authoritative;
  the client never receives hidden data — the honest fog).
- **Passive noticing + active search.** Passive perception surfaces the obvious
  **and hints at the hidden** ("the bookshelf sits oddly," "a draft") so
  attention is *directed*, not pixel-hunted. Active **`search` / `examine`**
  raises effective perception against concealment within a **scope** (room →
  desk → drawer), as a **costed engaged act** (time + exposure — ambushable
  mid-rummage), competence-graded via a new perception/awareness `Discipline`.
- **Found → per-viewer belief (world-facts).** A discovery enters the viewer's
  belief **permanently and per-viewer** (belief generalized from *identity*
  memory to *world-facts*): you don't re-search a found secret, and another
  viewer doesn't know it until they find it themselves.
- **Traps as the flagship consumer** — a `HazardMixin` (`lib/hazard/`)
  generalizing `GlassAlley`: an **armed→sprung** (one-shot) hazard whose
  **trigger is an open set** (locomotion-traversal the headliner + interact/
  touch, with a reserved slot for proximity/timer/remote-linkage), whose
  **delivery reuses `Construction × Material × Channel → ConditionApi.inflict`**
  (armor mitigates for free; a dart can drop a toxin via metabolism), and which
  can both wound **and veto/redirect the traversal** (pin/trip/drop) through the
  existing locomotion consequence ladder. A **disarm/defuse** action disables a
  found trap. A **reachable trapped-corridor demonstrator** finally re-homes the
  GlassAlley pattern.
- **Locomotion is the headline trap trigger, gated by a care↔speed axis.** A
  trap fires at the movement/traverse seam (where combat's `disengage`/flee gate
  already lives). A new **`sneak` (careful) / `walk` (baseline) / `run` (fast)**
  movement axis is the risk-dial: **sneaking raises your traverse-time
  perception** (you spot & step around an unknown trap or secret in your path,
  at a speed cost), **running lowers it** (you barrel past what you'd have
  noticed, and spring it). A mover who has **found** the trap (in belief) avoids
  it regardless; **fly/swim clears a ground hazard** (site/modality). The
  care↔speed modes ship with their **detection** effect wired; the *hide-from-
  others* effect of sneaking is the reserved actor-face stealth consumer.

## Non-goals

- **The *hiding* half of stealth (Thesis 2, the actor face).** The `sneak` mode
  ships this build, but only its **detection** effect (it helps *you* notice) —
  its **concealment** effect (others fail to perceive *you*) is deferred,
  because doing it non-broken pulls in the **motion-degrades-concealment**
  detection window, an **NPC detection/response**, and the surprise-attack /
  ambush / assassination combat initiation (surprise denies the poise contest;
  ambush = broken-poise start). A **passively-authored** concealed creature is
  in scope (the gate resolves it for free); an actor *actively hiding itself* is
  the next consumer. Combat's seam stays reserved (`session.opened` carries
  awareness).
- **The knowledge economy.** Sharing / selling / transferring found secrets;
  maps as social currency. Only the *personal* per-viewer found-memory ships.
- **`frisk` + player-placed concealment.** Searching a person/downed body for
  concealed items, and players `stash`/`conceal`/plant against a `hide`
  competence. Authored concealment ships; player-driven concealment is deferred.
- **Ranged / projectile traps + remote mechanical linkages.** A dart *across* a
  room, a pressure-plate-here → blade-*there*. These belong to the future
  ranged-delivery build that will "pass over" weapons *and* traps uniformly; an
  explicit **ranged-delivery seam** is reserved in the trap delivery spec.
- **Concealed *properties/state*** (the poisoned drink that *looks* fine — a
  visible thing with a hidden property). This build conceals **presence**, not
  properties; hidden-effect toxins already ride metabolism's reconcile-on-read.
- **Disguise-as-concealment unification.** The identity-disguise stack
  (`Disguisable`/`RecognitionApi`) stays its own axis; folding it under the one
  gate is deferred (they meet only at the naming step, as belief.md documents).
- **Threat reads** (`assess <person>` out of combat — the pre-combat
  impression). The slate defers it; no new substrate here.
- **Resettable / rearming traps + a trap crafting economy.** One-shot v1.
- **The locomotion-as-activity reconception.** The `sneak`/`walk`/`run` care↔
  speed *modes* ship (riding the existing `LocomotionMode` machinery), but
  promoting movement to timed, interruptible *engaged acts* (the
  `TraverseActivity` / detection-window-during-traversal reconception) is a
  separate build. v1's care↔speed axis applies to ordinary ground movement; its
  interaction with terrain-forced modes (careful *while* climbing/swimming) is
  baseline.

## Surface decisions

### The concealment gate is general, subsuming `Exit.hidden`
Concealment is a property of **every perceivable**, not a trap-local flag —
the build is the *gate*, traps the first consumer. The dead-end `Exit.hidden`
boolean is generalized into the same concealment level and gains a reveal path;
a hidden exit becomes *discoverable* rather than permanently invisible. Chosen
over a trap-only concealment because a trap-local hack would be rebuilt
verbatim for secret doors and caches (the half-grown outcome we reject); the
slate's one-gate thesis is the whole point.

### Concealment is a level, resolved against effective perception; discovery is per-viewer belief
A perceivable carries a `concealment` level (obvious … deeply hidden). A
viewer perceives it iff **effective perception ≥ concealment**, where effective
perception = the viewer's perceptual capacity + directed attention (passive
baseline vs. active `search`) + conditions (light, tools, the sense channel).
The outcome is a **per-viewer discovery** recorded in the belief store — so the
resolution runs once per viewer×thing and the answer sticks.

### Detection is deterministic-given-effort (no slot machine)
Resolution is a **deterministic function of effort and conditions** — the same
search under the same conditions yields the same result; more attention finds
strictly more, monotonically, up to a ceiling set by capacity vs. concealment.
No hidden RNG re-roll: you find it if you look well enough, and you never
re-search a thing you couldn't find by grinding the same spot. (The
poker-not-slots discipline the combat fog established.)

### Passive noticing hints; active search directs attention within a scope
Passive perception (always-on) surfaces obvious things **and a hint** for a
sufficiently-perceptible-but-hidden thing (a draft, an odd shelf) — the world
*points* so attention isn't pixel-hunted. The **`search` / `examine`** verb is
active, **scoped** (a place → a container → a detail; broad-shallow vs.
narrow-deep), and a **costed engaged act** on the activity framework (it takes
time and exposes you — you can be interrupted / caught mid-rummage). It is
competence-graded through a new perception/awareness `Discipline` (advancement).

### Belief generalizes from identity to world-facts
The belief store (today: recognition / identification / regard, keyed on a
referent's `templatePath`) gains a **discovery/world-fact realm** — "viewer V
has found feature F" — persisted per-viewer. The *transfer* of that knowledge
(telling/selling) is deferred; only the personal memory ships.

### Concealment plugs into the existing perception pipeline — the client never sees hidden data
A concealed-and-undiscovered thing is **omitted from the viewer's perception**
at the server: it does not appear in `look`, is not walked by the propagation
chains, and is never sent to the client (no "invisible but present" leak). This
rides the perception viewer-aware pattern + the reserved
`VisionModality.shadowsAt` / `ShadowQuality` concealment surface + the
per-viewer Shadow override seam; a discovery (belief) is what lifts the veil for
that viewer. Honest fog, no metagaming (the slate's PC/NPC asymmetry).

### Traps: an armed→sprung `HazardMixin` over the `inflict` seam, triggered at the locomotion traverse
A `HazardMixin` (`lib/hazard/`) generalizes `GlassAlley`. State is
**armed → sprung** (one-shot v1). The **trigger is an open descriptor set** —
**locomotion-traversal is the headliner** (checked at the movement/traverse
seam, the same place `CombatApi.disengage` hooks), **interact/touch** the
second, and a **reserved** proximity/timer/remote slot. Delivery **reuses the
weapon grammar** — an authored `Construction × Material` delivers a `Channel`
into `ConditionApi.inflict`, so **armor attenuates a trap exactly as it does a
blow** (a booted foot vs. glass; a dart's toxin drops through metabolism). A
sprung trap can **inflict *and* veto/redirect the traversal** — pin
(immobilize, the fracture/encumbrance veto), trip (`prone`), or drop (a forced
traverse to the location below) — through the existing locomotion consequence
ladder, never a bespoke hazard-movement path. **Contact-range only**, with an
explicit reserved **ranged-delivery seam** in the delivery spec.

### Trap taxonomy: compositional axes, not an enumerated roster
A trap is **not** a member of a fixed enum (pit / dart / fire); it is a **point
in a space of orthogonal axes**, the same way a weapon is `Construction ×
Material × Channel` rather than a `Sword` class. The `HazardMixin` and its
delivery spec must express these axes; the concrete "trap kinds" are then
**authored data**, emergent from the combination — no per-archetype subclass.

| Axis | v1 values | reserved / deferred |
|---|---|---|
| **Trigger** | locomotion-traversal (tread), interact-touch (open/pull/grab) | proximity, timer, remote-linkage |
| **Locus** (host) | location/floor, boundary/exit, container/object, detail | — |
| **Delivery → effect** | *wound* via `Channel` (edge / point / blunt), *toxin* (→ metabolism), *shock* (the shipped electricity channel — free), *movement veto/redirect* (pin / trip / drop) | ranged/area, alarm/signal, magic |
| **Concealment** | obvious … deeply hidden (the detection axis above) | — |
| **State** | armed → sprung (one-shot) | resettable / rearming |

The classic archetypes fall out of the axes and are proof the space is covered
— pit = traversal + drop (`fly` clears); spiked pit = + point; dart = traversal/
interact + point + toxin; scythe = traversal + edge; deadfall = traversal +
blunt; snare/bear-trap = traversal + pin; tripwire = traversal + trip; trapped
chest = interact + any delivery; **electrified floor = traversal/touch + shock**
(genuinely free, riding the just-shipped conduction substrate). The demonstrator
authors three distinct points in this space (§ acceptance) with **zero new
classes per kind**. Three effect points are explicitly **out of scope and named
at their seams**: **alarm/signal** traps (effect = an NPC alert, wants the
deferred detection/response wave), **area/gas** traps (the reserved ranged/AoE
delivery seam), and **magic** traps (the magic build). *How* the axes land in
code — descriptor fields on the mixin vs. a small value-object per axis — is the
planner's call; this doc fixes only the axes and that kinds are data.

### A care↔speed movement axis (`sneak`/`walk`/`run`) is the risk-dial
Movement gains a **care↔speed axis** — new `sneak` (careful, slow) and `run`
(fast, reckless) `LocomotionMode`s bracketing the existing `walk` baseline,
chosen through the movement command surface (verb or pace setting — the plan
decides representation). The axis is a **directed-attention input to the
traverse-time detection**: sneaking *raises* effective perception (you spot a
hidden trap/secret in your path and route around it), running *lowers* it (you
miss it and spring it), each at the inverse speed trade-off. Chosen as new
modes over a full pace/activity reconception because the substrate already
carries per-mode attributes (`noiseLevel`, `emissionAt`) and terrain modes are
already selected per-traverse — sneak/run are two more singletons, not a new
model. The axis applies to ordinary ground movement this build; its `noiseLevel`
/ self-concealment side is authored-as-data but its *observer-detection* is the
reserved stealth consumer.

### The trap's trigger resolves against detection at the seam
When a mover traverses onto/through a trapped location or boundary, the trap
resolves against the mover's detection: **found (in belief), or passive
perception (as modulated by the care↔speed mode) ≥ concealment → the mover
avoids it** (not shown as sprung); **else it springs.** `fly`/`swim` clear a
**ground** hazard by site/modality (a flyer doesn't step in a pit). A `disarm`
action (competence-graded, the same `Discipline`) disables a **found** trap
(you must perceive it to defuse it).

### Content discipline: secrets are rewards, never required paths
A concealed exit/cache is *a* way, never *the* way — no critical content sits
behind a hard perception wall (or it is heavily hinted and deducible).
Discovery is a *beat*, not a tax. This is a **non-negotiable authoring
constraint**, checked by the demonstrator (every secret has an obvious
alternative).

## Constraints

- **Server-authoritative, honest fog.** The client MUST NOT receive data about
  an undiscovered concealed thing — it is absent from the viewer's world until
  found, never "present but flagged hidden." (`nothing-is-pure-client`; the
  slate's no-metagaming rule.)
- **Deterministic — no new aleatory randomness.** Detection is a deterministic
  function of effort × conditions × capacity vs. concealment; monotonic to a
  ceiling. (The poker-not-slots line.)
- **Reuse, don't reinvent — no parallel systems.** The gate plugs into the
  existing perception pipeline (`VisionModality`/the Shadow seam/the reserved
  `shadowsAt`), the belief store (extended, not duplicated), `ConditionApi.inflict`
  + the materials-response covering stack, the activity framework (search = a
  costed engaged act), and the locomotion traverse seam. Trap delivery is the
  weapon grammar, not a second damage model.
- **Module taxonomy.** `HazardMixin` in `lib/hazard/`; concealment as a
  mixin/field on the perceivable that *subsumes* `Exit.hidden` (not a new
  parallel flag); a gated `*Api`/`*Logic` pair for any powerful primitive
  (the detection-resolution / reveal seam) per the Api-layer rule; a
  perception/awareness `Discipline` seeded as data. No free-floating helpers.
- **All tunables are `AppSettings` dials** — concealment/perception thresholds,
  hint thresholds, search cost, trap energies — no code-literal magnitudes; the
  seeder key-count moves with them.
- **Contact-only trap delivery** with a reserved ranged-delivery seam — the
  ranged build grafts distance onto the same spec for weapons and traps at once.
- **The demonstrator must be reachably placed** — the GlassAlley failure was
  that every real content host broke a standup/fast-travel invariant; this
  build ships a *purpose-built* walkable trapped room that stands up cleanly.

## Acceptance criteria

- **The concealment gate is general.** A perceivable (exit, container, object,
  detail, deployable, creature) can carry a concealment level; `Exit.hidden` is
  subsumed and a hidden exit is now *discoverable* (has a reveal path), not a
  dead end. Unit-tested on the resolution.
- **Concealment gates perception per-viewer, and the client never sees hidden
  data.** A viewer whose effective perception < a thing's concealment does not
  perceive it (absent from `look`, absent from the wire); once found, they do.
  Tested through the perception path + a wire-shape assertion (no leak).
- **Detection is deterministic-given-effort.** A test shows the same effort →
  the same result, more effort finds monotonically more to a ceiling, and no
  amount of repeat-searching the same spot beyond the ceiling ever flips it.
- **Passive noticing hints; active search finds.** Passive perception emits a
  *hint* for a hidden-but-hintable thing; `search`/`examine` (scoped, a costed
  engaged act, interruptible, competence-graded via the new `Discipline`)
  discovers it. Covered by tests.
- **Found → per-viewer belief.** A discovery persists per-viewer (the world-fact
  realm); re-search is a no-op; a second viewer doesn't inherit it. Tested.
- **Traps work over the `inflict` seam, triggered at the traverse.** A
  `HazardMixin` fires at the locomotion traverse; a mover with the trap found
  (or passive perception ≥ its concealment) avoids it, else it inflicts through
  the covering stack (armor mitigates) and can veto/redirect the traversal
  (pin/trip/drop). `fly`/`swim` clear a ground trap. A found trap is
  `disarm`-able. Each covered by a test (armor-mitigation, avoid-when-found,
  spring-when-not, fly-clears-ground, disarm, veto/redirect).
- **The care↔speed axis changes the trap outcome.** `sneak`/`walk`/`run` are
  chooseable movement modes; over the *same* concealed trap, a **sneaking** mover
  spots and avoids it where a **walking** one is at baseline and a **running**
  one springs it — a deterministic test at fixed inputs. (The `sneak`
  concealment/`noiseLevel` data is authored but its observer-side detection is
  the deferred stealth consumer — no test asserts others-can't-see-a-sneaker.)
- **A reachable trapped-corridor demonstrator** exercises the whole loop: a
  trapped room (spike pit + a step-dart + a pressure-plate blade), a secret
  exit, and a hidden cache — every secret with an obvious alternative (the
  content-discipline check) — placed reachably without breaking standup.
- **Docs**: a `docs/subsystems/concealment.md` (or `detection.md`) subsystem
  doc for the gate + `docs/subsystems/hazard.md` (or a section) for traps; the
  doc-map + architecture entries at finalize; the realized concealment-detection
  slate theses (1 + 3) ticked, the deferred theses (2 + the economy) named.
- **Tests** cover the decidable pieces: the concealment-vs-perception
  resolution (deterministic), the found-memory persistence, the search
  activity, the trap trigger/inflict/veto/avoid/disarm, and the honest-fog
  wire-shape. Integration validated by a live run through the demonstrator.

## Cross-references

- Seeding: [concealment-detection-slate.md](../slates/deferred-rpg/concealment-detection-slate.md)
  (Thesis 1 — one gate; Thesis 3 — searching); the deferred trap taxonomy in
  [harm.md](../subsystems/harm.md); the trap/detection seams in
  [locomotion.md](../subsystems/locomotion.md) +
  [locomotion-as-activity-slate.md](../slates/tails/locomotion-as-activity-slate.md).
- Substrate consumed (shipped): [belief.md](../subsystems/belief.md)
  (`BeliefStoreMixin`, `RecognitionApi`, the identity-vs-presence axis),
  [perception.md](../subsystems/perception.md) (viewer-aware queries, the
  Shadow per-viewer-override seam), [senses.md](../subsystems/senses.md),
  [light.md](../subsystems/light.md) (`VisionModality`, `shadowsAt`/
  `ShadowQuality` reserved surface), [boundary.md](../subsystems/boundary.md)
  (`Exit.hidden`, the exits-only concealment generalized),
  [materials-response.md](../subsystems/materials-response.md) +
  [harm.md](../subsystems/harm.md) (`ConditionApi.inflict`, the covering
  stack, GlassAlley), [activity.md](../subsystems/activity.md) (search as a
  costed engaged act), [advancement.md](../subsystems/advancement.md) (the new
  perception `Discipline`).
- Substrate **extended**: [locomotion.md](../subsystems/locomotion.md) — the new
  `sneak`/`run` `LocomotionMode`s + the care↔speed axis feeding the traverse-time
  detection (the `noiseLevel`/`emissionAt` seam lit on the detection side; the
  observer-detection/self-hiding side reserved).
- Related memory: [[species-as-race-allegory]] (the threat-read bias thread,
  deferred), [[nethack-influence-and-species-casting]] (searching / secrets
  lineage), [[systems-over-content-scope]], [[never-half-grown-everything-a-business]].
