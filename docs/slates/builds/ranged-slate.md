# Ranged slate — one engagement mode, from thrown knife to statute book

**Captured 2026-07-31** from a design session. Scope: the "later
cycles" engagement mode [combat.md](../../subsystems/combat.md)
reserved — **all** ranged delivery, uniformly: bows, crossbows,
slings, thrown blades, **guns** (the worked hard case, chosen first
because it is hardest), and **thrown effect-carriers** (the potion
that does its thing on impact). Prior art:
`docs/newbie/{gun,mag,ammo}.doc` — the user's decades-old GunCode
design, re-examined below; more of it survives than its original
audience believed.

## Foundations (already decided, already shipped)

- **Relationship, not coordinates.** The combat slate refused
  geometric/ballistic ranged outright (combat-tactics Thesis 1);
  range is a per-edge property of the combat graph.
  `ThreatEdge.range` is **shipped**: geometry-free bands per
  directed edge pair, reach classes, out-of-range whiffs, the
  clinch reversal. Ranged extends this machinery; it does not
  replace it.
- **The room caps the bands — from real metric dimensions
  (verified 2026-07-31).** Every `Location` answers the dimension
  interface — `getVolume()`, `getCeilingHeight()`, `getSizeScale()`:
  - **`CartesianLocation`** derives from its zone's `cellSize`
    (**default 3.0 m** — "a typical room"; author larger for
    outdoor cells): volume `c³`, ceiling `c`, sizeScale `c²`.
  - **`SphericalLocation`** carries a **per-room persisted
    `radius`**.
  - **Two physical systems already consume this**: light uses
    `getSizeScale()` as the receiving-surface divisor (bigger rooms
    read dimmer) and atmosphere runs `n = PV/RT` against
    `getVolume()`. Dimensions-drive-physics is shipped precedent,
    not a proposal.

  So the arena cap is a **derivation from an honest number**, not an
  enum: a 3 m cell affords `close`/`short` (bar fights stay knife
  fights, by physics); a hall affords `medium`; an authored 20 m+
  outdoor cell affords `far`. The frontier arms itself
  automatically — outdoor cells are already authored larger, so
  bands reach further *and* sound carries *and* the light math
  already knew.

  **The one real gap — cartesian dimensions are per-ZONE, not
  per-room.** Every room in a cartesian zone shares `cellSize`, so
  a cramped shop and an open hall in the same zone cannot differ
  today (spherical rooms vary freely). **The single named
  dependency of this whole design: an optional per-location extent
  override**, following the accessors' existing null-fallback shape
  — `this._extent ?? this.getZone()?.getCellSize()`. Three lines,
  and nothing else new is required.

  *(Research note: an earlier pass in this session wrongly concluded
  rooms carried no size, by grepping for a stored field — the
  codebase's own store-causes/derive-effects doctrine hides the
  cause on the zone and exposes the effect as accessors on the
  location. Corrected; the numbers above are verified from source.)*
- **Band extension: one new band (`far`)**, closed-vocabulary
  discipline; `extreme` waits until content proves it. Band-change
  verbs (advance/withdraw) are gambits costing poise and tempo —
  **the range-control duel is the poker game**: the archer holds
  `far`, the closer buys distance under fire, every advance is a
  called bluff.
- **Consent inherits, hard.** Ranged initiation rides exactly the
  ambush/consent gates melee has. No new hole where distance
  launders a non-consensual attack. **Cross-room shooting through
  exits is out of scope** for this design — parked with its
  consent and perception problems named.

## The unifying abstraction — delivery at range

Every ranged act is one shape: **a launcher imparts energy to a
projectile that crosses a band gap and applies a payload on
arrival.**

| Piece | Examples | Substrate |
|---|---|---|
| **Launcher** | arm, sling, bow, crossbow, gun | instrument; energy source (muscle → stave → charge) |
| **Projectile** | knife, stone, arrow, bullet, flask | chattel/glob; mass + material |
| **Payload** | kinetic (point/blunt channel) · **effect envelope** (the thrown potion) · hybrid (fire arrow) | materials-response · the item-effect envelope (closed effect union) |

**Thrown effect-carriers are ranged magic delivery.** A potion is a
consumable carrying declarative effects (the item-effect envelope —
already the extensibility audit's #1 bridge, already V4's build
consumer); *throwing* it is this mode delivering that envelope at a
band gap. On impact: the vessel is a real container breaking (bulk
spills — the contents puddle, burn, freeze *on the room's real
surfaces*), and the effects fire through the same closed union as
every spell. Firebolt spell, fire arrow, thrown fire flask: three
carriers, one honest heat effect. Nothing in the magic system is
duplicated; ranged just adds carriers.

**Arrows and knives are the simple cases and prove the uniformity:**
arrows as Globbable stacks, spent projectiles persisting in the room
and recoverable (materials-honest break chance), fletching as a
crafting branch; thrown blades as instruments doing double duty
(the loadout question "is this knife for my hand or the air?" is a
real decision). Bow truth needs one material addition: **elasticity**
(stave draw derives from it) — small, real, flagged.

## The old GunCode, re-examined (what survives, what converts)

**Survives intact:** the three-object decomposition (gun / magazine
/ round — the round carries the payload; `response = f(mechanism,
material, construction)` decades early) · typed compatibility
(`ammo_type`/`mag_type` — today: `accepts`/`fitsSlot`) · stack vs.
queue as the second-variant rule (clip / belt as instance data) ·
**the tracer trick** (tracers loaded last as a diegetic low-ammo
gauge — public, honest, in-fiction information; immortalized here) ·
operational friction as gameplay (reload workflows, feed
mechanisms) · the energy-weapon split (gun-owns-damage vs
round-owns-damage — a genuinely different architecture; energy
weapons parked as a frontier note on the electricity substrate).

**Converts (the one disease was slots-not-poker):** min/max damage
rolls → the response function over the round's real mass, material,
and charge · flat `jam_chance` → **jams as derived condition**
(wear, fouling, maintenance history, rate of fire — the
Durable/condition substrate; a neglected gun is a *known* risk,
visible to `analyze`, a consequence of decisions weeks old, never a
dice roll) · reliability scalar → the crafting wear→repair loop ·
stat bonuses → competence sharpens precision, never multiplies.

**The poker layer (why the old friction becomes fun):** ranged
state is **public state** — the crossbow is visibly spanned, the
slide visibly locked, the aim visibly held. Aim-vs-snap is
commitment-vs-cheap. Reload windows are readable tells. Burst is a
*bet* (tempo bought with ammo, fouling, and spread — visible to
everyone). Cover rides the concealment substrate (partial
presence-concealment degrading targeting; the peek-to-shoot rhythm
is the existing motion-degrade rules doing double duty). The old
design's friction paid out into hidden percentages; the same
friction paying out into information is the difference between
chores and poker.

## Guns — the worked hard case (the political architecture)

Guns were chosen first **for pedagogical reasons**: this is a
political MUD, gun control is a top-shelf political topic, and the
real debate is crippled by an ignorance asymmetry (advocates who
don't know guns; enthusiasts rightly dismissing them, wrongly
holding the shield forever). **The debate is theater unless guns
are modeled honestly.** The architecture:

1. **The mechanism is the curriculum.** Cartridge decomposition
   (case, primer, charge, projectile — powder *deflagrates*; the
   combustion substrate can say so); action families as the
   second-variant rule run deep (matchlock → flintlock → caplock →
   cartridge → repeater → self-loader), each a real mechanical
   idea `analyze` can teach. A week with this system produces a
   debate participant who cannot be dismissed.
2. **The honest skill split: firing is easy; handling safely is
   the skill.** Competence never gates whether a gun fires (the
   low skill floor IS the politically load-bearing truth). It
   governs *handling*: the four rules as mechanics, and
   **negligent discharge as a derived consequence, never RNG** —
   carried chambered + safety off + running + snagged is a chain
   of decisions on the record. (Whether an ND can strike a
   bystander: the strongest teacher and the most grief-adjacent
   mechanic in the design — **open, for requirements**, gated by
   the same consent/accountability machinery as all harm.)
3. **Honest lethality.** The wound model never softens gunshots.
   What makes guns politically distinct is real and mechanical
   here: lethality-per-effort, lethality-at-distance (the bands),
   concealability (the concealment substrate — concealed carry is
   literally mechanical), reproducibility (crafting).
4. **No authored ceiling — the ceiling is the curriculum.** "What
   makes a gun a gun" (the 'arms' problem) is the debate itself;
   the model spans the full mechanical space and every line is
   drawn BY LAW. **The model's property vocabulary is the
   statute's drafting vocabulary**: action, caliber, energy,
   barrel length, capacity, feed, rate, mass — laws written
   against real fields, checkable by the world. And badly drafted
   law **fails mechanically in public** (a cosmetic-feature ban is
   routed around by mechanically identical weapons within a week —
   the definition-drafting lesson both real-world sides need).
   Kernel neutrality throughout: the engine ships no gun law.
5. **The launch regime [DECIDED: shipped-installed]** — because
   NPC guards keep the city streets safe, armed. The state has a
   monopoly at launch, which reproduces the real debate's actual
   starting condition (the state already has guns; the live
   question is everyone else). "Wrong hands" is solved by policy,
   not physics:
   - **Credential-locked state issue** — the diegetic smart gun:
     a guard's sidearm keyed to the office's warrant credential
     (lock/key/credential substrate). A looted state gun is a
     brick with a serial number. The smart-gun debate ships as a
     working demonstration; the lock is state policy (changeable,
     mandatable, crackable-by-black-market), never an engine rule.
   - **Armory-controlled powder** — no civilian production recipe
     at launch; civilian proliferation remains the emergent event
     (rediscovered through the world's real chemistry — inquiry
     bait — or licensed first by law). Prohibition still produces
     smuggling mechanically; the lesson teaches itself.
   - **Use-of-force as written policy** — when a guard may draw
     and fire is locality law expressed as behavior spec, and
     every discharge lands on the accountability ledger:
     police accountability with receipts, appealable in the
     courts. The debate's other half, functional day one.
   - **Registration = chattel** — a registry is the chattel
     ledger wearing a legal name; serials are chattel IDs; a
     crafted, never-registered firearm is mechanically a ghost
     gun. Forensics rides provenance and its honest limits.
   - **Tiebout on gun law** — localities legislate differently;
     people sort. The second city's sharpest axis.
6. **The collector layer (speaking to everyone honestly).** The
   enthusiast's draw is real and served without fetish: the
   configuration space as genuine engineering (action character,
   caliber tradeoffs — energy vs. capacity vs. recoil vs. carry
   weight on the real encumbrance gauge); ammunition selection
   and ordering as *loadout* (a combat pillar already); craft as
   Grade (a masterwork is honestly a masterwork, by a maker with
   a name); and **provenance as collectibility** — collectors
   collect stories with serial numbers, and every gun here
   carries its chain of custody by construction. Meanwhile the
   advocate's truth — harm salience — is served by the wound
   model. Each side gets the other's missing referent; the floor
   and the record do the rest.

## The field model (decomposed 2026-07-31)

**Discipline: store causes, derive effects.** Every stored field is a
physical or mechanical fact; everything combat, statutes, or
collectors care about derives on read. Nobody ever writes "damage"
on anything.

### Launcher

The deepest field: **`energySource`** (closed) — `muscle` (thrown) ·
`stored-elastic` (bow: stored at draw; crossbow: stored at *span*,
held) · `chemical` (gun: the cartridge owns the energy; the launcher
contributes containment and direction) · `electrical` (parked). This
one enum explains why bows care about the archer, why crossbows
trade tempo for held readiness, and why the round owns the damage.

- **Bow**: `limbLength`, `limbThickness`, stave material → derived
  draw weight (via the new `elasticity` material property), stored
  energy, span time.
- **Crossbow**: + `spanMechanism` (closed: `hand`/`stirrup`/`lever`/
  `windlass`) → span tempo + max manageable draw. Hunting crossbow
  vs. arbalest = same class, different data.
- **Gun** (every field statute-nameable, guard-inspectable,
  `analyze`-teachable): `action` (closed: `muzzleloader` ·
  `breech-single` · `revolver` · `repeater-manual` · `self-loading`
  · `automatic`) · `ignition` (closed: `match`/`flint`/`cap`/
  `integrated` — the historical ladder, orthogonal to action) ·
  `chambering` (typed compat key — the old `ammo_type`, grown up) ·
  `barrelLength` (cm) · `feed` (`none`/`internal`/`detachable` +
  `feedOrder: stack|queue`) · `capacity` (iff internal) ·
  `fireModes` (subset: `single`/`burst`/`auto`) · `safety` (closed)
  · the existing mass/length/form fields.
- **Runtime state (not template)**: `chambered`, `safetyOn`,
  `seatedMagazine`, `fouling`, Durable condition,
  `shotsSinceService` — what the four rules and the jam model read.
- **Derived, never stored**: muzzle energy (charge × barrel
  efficiency), handling, concealability (size class → the
  concealment substrate), reload/span tempo, jam risk, loudness.

### Projectile — family fields (where the enthusiasts live)

- **Bullet** (inside its cartridge): **caliber** (diameter),
  **grain** (mass — the real unit, kept; archers use it too),
  **profile** (`FMJ`/`hollow-point`/`hardcast`/`ball`) — the
  penetration/channel trade (FMJ drives deep; a hollow point
  expands: wider, shallower) that is simultaneously the terminal-
  ballistics argument and the statute's named field ("expanding
  ammunition").
- **Arrow**: **spine** (shaft stiffness), shaft material/length,
  **fletching**, **head** (`bodkin`→point · `broadhead`→edge — a
  broadhead *cuts*, the channel vocabulary says so for free ·
  `blunt`), grain mass. Spine-to-draw match derives flight quality.
- **Thrown blade**: mass, edge/point geometry, **thrown-balance**
  (the purpose-made thrower vs. the kitchen knife in anger).
- **Vessel**: mass, fragility, payload-dominant, stability poor —
  honestly.

### Cartridge (the compound projectile)

`case` (material; **spent brass persists and is recoverable** —
handloading as crafting content) · `charge` (`powderMass` + powder
material — energy = mass × the material's specific energy; the
chemistry checks against a textbook) · `primer` (ignition-compat) ·
`bullet` (embedded projectile spec). Derived: muzzle energy,
**recoil** (real momentum from real masses), **loudness** (an
Audible event that carries rooms away; the suppressor accessory
modifies exactly this number, which is why statutes name it).

### Magazine

`magKey` · `capacity` (the statute favorite) · `feedOrder` · mass;
contents an **ordered** glob of cartridges — the ordering is where
the tracer trick lives.

**The observation that closes the loop: the statute table and the
collector table are the same table.** The fields a law must name
(action, capacity, barrel length, chambering, fire modes, bullet
form, loudness) are the fields a collector savors. Both
constituencies become literate in one schema, because there is only
one schema, and it is true.

## The Delivery Profile — one contract, every projectile

Family fields are causes; **combat consumes a single derived
tuple**, computed per (projectile × launcher × band), never stored:

| Field | What it is | Consumer |
|---|---|---|
| `energy` | joules arriving at this band | the response function |
| `channel` | `point`/`edge`/`blunt` (existing vocabulary) | the response function |
| `penetration` | sectional behavior — deep vs. wide | wound geometry |
| `stability` | flight quality — steps the placement table | resolution |
| `payload` | effect envelope, if any | the effect union |
| `integrity` | deform/break/recover post-hit | the room |

Combat, placement, and the wound model cannot tell an arrow from a
bullet. The same move as materials-response and the melee playstyle
deriver: many honest inputs, one consumer contract.

**The fit asymmetry (designed on purpose):** guns have **hard fit**
(chambering is binary — `accepts`/`fitsSlot`, refusal on mismatch);
archery has **graded fit** (any arrow leaves any bow; spine-match
derives a quality factor, never a gate). Machined tolerances vs.
craft tolerances — a true statement about industrial vs. artisanal
weapons, and quietly part of the proliferation lesson.

## Resolution — placement, not to-hit

Bullets don't consult probability; placement does the deciding. A
shot resolves **deterministically from two commitments** (the
gambit-matrix shape; no dice anywhere):

- **The shooter's aim ladder** (public state): `snap` (this beat) →
  `held` (one beat, visible) → `settled` (two beats, visible,
  target telegraphed). Aim decays on movement or band change.
- **The target's answer** (spent in the reactive window): `stand`
  (call the bluff) · `move` (band change under fire) · `cover`
  (when the room offers it; quality from the concealment bands) ·
  `drop` · `counter` (return fire — both resolve on current aim
  states; standoffs become timing games).
- **Base matrix** (aim × answer) → placement class (`miss` /
  `graze` / `hit` / `precise`), then **modifiers move steps on
  that ladder**: stability −1 if poor; beyond effective band −1;
  cover quality −1/−2; the existing motion-degrade rules.
- **Competence buys tempo, never steps** (competence sharpens
  instruments): a marksman *settles faster* and holds aim through
  minor movement — never a flat accuracy bonus.
- **Suppression is a held aim** — overwatch on a zone or exit:
  whoever crosses eats the committed shot at its current aim
  state. The cost is the poker: a holding shooter has spent their
  reactive window, and is meat if closed to the clinch.
- **Placement class × Delivery Profile → the wound**: `precise`
  reaches vitals zones, `graze` stays superficial — the medical
  model's anatomy does the rest.
- **Burst** = consecutive snap-tier placements with recoil
  stepping each subsequent round down — a visible bet of ammo and
  fouling against tempo.
- **Area arrival = the hazard substrate** (resolves the flask):
  a ground arrival breaks the vessel (real bulk spill on real
  surfaces) and the payload becomes a **placed hazard** —
  HazardMixin is shipped and self-resolving. Area denial becomes a
  loadout choice: you're not shooting a person, you're shooting
  the floor they need.

## Mitigation — armor, and the less-lethal family

### Armor rides the response grid — and changes the poker

No new system: ranged protection is `response = f(mechanism,
material, construction)` extended to projectile energies. Three
honest truths the grid teaches:

1. **Stab armor ≠ ballistic armor.** Woven textile catches a
   *deforming, fast* projectile (fibers load and spread); a *slow,
   rigid point* — bodkin, stiletto — slips the weave. Arrows defeat
   vests that stop pistol balls; mail bursts against bullets (why
   the gun ended that era). Channel × velocity-regime ×
   construction expresses all of it. Counterintuitive, checkable,
   separates knowledge from movies.
2. **Caught is not unharmed.** A stopped bullet still delivers its
   momentum: armor *converts* `point` to `blunt`, and the padding
   layer underneath (the existing layering emergence) decides what
   that costs in ribs. Behind-armor trauma is honest.
3. **Proof marks are literal.** "Bulletproof" originally meant the
   armorer's test-fire dent certifying the breastplate. Grade +
   provenance do this natively: a proofed cuirass carries the test
   as a chattel event — certification, marketing, and
   collectibility in one mechanic. (Era gift: the historical silk
   bullet-resistant vest fits our tech level if soft ballistic
   armor is wanted before any aramid-analog exists.)

**The tactical consequence: armor forces the shooter up the aim
ladder.** Armor covers zones; snap/held placements land on the
plate; only `settled` aim picks gaps. Armor's real gift is *tempo
pressure* — it buys beats, turns firefights into aim-time contests,
and makes closing-under-fire viable. The arms race reopens honestly
(hardcast/bodkin = armor-piercing as a *bullet form*, already in
the schema) and **both sides of the race are statute-nameable**: AP
ammunition law and body-armor possession law are each real
legislation, each writable against real fields.

### Less-lethal — payloads that target conditions, with honest leakage

A less-lethal weapon is an ordinary launcher whose payload targets
**poise and conditions instead of wounds** — the effect-envelope
half of the Delivery Profile, no new architecture. The design
refuses the euphemism: **less-lethal, never non-lethal.**

- **The taser**: tethered shock delivery — two darts, `close` band
  only (the wires are honest), *both* must land (placement decides;
  partial hits fail, which is real), one shot then reload. The
  payload rides the shipped shock channel into **neuromuscular
  incapacitation as a condition** (SustainedShock precedent; the
  seeded stun baton is the melee cousin — drive-stun for free).
  The vitals model keeps the deep honesty: shock meets a real
  cardiovascular system.
- **Beanbag / baton rounds**: a cartridge whose projectile `form`
  is `bag` — high mass, terrible sectional density, `blunt`
  channel, poise-crushing, wound-light. The placement table keeps
  it honest with zero special rules: `close` + `precise` + head =
  lethal, because that is the real failure mode of these weapons.
- **Nets and irritants**: entangle as a restraint condition; spray
  as sense-conditions (blinding via perception, irritant via the
  toxin model), `close` band.

**The force continuum becomes equipment.** Presence → voice →
taser → revolver is the guard's *visible loadout in escalation
order*, each rung a ledger entry when used. A locality debating
"should guards carry lethal arms" can write the law as *what hangs
on the belt* — and the world shows what each configuration costs,
in outcomes, on the record.

## Gun policy — which layer holds what

**(Design conversation 2026-07-31.)** The enforcement machinery —
the wall/camera/witness/norm mode vocabulary, posted law, the
evidence firewall, testimony, and the intrinsic/social layer split
— is general and lives in
[enforcement-slate.md](./enforcement-slate.md). What is
gun-specific is **which layer holds which decision**:

| Layer | Holds | Gun-relevant contents |
|---|---|---|
| **Kernel** (ours; physics) | the weapon model, concealment honesty, record integrity, the meta-moderation guardrail, the evidence firewall | **not policy — capability and honesty** |
| **Amendment roster** (à la carte, welded at ratification) | the constitutional *candidates* a community may adopt | an **arms-right** amendment (the 2A-analog — offered, never imposed) · a **no-automated-punishment** amendment ("no sanction without a person in the loop") · a **search/surveillance floor** (limits on instrument evidence) |
| **Ordinary Compact law** (majority, revisable) | the launch regime, explicitly a default and explicitly movable | state monopoly · credential-locked issue · armory-controlled powder · use-of-force policy |
| **Locality / parcel law** (committees) | the Tiebout surface | carry rules, enforcement **modes**, guard armament, the posted notices |
| **Private measures** (any owner) | property rights needing nobody's license | the merchant's wards, locks, attendants — the opt-out for players who don't want the violence game |

**What we encourage, and how: through defaults and through the
roster's menu, never through the kernel.** The kernel makes guns
*true*; ordinary law makes the launch world safe-ish; the roster
puts the eternal questions on the shelf as ready-made amendments;
the community decides on the record and lives with it. Because the
statute vocabulary is real, *this* polity's debate can be about the
properties that drive outcomes rather than the silhouettes that
drive headlines.

**The design's own balance goals (stated, since they shape the
defaults):** advancement here happens at the margins, not by grind,
so death must stay consequential *and* uncommon — but player
killing is energizing and should exist. The resolution: **law and
patrol density are content decisions that vary by place.** The city
is policed (armed guards; the knife-holder doesn't try it); the
merchant fortifies and lives their life; the wilds have no patrol
and arming yourself is a rational choice. Danger is geography, and
geography is authored.

**The worked case — the gun on campus.** He keeps it at home,
legally; he brings it concealed. What happens is a stack of honest
systems: **concealment** decides whether it is spottable (a coat
over a holster is a real state; perception may honestly beat it or
honestly not) → if spotted, **a person decides** whether to report
(the aether makes reporting instant; social cost makes it a choice)
→ if reported, the campus's **posted mode** decides the outcome
(confiscation and fine, citation to the courts, escort off grounds)
→ if never spotted, **nothing happens, and that is correct**: a
witness-mode rule nobody witnessed broken is a rule that held
socially. Our editorial preference for flagship content: **wall the
checkpoint, don't camera the quad** — prevention at the declared
boundary, human process inside it. But it is the committee's dial,
and a campus that goes full camera should get to discover what that
does to enrollment.

## Sight, sound, and adjacency

### LOS — nothing to build inside a room; vistas are authored

- **Intra-room LOS does not exist and should not.** There is no
  interior geometry, so "can I see you in here" is **concealment**
  — shipped, honest, and already the cover mechanic. Nothing new.
- **Cross-room sight is authored, never derived.** An optical walk
  *could* mirror the acoustic one (same exit graph, different tau —
  doors block light as they block sound), but universal
  cross-room sight quietly turns every exit into a firing lane.
  Instead **vistas are authored relationships** — the balcony over
  the market, the gate tower over the road: rare, dramatic,
  considered at authoring time. House pattern: declared, like
  sockets and graft points.
- **The rule that protects the design: sight may cross; combat may
  not.** Watch a fight from the tower, see the guard coming, hear
  the shot — but to *engage* you enter the arena and the band
  system takes over. Cross-map sniping would break the per-edge
  band model and every consent gate at once, to replace an
  experience you can have by walking downstairs.

### Acoustics — make sound match light

**Current state (verified):** `AudienceGather` already does real dB
attenuation (`sourceDb + 10*log10(cumulativeTau)`), real door
transmissivity (a closed `Door` returns 0 and short-circuits),
vacuum blocking, and first-hop direction. Two pieces are
unphysical:

- **`MAX_HOPS = 2`** — a hard room count standing in for distance.
- **`PER_HOP_TAU = 0.01`** — a flat −20 dB per hop, charging the
  same attenuation whether the hop crosses a broom closet or a
  parade ground.

**The fix needs no new data**: every room already reports a real
linear extent, so walk the graph accumulating **meters** and
attenuate per meter, keeping the existing dB math and door
branches; `DEFAULT_HEARING_THRESHOLD_DB` does the cutting.
`MAX_HOPS` retires as physics (keep only as a perf backstop).
**The argument that carries it: light already derives from room
size — sound not doing so is the inconsistency.**

Payoff for this slate: **"a gunshot summons the world" stops being
a special case and becomes arithmetic** — a whisper dies in the next
room, a shot walks the street and stops at the closed doors, and
the suppressor's attenuation is a real number against a real
threshold rather than a movie trope.

### Poise by energy source — the honest balance lever

**Does shooting cost poise? It depends on `energySource`, and the
truth is the lever:** holding a bow at full draw is genuinely
exhausting (muscle-powered ranged is poise-expensive — which is why
real archers loose quickly), while firing a gun costs essentially
nothing physically. **The gun's real advantage is that it does not
tire you.** That is true, it is *why* firearms won historically, and
it is the cleanest balance knob in the design — no invented
drawback required.

## Cover — the shield's static cousin

**The model already exists: it is the shield.** The seeded steel
shield is *"an armor construction (it resists like plate) worn in
the hand, not on the body — combat folds it into the **covering
stack** as a **directional front cover**"*, and its own prose says
the weakness aloud: *"it guards only what it faces, and two
attackers will find the side it can't cover."* Static cover is not a
new system — it is the same thing **positional instead of wielded**:
you occupy it rather than hold it, and it joins your covering stack
while you are behind it.

**Cover ≠ concealment** (real-world doctrine, and we are already
half-equipped): **concealment hides you; cover stops the thing.** A
curtain conceals and protects nothing; a low wall protects while
everyone knows exactly where you are; sandbags do both. So an
authored cover object declares **two** numbers — its concealment
contribution (the shipped bands) and its material + construction
(the response grid) — and the classic distinction falls out free.

**Authored, like traps — never ambient.** A `Cover` mixin on placed
objects, deliberate: not every table is cover; the author puts three
pillars in the boss arena because the fight needs them, dressed
however the venue likes. This gives encounter design a spatial
vocabulary **without geometry** — the thing every game does, as
content rather than as a physics claim the containment model cannot
back.

**Three properties keep it from becoming a turtle simulator:**

1. **Directional** — cover faces a way, so **flanking beats it**
   (already the shield's documented weakness). One property makes
   multi-party ranged tactical and answers "what if someone camps
   behind a rock": move to where their cover isn't.
2. **Destructible** — materials-honest: a wooden crate splinters
   under sustained fire and a stone wall does not, via the response
   grid + Durable condition. Suppression can *dig you out*.
3. **Capacity** — only two fit behind the wagon. Exclusive resource
   ⇒ **lease** (the standing anti-grief rule). Who gets the good
   cover is a real decision, including a social one.

**Overturnable furniture — the middle ground.** A table is not
cover, but it can be *flipped* into cover as an action, diegetically,
the way people actually do in fights. The author decides which
objects can be overturned, so it stays deliberate, while players get
to **create** cover from the environment — the immersive-sim beat
without ambient-cover creep.

**Portable vs. static is the whole trade:** a shield costs a hand; a
wall costs mobility. And the shield is what makes **advancing under
fire** possible — the pavise, the testudo, the riot line, all one
idea, and the equipment answer to this slate's "close on the archer"
play. Historically why the equipment exists; here, why it still
does.

## Formations — what ranged adds (and what it must not)

A `CombatFormation` is a **standing party-level policy over the
threat graph** with **exactly three hooks** (target allocation,
interception, coup governance), and it **never scripts gambits** —
strike/feint/defend/flee stay personal agency (the build
deliberately rejected the DA:O tactics menu). So:

- **"Fire from cover" is NOT a formation instruction.** It is a
  gambit plus a personal occupancy; encoding it rebuilds the exact
  wall the formations build refused.
- **"Engage melee if flanked" already IS hook 2.** Interception —
  *"any threat edge onto a protected role redirects to the first
  eligible interceptor"* — is precisely the flanked-archer case;
  `vanguard`'s `front`/`back` already does it.

**What ranged genuinely adds — an enrichment of declared shape, not
a fourth hook:**

- **A band preference on the role vocabulary.** Today `back` means
  *protected*; in a ranged world it also wants to **hold `far`**.
  Role vocabulary is already declared shape on the Idea, read by the
  existing hooks. **Advisory for players** (gambits stay yours),
  **directive for NPC brains** (which is where formations do most of
  their work).
- **Interception gains a band verb** — redirect the edge *and
  close* on it: the screen steps into the flanker while the archer
  keeps shooting. An extension of hook 2's behavior, not new
  machinery.

**Cover stays personal, deliberately** — a capacity-limited
occupancy, so a formation may declare *intent* for brains to follow
but must never **assign** the good spot; contesting it socially is
better play than a policy resolving it.

**Two presets fall out of existing shape:**

| Preset | Policy |
|---|---|
| **`skirmish`** | every role holds `far`; no screening; interception **inverts** — withdraw rather than intercept (light-infantry harassment; the formation-level expression of the disengagement design) |
| **`firing-line`** | hold band; `called` allocation (converge fire on the captain's target); no interception, because nobody breaks the line (volley doctrine — makes the captain's call matter at range) |

**And the one that costs nothing: `vanguard` + ranged = combined
arms.** A shield-bearing front rank (portable cover) screening a
back rank that holds `far` and looses over them — the
pike-and-shot / archer-screen formation, emerging from a shipped
preset plus a role band preference. The formation layer turns out to
be **band-agnostic by construction**; ranged mostly gives the back
rank something to do at distance.

## NPC brains — doctrine, not plumbing

**No new brain contract is needed.** `combatant` is invoked
*directly* by the `CombatSession` at its decision points, and its
own doc draws the line: *"targeting itself is the engine's job; the
brain only decides the gambit."* Everything ranged adds —
advance/withdraw, the aim ladder, reload/span, take-cover, and the
reactive-window answer — is **gambit-shaped**. The work here is
doctrine.

**The governing principle, inherited from the shipped brain:** it
feints a turtle on beat parity *deliberately* so that "a foe who
reads the feint never traps the brain in a wasted feint loop — **the
reader beating the feinter is the intended outcome.**" So: **ship
legible, beatable doctrine, never optimal play.** Ranged must
inherit this, because ranged is where optimal play becomes
unbearable fastest.

**Which answers kiting — the thing that ruins ranged AI everywhere
else.** Two governors, both already designed:

- **The poise lever.** Withdrawing costs tempo and holding a draw
  costs poise, so a kiting archer **exhausts itself**. A player who
  keeps pressing is spending the NPC's stamina — pressing becomes a
  bet, not a futility.
- **Band discipline is the tell.** A brain that withdraws whenever
  the gap closes to X teaches the player to **fake the close** —
  feint-the-turtle generalized from guard to distance. The counter
  to a kiter is a feinted advance.

**The family — four doctrines, not four difficulty tiers:**

| Brain | Doctrine | Its tell / counter |
|---|---|---|
| `archer` | hold band, loose, reload; on being closed choose sidearm vs. withdraw vs. accept melee | the predictable reload window |
| `skirmisher` | kite to maintain band; loose into gaps | withdraws on a threshold — bait it |
| `marksman` | patient: spend beats settling, take the good shot; punishes standing still | committed aim — rush it |
| `sentry` (the armed `wary` variant) | **the use-of-force ladder**: challenge → draw → aim → warn → fire | escalation is public at every rung |

`sentry` is the politically load-bearing one: it is **use-of-force
policy expressed as a brain**, so a locality's rules about when a
guard may draw and fire are legible on the street, and every rung
lands on the accountability ledger.

**Morale is brain doctrine, and it serves the balance goal.** An
archer whose screen is dead breaks off; a lone wounded NPC does not
fight to the death. Honest behavior *and* the thing that keeps
**death uncommon while PvP stays energizing** — most fights ending
in someone leaving rather than someone dying is what protects
advancement-at-the-margins.

**The formation seam.** The brain consults
`PartyApi.formationPathOf` for its role's **band preference**
(advisory for players, *directive* for brains — as designed), while
the engine keeps targeting and interception. An NPC warband then
**fights in formation legibly** — the shield rank screens, the back
rank holds `far` — and combined arms arrives without anyone
scripting it.

**Ammunition is free drama (NPC≈PC).** NPCs track arrows and rounds
through the same object model as players, so **running dry is a real
state** that forces a mid-fight doctrine switch — draw the sidearm,
close, or run. No special-casing, and every ranged fight gets a
natural arc.

**Deferral discipline (existing precedent):** the shipped brain
declines to queue when overextended (broken/open), letting the
engine's recovery run. The ranged equivalent: while reloading or
spanning you are **committed** — the brain does not re-decide
mid-action.

## Multi-party — per-edge, and aim points one way

**Bands do not compose, and that is the model working.** Per-edge
ranges can be "geometrically impossible" — A at `far` from the
archer while B is at `close` to the archer and A and B are `close`
to each other — because the combat slate refused coordinates on
purpose: *"ranged is a relationship problem, not a coordinate
one."* A band means **how engaged are these two with each other**,
not how many meters apart. Test it as prose: *"you're keeping the
swordsman at bowshot while his partner is already on top of you."*
It reads perfectly. So: **no composition, no triangle inequality,
no derived position** — each edge is its own relationship, and 2v1
mixed ranges are already shipped and working.

**The real rule: aim is a single-target commitment.** You can only
point the weapon one way — a held aim on A does not cover B, and B
advances free. That one rule is load-bearing everywhere:

- it is **why flanking beats cover** (already the shield's
  documented weakness: "two attackers will find the side it can't
  cover");
- it is why a lone archer **correctly** loses to a pair;
- and it makes **suppression a choice of what to deny**, never a
  blanket — the honest version.

**Three consequences, no new mechanics:**

1. **Closing helps your ally, emergently.** If the archer swaps aim
   to whoever is rushing them, the other advances free — bounding
   overwatch from the attacker's side, unscripted.
2. **Withdrawal is per-edge, so leaving a crowd costs more than
   leaving a duel.** You disengage from a *specific* threat;
   opening distance on three people is three actions.
   **"Being surrounded is bad" falls out with no surround
   mechanic** — the cost scales with edge count automatically.
3. **Shooting into a melee is a real decision.** In a crowded arena
   a `miss` has somewhere to go; the risk is **readable before
   committing** (the crowd is visible); and a round that lands on
   an ally goes on the **accountability ledger with the shooter's
   name**. "Don't shoot into a melee" becomes an emergent tactical
   rule rather than a taught one — and it gives the `firing-line`
   preset a real reason to exist, since a volley doctrine does not
   want its own front rank in the way. It also gives use-of-force
   policy something concrete to have an opinion about: a guard
   brain firing into a crowded street is legible, attributable, and
   appealable.

**Grief seam named:** deliberately "missing" into an ally is
attributable (blame derives on read), so the existing machinery
covers the aftermath — but shooting into a melee containing a
**non-consenting** party wants an explicit consent check at
commit time, not only accountability afterward.

## Risk and the unskilled — ignorance, never dice

**(User, 2026-07-31, stated as a cultural position: guns are
powerful and need to be treated responsibly, gun owner or not. The
design holds it without the game *arguing* it — see the closing
note.)**

**The reframe that keeps both goals: the risk is not in the firing,
it is in everything around it.** A novice's shot is exactly as
lethal as an expert's — that is the politically load-bearing truth
and must not be softened. What a novice cannot do is carry it
safely, know its state, clear it, or maintain it. So the model is
never "unskilled players miss more" (false, and slots-not-poker);
it is **unskilled players create hazard states they do not
recognize.**

**The core mechanic, with no dice in it: competence buys
information, not outcomes.** An expert reads their own weapon as
*"chambered · safety off · four rounds · light fouling"*; a novice
reads *"a revolver."* Exactly the shipped precedent — bands instead
of numbers, competence sharpening instruments rather than inflating
them. The danger becomes genuinely self-inflicted: carrying
chambered without knowing, surprised by an empty gun, missing the
fouling.

**A causal chain replaces a probability:** *cannot read the state →
makes choices they do not know are unsafe → the negligent discharge
**derives** from those choices.* Novices trigger NDs more because of
ignorance, never because of a hidden penalty.

**Three more places skill shows — all tempo or information, never
accuracy:**

- **Clearing a malfunction is a skill.** The expert clears in a
  beat; the novice fumbles for several or worsens it. In a fight
  tempo *is* everything — a severe consequence with no dice in it.
- **Maintenance neglect compounds invisibly for the unskilled**,
  because reading condition is precisely what they cannot do. The
  weapon becomes dangerous and only someone else can see it.
- **Unsafe handling is public state** — a muzzle sweep, a finger on
  the trigger, carrying chambered in a crowd: everyone in the room
  sees it. Sentry brains react; bystanders move; other players say
  something. That is how range culture actually enforces itself,
  and it means **safety norms form socially, among players, rather
  than by our lecturing.**

**The range earns its place: it is where you learn to read.** The
payoff of safety training is not damage — it is *literally seeing
more*, as the readout resolves and states become legible. A real
progression with a real reward, and it makes the first lesson cheap
(a range, not a street).

**The rail, in bold: risk must never come from dice.** If a gun
jams it is because of accumulated state that *someone* could have
read. Unreliability-as-balance is the old GunCode disease already
diagnosed here — the moment a weapon betrays you randomly, the
player learns nothing except that guns are annoying.

**Why this is not a thumb on the scale.** The design does not make
guns weak, unreliable, or morally marked; it models them
accurately — and the accurate facts *are* that a firearm is lethal
in anyone's hands, that its state is not obvious, and that the
discipline is the whole skill. Respect for the machine emerges from
honesty, not from advocacy, which is what keeps this consistent
with the kernel-neutrality doctrine everywhere else in the slate.
The safety Discipline already states the truest version:
**it does not make you deadlier — it makes you not dangerous to
your own side.**

## Condition and crafting — the assembly, and what wear means

**The two-axis model already exists; guns reuse it.** Crafting's
shipped decision for blades is explicit — *"keenness vs condition —
two axes, two cadences"* (collapsing them was rejected):
`condition` (`DurableMixin`) is structural and slow, restored by
**repair**; `keenness` is the fast-cycling sibling, restored by
**sharpening**; *"sharpen never touches condition; repair never
touches keenness."* So guns need **no new condition model** —
they need **fouling as keenness's sibling**: the fast axis,
degraded per shot, restored by cleaning, orthogonal to structural
condition. The generalization: every durable carries a slow
structural axis and *optionally* a fast functional one. Blades
sharpen; guns clean.

**What differs is what degradation *does* — and it is categorical:**

- **A blade's axes scale the Delivery Profile.** A dull sword cuts
  worse: smooth, output-scaling.
- **A gun's axes scale *reliability*, not energy.** A filthy gun
  fires the same round at the same velocity — **the cartridge
  carries the energy** (the old GunCode had this right). What
  degrades is whether it *feeds, fires, and extracts*. Condition
  does not make a gun weaker; it makes it **untrustworthy**. "My
  sword is at 60%" and "my revolver is at 60%" must not feel
  alike.

### A gun is an assembly, not an item

Barrel, action, springs, stock — separately crafted, separately
worn, separately replaceable. Three consequences:

1. **Wear localizes honestly.** Barrel erosion touches the
   **Delivery Profile** (stability, slight energy loss); spring
   fatigue and fouling touch **reliability**; frame wear is the
   **catastrophic** axis. One scalar could not say that;
   components can.
2. **Repair is parts replacement**, not "fix the gun" — so a
   **parts economy** exists (spare springs, replacement barrels)
   and the gunsmith has recurring business rather than a single
   sale.
3. **Hand-fitted vs. pattern parts — the richest seam here.** A
   hand-fitted flintlock's lock belongs to *that gun*; a
   pattern-made revolver's spring fits *any* Pattern 3. Same
   typed-compat machinery as chambering (hard fit,
   `accepts`/`fitsSlot`) at a different **key granularity**: keyed
   to the *instance* vs. keyed to the *pattern*.

**Why (3) matters beyond mechanism: interchangeable parts *is* the
industrialization story**, and here it is mechanically real. It
splits gunsmithing into two viable professions — the **artisan**
(unique parts, fine Grade, collectible) and the **pattern
workshop** (fast, fungible parts) — it gives **proliferation an
industrial cause** rather than an authored one, and it hands the
collector thread its meaning: a hand-fitted piece with a maker's
mark is genuinely a different object from a pattern gun, and the
chattel ledger already knows which is which.

### Grade buys reliability and longevity — never power

A fine gun has tighter tolerances: slower fouling sensitivity,
slower wear, better stability. **You cannot buy more lethal; you
can buy more dependable.** True of real firearms, it keeps the
round as the sole energy authority, and it is precisely the
distinction enthusiasts care about.

### Catastrophic failure stays on the risk rail

A gun can come apart — from an **overcharged handload** (*you*
loaded it wrong), an **obstructed bore** (readable), or a **frame
past its life** (readable at competence). It is the extreme end of
the same ladder as the negligent discharge: **the consequence of
state someone could have read, never a die that betrays you.**

### Ammunition as its own craft chain

Brass recovered and reloaded · bullets cast (mass, material,
`form`) · powder made — with **powder as the launch-regime
chokepoint** already designed, which is now *also* the crafting
bottleneck rather than an arbitrary rule.

## Magic parity

Spells speak the band vocabulary (spark/firebolt at range are
comparable currency, not separate physics); the resist seam already
meets combat at one field. Thrown effect-carriers (above) complete
the triangle: spell, enchanted projectile, thrown vessel — one
effect union, three deliveries.

## Open questions (for requirements)

1. **Negligent discharge & bystanders** — the strongest teacher,
   the most grief-adjacent mechanic; consent/accountability gating
   design needed.
2. **The `elasticity` material property** (bow staves; also
   springs — the second consumer is probably gun mechanisms).
3. **Cross-room fire** — parked entirely; revisit only with a
   consent design.
4. **The placement matrix values** — the aim×answer base table and
   step modifiers are designed above; the exact cell values and
   beat costs are tuning work for requirements (the gym is the
   test bench).
5. **Area arrival scope details** — hazard-creation is the
   mechanism (designed above); splash radius semantics inside a
   single room (whole-room vs. band-adjacent) needs one decision.
6. **Guard content** — the use-of-force behavior spec, the wary
   brain's armed variant, the armory as a venue.
7. **The Practicum range** — where safety education lives
   (state-run at launch; licensing debates get a natural stage).
8. **Suppressors, and other statute-vocabulary fun** — each real
   accessory is a modeled property that law can name; pick the
   launch set deliberately.
9. **Energy weapons** — the old EGunCode split (gun-owns-damage +
   cell-owns-capacity) is architecturally sound and parks cleanly
   on the electricity substrate as a magic/tech frontier note.
10. **Disengagement under fire** — fleeing a swordsman and fleeing
    an archer are different problems; "you can't outrun a bullet"
    needs an answer that is not "ranged is inescapable."
11. **Multi-party ranged** — bands are per-edge: if the archer
    holds `far` from A, what is their band to B, and can one held
    aim cover two approaches?
12. **Reload/span in the tempo economy** — engagement actions,
    interruptibility, and whether a partial reload is a state.
13. **NPC ranged brains** — the wary brain's armed variant; when an
    NPC archer holds vs. looses vs. closes.
14. **Cover authoring guidance** — how much cover a fight "should"
    have, and whether a venue without authored cover reads as
    deliberately exposed (it should).
15. **Overturn mechanics** — which object classes may be flipped,
    the action's beat cost, and whether flipped furniture is
    weaker cover than purpose-built (it should be).
16. **Formation band preference shape** — where the preference
    lives on the role vocabulary, and how a player-facing UI
    surfaces "your formation wants you at `far`" without
    scripting the gambit.
17. **Brain band thresholds** — the withdraw-at-X values per
    doctrine: legible enough to read, not so rigid they are
    trivially exploited (the feint-parity precedent is the
    calibration model).
18. **Morale triggers** — what actually breaks an NPC off (screen
    down, wound band, outnumbered, ammo dry) and whether morale is
    brain-local or a shared combat read.
19. **New-arrival edge band** — what band a newly arriving
    combatant's edges open at (instinct: the arena's max — you
    notice someone entering at distance — but it needs a rule).
20. **N² edge bookkeeping at scale** — melee already carries it,
    but `far` bands mean more participants are meaningfully
    engaged at once; a large-fight profile is worth taking before
    build.
21. **Shoot-into-melee consent check** — the commit-time gate when
    a non-consenting party shares the arena (distinct from the
    accountability trail, which already works).
22. **The readout ladder** — exactly which weapon-state facts
    resolve at which competence band (chambered? count? fouling?
    condition?), and how a novice's reading degrades: vague words,
    absent lines, or a stale last-known value.
23. **Cross-reading** — whether an expert can read *someone else's*
    weapon state (instinct: yes, partially, at close bands — it is
    what makes unsafe handling socially legible and lets a veteran
    warn a novice).
24. **Component granularity** — how many separately-worn parts a
    gun actually carries (barrel / action / springs / stock is the
    proposal; fewer may serve, more will not).
25. **The fouling axis's home** — a `Fouled` mixin parallel to
    `Keen`, or a generalized "serviceability" axis both consume;
    decide before a second consumer appears (armor straps, tool
    edges).
26. **Pattern keys in the chattel ledger** — how a pattern is
    named and registered, since it is simultaneously a crafting
    compat key, a collector fact, and a *statute-nameable*
    property.
27. **The incapacitation consent pass** — NMI/restraint conditions
    are the grief-adjacent twin of damage (being made helpless is
    socially worse than being hurt); the less-lethal family needs
    the same consent/accountability scrutiny as the
    negligent-discharge question.
