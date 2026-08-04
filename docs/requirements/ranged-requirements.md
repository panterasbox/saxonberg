# Ranged combat — requirements

Ranged delivery, uniformly: the thrown flask, the bow, the sling, the
thrown blade, and the gun. One abstraction carries all of them — **a
launcher imparts energy to a projectile that crosses a band gap and
applies a payload on arrival** — so combat, the wound model and the
placement table cannot tell an arrow from a bullet. The build extends
the shipped combat graph rather than replacing it: `ThreatEdge.range`
already exists, rooms already report real metric dimensions, and
`CombatTerms` already carries per-edge consent. Ranged adds bands,
carriers, an aim-versus-answer resolution, cover, and the honest
mechanical vocabulary that lets in-world law name a weapon by its real
properties.

Seeded by [ranged-slate.md](../slates/builds/ranged-slate.md). Three
seams in shipped code were cut in advance for this build and are
adopted here: `HazardDelivery.range` (`'ranged'` reserved),
`MagicLogic.deliverAt` (the documented ranged-integration seam), and
`Potable.route` (declared by the magic-items build precisely so this
one inherits a populated field).

**Scope note.** The seeding slate is 1017 lines and carried 27 open
questions. It was put to the user whether to carve guns into a second
build; the answer was **one build, full slate**. This document
therefore resolves all 27 (two of which the slate had already answered
in its own later sections) plus the two corrections found while
verifying the slate against master.

## Sequencing

This build **starts after the magic-items build merges to master**
(user decision). Thrown effect-carriers consume `Potable.route` and the
item-effect envelope, which today exist only on `build/magic-items`
(18 commits ahead of master, unmerged). Requirements and planning
proceed now; implementation waits on that merge.

## Goals

- **A four-tier engagement ladder** replaces the shipped two-tier one,
  with the reachable tiers in any room **derived from that room's real
  metric extent** rather than authored as an enum.
- **Rooms can differ in size within one cartesian zone** — the single
  named dependency of the whole design.
- **One Delivery Profile contract** that every projectile computes into
  and every downstream consumer (response grid, wound geometry,
  placement) reads, with no consumer able to identify the carrier.
- **Shots resolve deterministically** from two public commitments — the
  shooter's aim ladder against the target's answer — with no dice
  anywhere in the path.
- **The four launcher families feel genuinely different to play**, and
  that difference derives from one field rather than being authored per
  weapon: `energySource` says where the shot's energy is stored, which
  says whether readiness holds for free, which is why a bow's draw *is*
  its aim while a crossbow and a gun aim at leisure.
- **Thrown effect-carriers work**: a flask crosses a gap, the vessel
  breaks by its real material, the contents spill onto real surfaces,
  and the payload fires through the same effect union as every spell.
- **Guns are modelled honestly enough that in-world law can name
  them** — every field a statute would draft against is a real stored
  property, and every consequence derives from state somebody could
  have read.
- **Risk never comes from dice.** Jams, negligent discharges and
  catastrophic failures all derive from accumulated, readable state.
- **Competence buys information and tempo, never accuracy.**
- **Cover exists as authored content**, directional, destructible and
  capacity-limited, distinct from concealment.
- **Armor extends the existing response grid** to projectile energies,
  including the honest conversion of a stopped point into blunt trauma.
- **Sound attenuates over real distance**, so "a gunshot summons the
  world" is arithmetic rather than a special case.
- **NPC ranged doctrine is legible and beatable**, never optimal.

## Non-goals

- **Cross-room fire.** Parked entirely by the slate and kept parked
  (D26). Sight may cross a vista; combat may not.
- **Energy weapons.** The old EGunCode split parks on the electricity
  substrate as a frontier note (slate Q9); nothing ships here.
- **Coordinates, derived position, or intra-room geometry.** Bands are
  per-pair relationships and do not compose. Intra-room "can I see you"
  is concealment, which is shipped.
- **Authored vistas.** The slate's cross-room sight relationships are a
  separate authoring feature; this build neither adds nor needs them.
- **The installed launch regime as content.** The *mechanisms* it needs
  ship (credential-locked firearms, serials-as-chattel, use-of-force as
  behavior spec); the *installed policy* — armed guard patrol density,
  the armory venue, the Practicum range, civilian powder prohibition —
  is content and defers (D28).
- **The accessory catalogue.** Suppressors ship as one worked example
  of a statute-nameable accessory; picking a launch set is content.
- **Capital-M identification of unknown weapons.** Weapon-state reading
  (D22) is a competence readout, not the magic-items identification
  system; the two do not interact.
- **Retiring `MAX_HOPS` for vision and smell.** Sound converts to
  metre-based attenuation (D24); the other two modalities keep current
  behavior and `MAX_HOPS` survives as a perf backstop for all three.

## Surface decisions

### D1 — The band ladder is four tiers: `close` · `reach` · `near` · `far`

`RangeState` today is `"reach" | "close"` — both melee tiers. The slate
proposed appending one band (`far`). That was rejected as too coarse:
with three tiers a thrown knife and a longbow share a tier, and the
room-size derivation collapses to nearly a yes/no.

Four tiers — one melee pair, one ranged pair:

| Band | What it is |
|---|---|
| `close` | the clinch; a dagger or unarmed owns it |
| `reach` | a polearm holds you off |
| `near` | thrown blade, sling, flask, sidearm |
| `far` | bow, crossbow, long gun |

`short` is deliberately **not** used as a band name — it collides with
the shipped `ReachClass = "short" | "medium" | "long"`, which is a
banded projection of a weapon's authored length and a different concept
entirely.

`extreme` stays parked until content proves it (closed-vocabulary
discipline).

**Every existing `RangeState` consumer is audited as part of this
change** — `CombatGraph`, `CombatLogic`, `Gambit`, and the reach-tier
reads in `WeaponProfile`. Growing a closed vocabulary from two to four
is a breaking change to exhaustive switches by design.

### D2 — Bands remain symmetric per pair, and do not compose

`CombatGraph.setRange` writes both directions and is documented as
"physically symmetric"; that is kept. A band is **how engaged are these
two with each other**, not how many metres apart. Per-*pair* asymmetry
across a crowd is therefore expected and correct: A may be `far` from
the archer while B is `close` to the archer and A and B are `close` to
each other. There is no triangle inequality, no composition, and no
derived position. *(This resolves slate Q11, which the slate's own
Multi-party section had already answered.)*

### D3 — The arena caps the ladder, derived from the room's real extent

Reachable bands in a room derive from its linear extent, using the
accessors that already exist and that light and atmosphere already
consume:

| Room extent | Bands afforded |
|---|---|
| ~3 m (the default cell) | `close`, `reach` |
| ~6 m | + `near` |
| ~20 m+ | + `far` |

Thresholds are `AppSettings` dials under `combat.range.*`, following the
shipped `combat.poise.*` convention. A bar fight stays a knife fight by
physics, not by an authored flag, and authored-larger outdoor cells arm
the frontier automatically.

### D4 — Locations gain an optional extent override

The slate's "single named dependency." Cartesian rooms today inherit
`cellSize` from their zone (default 3.0 m), so a cramped shop and an
open hall in the same zone cannot differ. A per-location optional
extent lands, following the existing null-fallback accessor shape:
`this._extent ?? this.getZone()?.getCellSize()`.

It is persistent and authorable. Spherical locations already carry a
per-room `radius` and need nothing.

### D5 — Advance and withdraw are gambits, not a movement verb

Band change is bought with poise and tempo on the shipped gambit
surface — the range-control duel is the poker game, and every advance
is a called bluff. No new verb; `fight advance` / `fight withdraw` join
the existing gambit vocabulary.

### D6 — Withdrawal is per-edge, and the exit is the escape

You disengage from a *specific* threat, so opening distance on three
attackers is three actions and "being surrounded is bad" falls out with
no surround mechanic.

Escape from a ranged attacker is **breaking the engagement, not
outrunning the projectile**: take cover, break perception, or leave
through an exit. Because cross-room fire is out of scope (D26), an exit
is genuinely safe — which makes that non-goal load-bearing rather than
a limitation. A withdrawing target still eats any committed held shot
at its current aim state. *(Resolves slate Q10.)*

### D7 — Resolution is aim × answer → placement, with no dice

The shooter commits to a public **aim ladder**: `snap` (this beat) →
`held` (one beat, visible) → `settled` (two beats, visible, target
telegraphed). Aim decays on movement or band change, and **resets
entirely on a target switch** — aim is a single-target commitment (D9),
so abandoning the target abandons the commitment. No partial carry-over.

The target spends the reactive window on one **answer**: `stand` ·
`move` · `cover` · `drop` · `counter`.

**A target with no available answer takes the worst cell.** Restraint
and incapacitation are reachable states (D19, D20), so a netted or
unconscious target cannot spend a reactive window, and the shot resolves
near-automatically at `precise`. This is honest and grim, and it is the
coup-de-grâce path — so it **routes through the shipped coup governance
(formations hook 3, D38)** rather than inventing a second helpless-target
rule. Making someone helpless and then killing them is one decision the
party policy already has an opinion about.

**Mutual standoffs are broken by tempo.** When both parties hold aim on
each other, the faster tempo resolves first; the slower shot still
resolves, because it was committed, unless the first placement disrupts
it. No initiative roll and no new mechanism — and it keeps D8 honest,
since competence wins the standoff by buying tempo rather than accuracy.

The pair indexes a base matrix yielding a placement class —
`miss` / `graze` / `hit` / `precise` — and modifiers then move steps
along that ladder: poor stability −1, beyond effective band −1, cover
quality −1/−2, plus the shipped motion-degrade rules.

**Matrix cell values and step costs are `AppSettings` dials** under
`combat.range.*` with defaults set in the plan; the *shape* is the
requirement, the numbers are tuning. The gym is the test bench.
*(Resolves slate Q4.)*

**The ladder is shared, but a muscle-held launcher cannot sit at the
top of it.** Because drawing *is* aiming for a bow (D13), stability
**decays past the archer's hold window** — so a `settled` bow shot
becomes *worse* than a `held` one once the window is exceeded. `settled`
is not forbidden to a bow, which would be cleaner and wrong; it is
self-defeating past your skill.

The window is set by competence, which is exactly where the real
archery skill lives: not "can I aim," but "how long can I hold before
it goes." This keeps D8 intact — competence buys tempo, never steps —
and gives archery a commitment decision guns do not have. Crossbows
and guns have no hold window; their `settled` is free.

### D8 — Competence buys tempo and information, never steps

A marksman settles faster and holds aim through minor movement. There
is no flat accuracy bonus anywhere, and competence never gates whether
a weapon fires — the low skill floor is politically load-bearing truth.

### D9 — Aim is a single-target commitment

You can point the weapon one way. A held aim on A does not cover B, and
B advances free. This one rule is why flanking beats cover, why a lone
archer correctly loses to a pair, and why suppression is a choice of
what to deny rather than a blanket.

### D10 — Suppression is a held aim on a zone or exit

Whoever crosses eats the committed shot at its current aim state. The
cost is the poker: a holding shooter has spent their reactive window
and is meat if closed to the clinch.

**Ordering against D6:** the suppression shot resolves **before** the
engagement ends. Holding an exit is precisely aiming at the escape
route, so a fleeing target eats the committed shot on the way out. This
is what gives D6's "the exit is the escape" a real price, and it is the
difference between overwatch mattering and being decoration.

### D11 — The Delivery Profile is a computed value-object

Family fields are causes; combat consumes one derived tuple, computed
per (projectile × launcher × band) and **never stored**:

| Field | What it is |
|---|---|
| `energy` | joules arriving at this band |
| `channel` | the shipped `Channel` vocabulary (`edge`/`point`/`blunt`/`shock`/`heat`) |
| `penetration` | sectional behavior — deep versus wide |
| `stability` | flight quality; steps the placement ladder |
| `payload` | effect envelope, if any |
| `integrity` | deform / break / recover post-hit |

Modelled on `WeaponProfile`: a pure, unit-tested value-object surfaced
as bands with narrow numeric getters the engine multiplies in. Nothing
anywhere stores "damage."

**`integrity` governs recovery, and a spent projectile is abandoned on
landing.** Arrows that survive, spent brass and thrown blades persist in
the room and are recoverable — but they **release their chattel claim**
when they land. Otherwise chattel would flag every battlefield pickup as
theft, which is both absurd and a trap for new players who loot the
arrows that were just shot at them. Abandonment is the honest reading
and it is an act the world already models. Recovery is finders-keepers;
the chain of title records the release, so a distinctive arrow is still
*traceable* even though taking it is not stealing.

### D12 — Fit is hard for guns, graded for archery

Chambering is binary — `accepts`/`fitsSlot`, refusal on mismatch. Any
arrow leaves any bow; spine-match derives a quality factor that steps
stability, never a gate. Machined versus craft tolerances, and quietly
part of the proliferation lesson.

### D13 — Readiness and poise both follow `energySource`

`energySource` is a closed vocabulary: `muscle` · `stored-elastic` ·
`chemical` (`electrical` parked). It is the load-bearing field of the
whole launcher model, because it answers two questions at once: **where
the shot's energy is stored**, and therefore **whether readiness can be
held for free**.

Every launcher has a **readiness ladder**. What differs is who pays to
sit at the top of it:

| Family | `energySource` | Readiness stored in | Holds free? | Aim |
|---|---|---|---|---|
| Thrown | `muscle` | nothing — cocking is instantaneous | n/a | aim *is* the throw |
| Bow | `stored-elastic`, muscle-held | **the archer's body** | **no** — poise every beat | draw **is** aim; one act |
| Crossbow | `stored-elastic`, mechanically held | the spanned mechanism | **yes**, indefinitely | decoupled from readiness |
| Gun | `chemical` | the cartridge | **yes**, indefinitely | decoupled from readiness |

**For a gun and a crossbow, aiming and readiness are separate acts. For
a bow they are the same act** — you cannot hold a bow at full draw
without aiming, or aim without being at full draw, and the draw burns
you down the whole time. This is the honest experiential difference
between the families, and it derives from one field rather than being
authored per weapon.

Two things fall out that would otherwise need inventing:

- **The crossbow's whole tactical point** — a spanned crossbow held on
  a doorway for minutes, paid for with a miserable rate of fire — is
  now a consequence of where the energy sits, not a special case. (It
  is also public state: a spanned crossbow is visibly spanned.)
- **The gun's real advantage is that it does not tire you.**
  Historically why firearms won, and the cleanest balance lever in the
  design. No invented drawback.

Poise cost follows directly: holding a draw is expensive per beat,
holding a spanned crossbow or a chambered gun is free.

**Coming back down the ladder is a real action too.** Letting a bow
down under control is free at competence and fumbles below it. **Dry
firing — loosing a drawn bow with nothing nocked — damages the bow**,
because the energy has nowhere to go but the limbs. That is not a
special rule: it is D35's readable-state rail applied to the launcher a
novice is most likely to abuse, and it costs nothing to model.

### D14 — Splash is the target plus whoever is `close` to the target

Because bands are relationships and not positions (D2), a hazard cannot
sit "at a band" globally. Area arrival therefore resolves
relationally: the flask catches its target, plus anyone whose edge to
*that target* is `close`.

Room-wide splash is rejected (absurd in a 20 m outdoor cell) and so is
any invented radius geometry. "You're not shooting a person, you're
shooting the floor they need" becomes "the splash catches whoever is on
top of your target." The arrival creates a placed hazard through the
shipped self-resolving `HazardMixin`. *(Resolves slate Q5.)*

**The consent gate computes over the splash set, not the target.**
Otherwise the area path walks straight around D18: throwing a flask at a
consenting duelist who is clinched with a non-consenting bystander would
catch the bystander with nothing refusing it. The commit-time check
therefore resolves the full set — target plus everyone at `close` to it —
and refuses if **any** member is a sentient the thrower could not
deliberately target. Area delivery must not be a cheaper route to a
person than aiming at them.

### D15 — `HazardDelivery.range` gains `'ranged'`; `MagicLogic.deliverAt` swaps its leg

Both are documented reserved seams awaiting this build. `HazardRange`
grows from `'contact'` to `'contact' | 'ranged'`, and `deliverAt`
replaces its in-scene-envelope placeholder with the band model, so
offensive spells adopt ranged delivery without touching the spell
roster. Spell, enchanted projectile and thrown vessel become one effect
union with three deliveries.

### D16 — Reload and span are committed engagement actions

They run on the shipped engagement framework, and while reloading or
spanning you are **committed** — the brain does not re-decide
mid-action, following the shipped deferral-discipline precedent. Being
struck interrupts the action, costing the action but not the
ammunition. **Partial state is real**: a half-loaded revolver is an
honest state, and ordered magazine contents are required anyway for the
tracer trick. *(Resolves slate Q12.)*

**One exception, and it derives from D13 rather than being carved:
readiness folds into the shot when it is instantaneous.** Nocking an
arrow is part of loosing it, so a bow has no separate committed
readiness action — the flowing nock-draw-loose is a single `snap`.
Spanning a crossbow and loading a gun are mechanical, so they stay
separate committed actions.

This is what makes rate of fire honest without a stored
`rateOfFire` field: a longbowman shoots many times in the span a
crossbowman manages one, and pays for it in the poise that a spanned
crossbow does not cost. The trade is legible in both directions.

### D17 — A negligent discharge can only strike whoever you could deliberately shoot

The slate's flagged-open question, and the most grief-adjacent mechanic
in the design.

An ND routes through the **same commit-time consent gate** as a
deliberate shot. If terms do not permit you shooting them, the round
cannot strike them — it lands on terrain instead (floor, wall, window).
The accountability row appends **regardless** of what the round hits.

This is honest (a round always goes somewhere), closes the grief hole
completely, and keeps the entire lesson intact against NPCs and inside
consenting contexts, which is where the guard and street content lives.

**The terrain round is not inert — it can damage property, and that is
deliberate.** An inert round makes the fallback pure flavor; a damaging
one means "I cannot shoot you, but I can shoot your storefront" is a
real act. It is allowed, and it **appends an accountability row** naming
the shooter. Grief here is answered by attribution rather than
prevention, because property damage is legible, the parcel and chattel
ledgers already know who owns what, and the owner has a real remedy in
systems that ship. Vandalism a court can hear beats a rule that silently
eats the round.

### D18 — Shooting into a melee is gated at commit time, not only after the fact

The same gate as D17. Where a non-consenting sentient shares the arena,
the check fires **before** the shot commits; the accountability trail
(which already works) is the aftermath, not the protection. A round
landing on an ally goes on the ledger with the shooter's name, so "don't
shoot into a melee" stays an emergent tactical rule. *(Resolves slate
Q21.)*

### D19 — Incapacitation is a new rung on `CombatTerms.lethality`

Being made helpless is socially worse than being hurt. Lethality
already runs a consented ladder; incapacitation and restraint slot into
it as their own rung, so the existing handshake, the `consented: false`
crime marker and derived blame cover the less-lethal family with no new
consent axis and no doubled terms reconciliation. A taser used without
consent is exactly as marked an act as an unconsented lethal blow.

**The ladder is monotone**: consenting to a lethal duel implies
consenting to being incapacitated in it. Stated explicitly because
otherwise every terms reconciliation carries an ambiguity — and because
the alternative (a duelist who may be killed but not netted) is absurd
in exactly the way a ladder exists to prevent.
*(Resolves slate Q27.)*

### D20 — Less-lethal is a payload, never an architecture

An ordinary launcher whose payload targets poise and conditions instead
of wounds. The design refuses the euphemism: **less-lethal, never
non-lethal.**

- **Taser** — tethered, reaching **`near`** (the wires are honest, and
  they are about five metres of it), *both* darts must land, one shot
  then reload; rides the shipped shock channel into incapacitation as a
  condition.
- **Beanbag / baton round** — a projectile `form` of `bag`: high mass,
  terrible sectional density, `blunt`, poise-crushing, wound-light. The
  placement table keeps it honest with zero special rules — `close` +
  `precise` + head is lethal, because that is the real failure mode.
- **Nets and irritants** — a thrown net entangles as restraint at
  **`near`**; sprayed irritants deliver sense-conditions at **`reach`**,
  because a spray is genuinely an arm's-length-plus weapon and not a
  clinch one.

**Band-literal note.** These assignments were re-derived against the
four-tier ladder rather than inherited. The slate wrote every
less-lethal weapon as `close`-only, but it was written against a
two-band model where `close` absorbed everything inside bowshot. On the
D1 ladder that reading makes a taser useless — `close` is the clinch,
where you are already grappling and a shock weapon has no job. Every
band literal in this document is re-derived, not copied.

### D21 — Armor rides the response grid; a stopped point becomes blunt

No new system. Three honest truths the grid must express:

1. **Stab armor is not ballistic armor.** Woven textile catches a
   deforming fast projectile; a slow rigid point slips the weave.
   Arrows defeat vests that stop pistol balls.
2. **Caught is not unharmed.** Armor *converts* `point` to `blunt`, and
   the padding layer underneath decides what that costs in ribs.
3. **Proof marks are literal** — a test-fire dent recorded as a chattel
   event; certification, marketing and collectibility in one mechanic.

Tactically, armor forces the shooter up the aim ladder: snap and held
placements land on plate, only `settled` picks gaps. Armor buys beats,
which is what makes closing under fire viable.

### D22 — The readout ladder degrades by absent lines

Competence buys information, not outcomes. An expert reads *"chambered ·
safety off · four rounds · light fouling"*; a novice reads *"a
revolver."*

| Band | Resolves |
|---|---|
| novice | kind only |
| journeyman | loaded/unloaded, gross condition |
| expert | chambered, count, safety state, fouling, service history |

Degradation is **absent lines** — not vague words, not stale
last-known values. "You do not know" is the honest read, and it makes
the danger genuinely self-inflicted: carrying chambered without
knowing, surprised by an empty gun, missing the fouling. *(Resolves
slate Q22.)*

### D23 — Cross-reading splits: fine state is close work, gross handling carries

Reading someone *else's* weapon is one band worse than reading your own,
but it is not one distance. The band sweep (D20) forced the split, and
it is the more honest model anyway:

| What | Reads at | Why |
|---|---|---|
| **Fine state** — chambered, round count, fouling, condition | `close`, `reach` | you have to be near enough to see the mechanism |
| **Gross handling** — muzzle sweep, finger on the trigger, a drawn bow, a spanned crossbow, carrying chambered | out to `far` | posture is visible across a street |

The split matters because the *social* half of the design depends on
it. If unsafe handling only read in the clinch, nobody could react to
it in time and the norm could never form — a bystander who must walk
into a muzzle sweep to notice it is not a bystander. Gross handling
carrying to `far` is what lets sentries escalate, bystanders move, and
other players say something, which is how range culture actually
enforces itself rather than by the game lecturing.

It also pays off outside combat entirely: a spanned crossbow in a
tavern is public state at any band, so the readiness model (D13) is
socially legible for free. *(Resolves slate Q23.)*

### D24 — Sound attenuates over real metres; `MAX_HOPS` survives as a perf backstop

`AudienceGather` already does real dB attenuation, real door
transmissivity, vacuum blocking and first-hop direction. Two pieces are
unphysical: `MAX_HOPS = 2` (a room count standing in for distance) and
`PER_HOP_TAU` (a flat −20 dB per hop, charging the same whether the hop
crosses a broom closet or a parade ground).

The fix needs no new data — walk the graph accumulating **metres** and
attenuate per metre, keeping the existing dB math and door branches;
`DEFAULT_HEARING_THRESHOLD_DB` does the cutting.

**Correction to the slate**: `MAX_HOPS` lives in
`lib/perception/Modality.ts` and vision, sound *and* smell each guard on
it, with tests asserting its value. This build converts **sound only**
and keeps `MAX_HOPS` as a perf backstop for all three modalities.
Vision and smell keep current behavior; the slate framed this as a
sound fix and under-counted its consumers.

The payoff: a whisper dies in the next room, a shot walks the street and
stops at closed doors, and a suppressor's attenuation is a real number
against a real threshold.

### D25 — Cover is authored, directional, destructible and capacity-leased

Cover is the shield's static cousin — the same covering-stack
membership, occupied instead of wielded. **Cover is not concealment**:
concealment hides you, cover stops the thing. An authored cover object
declares **two** numbers — its concealment contribution (shipped bands)
and its material + construction (the response grid) — and the classic
distinction falls out free.

Three properties keep it from becoming a turtle simulator:

1. **Directional** — flanking beats it, already the shield's documented
   weakness.
2. **Destructible** — a wooden crate splinters under sustained fire and
   a stone wall does not, via the response grid and Durable condition.
3. **Capacity** — an exclusive resource, therefore **leased**, per the
   standing anti-grief rule.

Authored like traps, never ambient: not every table is cover. A venue
with no authored cover reads as deliberately exposed, and that is
correct. *(Resolves slate Q14.)*

### D26 — Cross-room fire stays parked

Sight may cross; combat may not. Universal cross-room sight turns every
exit into a firing lane and would break the per-edge band model and
every consent gate at once, to replace an experience available by
walking downstairs. *(Slate Q3, kept parked.)*

### D27 — Overturning is an author-declared affordance

Furnishings may declare themselves overturnable; flipping is one
engagement beat. Flipped furniture is honestly **weaker** than
purpose-built cover — same material and construction, but no
directional facing advantage and lower capacity. Author opt-in keeps it
deliberate while letting players create cover from the environment.
*(Resolves slate Q15.)*

### D28 — Content is one demonstrator per system; venues defer

The standing rule is systems over content, with NPCs as expensive
just-in-time carves. Ships: one bow with arrows (graded fit), **one
crossbow**, one thrown flask (the potion seam), one sidearm (hard fit,
components), one sentry brain, one cover object, one overturnable
furnishing.

**The crossbow is not optional content.** It is the only demonstrator
of *mechanically held* readiness (D13) — the case that proves the
readiness model is a real axis rather than a bow-versus-gun split. Bow
and crossbow sharing `stored-elastic` while differing on who holds the
draw is the model's sharpest test, and it is cheap: same projectile
family, same graded fit, one extra `spanMechanism` field.

Defers as content: the Practicum range, the armory venue, guard patrol
density, the accessory catalogue, and the installed launch regime.
*(Resolves slate Q6, Q7, Q8.)*

### D29 — The gun field model, and every field is statute-nameable

Store causes, derive effects. Nobody writes "damage" on anything.

**Launcher** — `energySource` (D13); for guns: `action`
(`muzzleloader` · `breech-single` · `revolver` · `repeater-manual` ·
`self-loading` · `automatic`) · `ignition` (`match`/`flint`/`cap`/
`integrated`, orthogonal to action) · `chambering` (typed compat key) ·
`barrelLength` · `feed` (`none`/`internal`/`detachable` +
`feedOrder: stack|queue`) · `capacity` · `fireModes` · `safety`. Bows
carry `limbLength`, `limbThickness` and stave material; crossbows add
`spanMechanism` (`hand`/`stirrup`/`lever`/`windlass`).

**Runtime state, not template** — the readiness ladder of D13 is stored
state, per family. Guns: `chambered`, `safetyOn`, `seatedMagazine`,
`fouling`, Durable condition, `shotsSinceService`. Crossbows:
`spanned`, and the seated bolt. Bows: `strung`, `nocked`, and `drawn`
with the beat count it has been held — the value the D7 hold window
reads. Thrown weapons carry none; readiness is instantaneous.

**Derived, never stored** — muzzle energy, handling, concealability,
reload and span tempo, jam risk, loudness.

**Cartridge** — `case` (spent brass persists and is recoverable) ·
`charge` (`powderMass` × the powder material's specific energy) ·
`primer` · `bullet` (`caliber`, `grain`, `profile`). Derived: muzzle
energy, recoil from real momentum, and **loudness** as an Audible event
that D24 carries rooms away — which is exactly the number a suppressor
modifies and exactly why statutes name it.

**Magazine** — `magKey` · `capacity` · `feedOrder` · mass; contents an
**ordered** glob, which is where the tracer trick lives.

The statute table and the collector table are the same table.

### D30 — Degradation scales reliability for guns, output for blades

Categorically different, and they must not feel alike. A dull sword
cuts worse — smooth, output-scaling. A filthy gun fires the same round
at the same velocity, because **the cartridge carries the energy**;
what degrades is whether it feeds, fires and extracts. Condition does
not make a gun weaker, it makes it **untrustworthy**.

Jams are therefore a **derived condition** — wear, fouling, maintenance
history, rate of fire — never a flat `jam_chance`. A neglected gun is a
*known* risk, visible to `analyze`, a consequence of decisions weeks
old.

### D31 — The fast wear axis generalizes; `keenness` and `fouling` are its instances

`KeenMixin` is today the fast functional axis beside `DurableMixin`'s
slow structural one — "sharpen never touches condition; repair never
touches keenness." Rather than minting a `Fouled` mixin beside `Keen`,
the fast axis **generalizes**: one substrate carrying a per-class label
and restoring verb. Blades sharpen; guns clean. The slate names further
consumers (armor straps, tool edges), and the decision is taken now
because it is cheaper before the second consumer than after. *(Resolves
slate Q25.)*

### D32 — A gun is an assembly of four components

Barrel · action · springs · stock — separately crafted, worn and
replaceable. Wear localizes honestly: barrel erosion touches the
Delivery Profile, spring fatigue and fouling touch reliability, frame
wear is the catastrophic axis. One scalar could not say that. Repair
becomes parts replacement, so a parts economy and recurring gunsmith
business exist. Four is the proposal; fewer may serve, more will not.
*(Resolves slate Q24.)*

### D33 — Pattern keys are a first-class property, keyed to instance or pattern

Hand-fitted parts key to the **chattel instance**; pattern-made parts
key to the **pattern name**. Same typed-compat machinery as chambering
at a different granularity. A pattern key is simultaneously a crafting
compat key, a collector fact and a statute-nameable property, and it is
registered in the chattel ledger. This is what makes interchangeable
parts mechanically real, splits gunsmithing into artisan and pattern
workshop, and gives proliferation an industrial rather than authored
cause. *(Resolves slate Q26.)*

### D34 — Grade buys reliability and longevity, never power

Tighter tolerances mean slower fouling sensitivity, slower wear, better
stability. You cannot buy more lethal; you can buy more dependable. The
round stays the sole energy authority.

### D35 — Catastrophic failure stays on the readable-state rail

A gun can come apart from an overcharged handload (*you* loaded it
wrong), an obstructed bore (readable), or a frame past its life
(readable at competence). It is the extreme end of the same ladder as
the negligent discharge: the consequence of state someone could have
read, never a die that betrays you.

### D36 — Registration is the chattel ledger wearing a legal name

Serials are chattel IDs; a crafted, never-registered firearm is
mechanically a ghost gun. Forensics rides provenance and its honest
limits. A credential-locked firearm (the diegetic smart gun) is the
shipped lock/key/credential substrate — a looted state gun is a brick
with a serial number. The **mechanism** ships; whether any polity
mandates it is policy, never an engine rule.

### D37 — Every edge opens at the arena's maximum band; an ambush opens at `close`

One rule covers both initiation and reinforcement.

**New arrivals** open at the arena's maximum. You notice someone
entering at distance; closing is a real cost for the arriver, and held
aims and suppression get something to do about reinforcements.

**Initiation is the same rule.** A fight opens at the arena's maximum
band — which is the honest default, since there is no position to derive
anything else from and an open challenge starts across the room.

**An ambush opens at `close`.** A successful concealed approach — the
shipped concealment substrate doing the work — is what buys the opening
band, and this is the whole reason a knife-fighter can reach a bowman at
all. It gives stealth a combat payoff that is not a damage multiplier,
and it means the archer's advantage is real but defeatable by the
system already built to defeat it.

Without this rule the ladder has no entry point: an archer would want to
open at `far` and an assassin at `close`, with nothing to arbitrate.
Concealment arbitrates. *(Resolves slate Q19.)*

### D38 — Formation band preference is declared shape, not a fourth hook

A band preference lands on the **role vocabulary** on the Idea, read by
the existing three hooks. It is **advisory for players** — surfaced as
a note, never a scripted gambit — and **directive for NPC brains**,
which is where formations do most of their work. Interception (hook 2)
gains a band verb: redirect the edge *and* close on it.

"Fire from cover" is explicitly **not** a formation instruction — it is
a gambit plus a personal occupancy, and encoding it would rebuild the
wall the formations build refused. Cover stays personal: a formation
may declare intent but must never assign the good spot.

Two presets fall out: `skirmish` (all roles hold `far`, interception
inverts to withdrawal) and `firing-line` (hold band, `called`
allocation, no interception). `vanguard` + ranged is combined arms for
free. *(Resolves slate Q16.)*

### D39 — Four NPC doctrines, legible and beatable

No new brain contract — everything ranged adds is gambit-shaped, and
`combatant` is already invoked directly at the session's decision
points. The governing principle is inherited: **ship legible, beatable
doctrine, never optimal play**, because ranged is where optimal play
becomes unbearable fastest.

| Brain | Doctrine | Its tell |
|---|---|---|
| `archer` | hold band, loose, reload | the predictable reload window |
| `skirmisher` | kite to maintain band | withdraws on a threshold — bait it |
| `marksman` | spend beats settling, take the good shot | committed aim — rush it |
| `sentry` | the use-of-force ladder: challenge → draw → aim → warn → fire | escalation is public at every rung |

**`marksman` is a crossbow-and-gun doctrine, not an archer one.**
Patient settling is only available to a shooter whose weapon holds
itself ready (D13); a bow's hold window makes it self-defeating. The
doctrine is assigned by the NPC's loadout, and `archer` staying on the
flow-and-volley end is the correct read of the weapon rather than a
difficulty tier.

Kiting is governed by two levers already designed: withdrawing costs
tempo and holding a draw costs poise, so a kiting archer exhausts
itself; and band discipline is a tell, so the counter to a kiter is a
feinted advance. Thresholds are per-doctrine `AppSettings` dials,
calibrated on the feint-parity precedent. *(Resolves slate Q13 and
Q17.)*

`sentry` is the politically load-bearing one: use-of-force policy
expressed as a brain, legible on the street, every rung landing on the
accountability ledger.

### D40 — Morale is brain-local

An archer whose screen is dead breaks off; a lone wounded NPC does not
fight to the death. Triggers: screen down, wound band, outnumbered,
ammunition dry. Brain-local rather than a shared combat read, so
doctrines can differ. Morale means **break off**, not surrender — and
most fights ending in someone leaving rather than someone dying is what
protects advancement-at-the-margins. *(Resolves slate Q18.)*

### D41 — Ammunition is tracked identically for NPCs and players

NPCs run arrows and rounds through the same object model, so running
dry is a real state forcing a mid-fight doctrine switch. No
special-casing, and every ranged fight gets a natural arc.

### D42 — `elasticity` joins the material property vocabulary

Bow stave draw weight derives from it; gun spring fatigue is the second
consumer. This adds a **property** to the existing closed material
vocabulary — it does not add materials, which stay a curated set.
*(Resolves slate Q2.)*

### D43 — Verb surface: `throw` is standalone, firing is gambits, loading is `load`

Following the standing preference for subcommands over new verbs, with
standalone reserved for diegetic acts:

- **`throw`** — standalone. Throwing is a diegetic act that works
  outside combat (a rock at a window), and there is no shipped verb for
  it today.
- **Firing, aiming, band change and taking cover** — **gambits** on the
  shipped `fight` surface. They are combat commitments and belong with
  strike/feint/defend.
- **`load`** (device category) with subcommands for span, clear and
  unload — operating a mechanism, which is what the category is for.

**`throw` at a sentient is initiation, and routes exactly as `attack`
does.** The verb existing outside combat must not become a consent
bypass — throwing a rock at a person opens a session and runs the terms
handshake identically to swinging at them, with the same ambush and
consent gates and the same `consented: false` marker when terms are
imposed. Throwing *at* a target and throwing something *away* are
distinct parses; only the former initiates.

### D44 — Guns are honest, and the engine ships no gun law

Kernel neutrality throughout. The engine models guns accurately —
lethal in anyone's hands, state not obvious, discipline being the whole
skill — and draws no line about what a gun may be. Every line is drawn
by in-world law, written against the real fields of D29, and badly
drafted law fails mechanically in public. The design does not make guns
weak, unreliable, or morally marked; respect for the machine emerges
from honesty, not advocacy.

## Constraints

- **No dice on the risk path.** Jams, NDs and catastrophic failures
  derive from accumulated readable state. `Math.random` must not appear
  in resolution, jam, or ND code paths. Value-objects in this area are
  pure and deterministic (the `HazardDelivery` / `Grade` / `Channel`
  precedent).
- **Bands-not-numbers** for every player-facing readout, with narrow
  numeric getters for the engine (the `Poise.band()` doctrine).
- **Store causes, derive effects.** No stored "damage", no stored
  concealability, no stored jam chance.
- **Growing `RangeState` is a breaking vocabulary change.** Every
  exhaustive switch over it must be found and updated; a closed
  vocabulary going 2 → 4 is the point of the discipline.
- **Consent inherits, hard.** Ranged initiation rides exactly the
  ambush and consent gates melee has. No new hole where distance
  launders a non-consensual attack.
- **Module categories.** No free-floating helper modules. New mixins
  land in the `lib/<subsystem>/` that owns the concern — the fast wear
  axis (D31) belongs beside `Keen.ts` and `Durable.ts` in
  `lib/material/`. Anything instanceable lives in `obj/`; `lib/` is
  substrate only, enforced by `pnpm lint:instanceable`.
- **The Api ↔ logic-singleton split is mandatory.** Any new Api face
  pairs with an `obj/api/<X>Logic.ts`.
- **No new per-feature Api.** Ranged is combat; it rides `CombatApi`
  and the existing faces rather than minting a `RangedApi`.
- **Tuning lives in `AppSettings`** under `combat.range.*`, following
  the shipped `combat.poise.*` convention, with seeded literal
  fallbacks so value-objects stay unit-testable without booting
  settings.
- **Anti-grief:** cover is an exclusive resource and therefore leased,
  per the standing exclusive→lease / common-pool→quota rule.
- **Sequencing:** implementation starts after `build/magic-items`
  merges to master.

## Acceptance criteria

1. `RangeState` is `close | reach | near | far`, and every existing
   consumer compiles and is tested against the widened vocabulary.
2. Bands stay symmetric per pair; a test asserts a crowd can hold
   geometrically impossible band combinations without composition.
3. Reachable bands in a room derive from its extent, with thresholds
   dialed in `AppSettings`; tests cover the 3 m / 6 m / 20 m cases.
4. A location may override its extent; absent an override it falls back
   to the zone's `cellSize`. Persistent and authorable.
5. `fight advance` / `fight withdraw` change the band at a poise and
   tempo cost, and are refused past the arena cap.
6. Withdrawal is per-edge; leaving through an exit ends the
   engagement; a committed held shot resolves against a withdrawing
   target.
7. The aim ladder is public state, visible to other combatants, decays
   on movement or band change, and **resets entirely on a target
   switch** — no partial carry-over.
8. Aim × answer resolves to a placement class deterministically; no
   `Math.random` on the path. Tests cover every matrix cell and each
   step modifier.
9. Competence changes settle time and readout resolution only —
   a test asserts identical placement outcomes across competence bands
   for identical commitments.
10. A target with no available answer — restrained, unconscious — takes
    the worst cell, resolving near-automatically at `precise`, and the
    kill routes through the shipped coup governance (formations hook 3)
    rather than a second helpless-target rule.
11. A mutual standoff is broken by tempo: the faster shooter resolves
    first, the slower committed shot still resolves unless disrupted.
    No initiative roll exists.
12. A held aim covers exactly one target; a test asserts the second
    attacker advances free.
13. Suppression resolves the committed shot against whoever crosses,
    and a suppression shot held on an exit resolves **before** the
    fleeing target's engagement ends.
14. `DeliveryProfile` is a pure, unit-tested value-object; a test
    asserts the wound path cannot distinguish an arrow from a bullet at
    equal profiles.
15. A spent projectile persists in the room, is recoverable, and
    **releases its chattel claim on landing** — picking up an arrow that
    was shot at you is not theft, and the chain of title records the
    release so the arrow stays traceable.
16. Gun chambering refuses on mismatch; arrow spine derives a stability
    factor and never gates.
17. Shooting a bow costs poise; firing a gun does not — asserted by
    `energySource`.
18. Every launcher family carries the readiness state its
    `energySource` implies: guns `chambered`/`safetyOn`/
    `seatedMagazine`, crossbows `spanned`, bows `strung`/`nocked`/
    `drawn` with a held-beat count, thrown weapons none.
19. A spanned crossbow and a chambered gun hold readiness indefinitely
    at no poise cost; a drawn bow charges poise every beat held.
20. A bow's `settled` stability decays past its holder's competence
    hold window, so a shot held too long is measurably worse than a
    `held` one. Crossbows and guns have no hold window. A test covers
    the crossover point.
21. A bow's nock-draw-loose resolves as a single `snap` with no
    separate committed readiness action; spanning a crossbow and
    loading a gun remain separate committed actions. No stored
    `rateOfFire` field exists — rate of fire is a consequence.
22. Letting a bow down is free at competence and fumbles below it; dry
    firing damages the bow via the readable-state rail.
23. A thrown flask crosses a band gap, breaks by its vessel material,
    spills its contents onto the room, and fires its payload through the
    effect union.
24. Splash catches the target plus everyone at `close` to the target,
    and nobody else.
25. The commit-time consent gate computes over the **whole splash set**,
    not just the target, and refuses if any member is a sentient the
    thrower could not deliberately target. A test covers the
    consenting-duelist-clinched-with-a-bystander case.
26. `HazardRange` accepts `'ranged'` and the hazard path reads it.
27. `MagicLogic.deliverAt` uses the band model; offensive spells gain
    ranged delivery with no change to the spell roster.
28. Reload and span are committed engagement actions; being struck
    costs the action, not the ammunition; partial load state persists.
29. An ND cannot strike a sentient the shooter could not deliberately
    shoot; the round lands on terrain instead; the accountability row
    appends in both cases. Tests cover both branches.
30. A terrain round may damage property and appends an accountability
    row naming the shooter — it is not inert.
31. Shooting into a melee containing a non-consenting sentient is
    refused at commit time.
32. `CombatTerms.lethality` carries an incapacitation rung; an
    unconsented taser produces the `consented: false` crime marker. The
    ladder is **monotone** — consent to lethal implies consent to
    incapacitation, asserted by a reconciliation test.
33. Taser reaches `near` and requires both darts; a thrown net reaches
    `near`; sprayed irritants reach `reach`. A beanbag at `close` +
    `precise` + head is lethal with no special-case rule.
34. Armor converts a stopped `point` to `blunt` and the padding layer
    resolves the trauma; a test covers textile-stops-bullet /
    bodkin-slips-textile.
35. The readout ladder omits lines the reader's competence cannot
    resolve — no vague words, no stale values.
36. Cross-reading splits by distance: fine weapon state (chambered,
    count, fouling) reads at `close`/`reach`; gross unsafe handling
    (muzzle sweep, drawn bow, spanned crossbow) reads out to `far`, so
    bystanders and sentries can react before the clinch.
37. Sound attenuates per metre through the exit graph; a whisper dies
    next door and a gunshot carries until the accumulated attenuation
    crosses the hearing threshold. `MAX_HOPS` survives as a perf
    backstop and vision/smell behavior is unchanged.
38. Cover is authored, joins the covering stack while occupied, is
    directional (flanking defeats it), destructible via the response
    grid, and capacity-leased.
39. Overturnable furnishings flip in one beat and are measurably weaker
    cover than purpose-built.
40. Jam risk derives from fouling, wear, service history and rate of
    fire; no flat chance constant exists in the codebase.
41. Barrel / action / springs / stock wear independently and route to
    their documented consequences.
42. The fast wear axis is generalized; `keenness` and `fouling` are its
    instances, sharpen and clean its restoring verbs, and neither
    touches structural condition.
43. Pattern keys register in the chattel ledger; hand-fitted parts key
    to an instance and pattern parts to a pattern name.
44. Grade changes reliability, wear rate and stability — never energy.
    A test asserts equal muzzle energy across grades.
45. `elasticity` exists as a material property with bow staves and gun
    springs as consumers.
46. `throw` ships as a standalone verb usable outside combat; firing,
    aiming, band change and cover are gambits; `load` and its
    subcommands operate the mechanism.
47. `throw` at a sentient opens a session and runs the terms handshake
    identically to `attack` — same ambush and consent gates, same
    `consented: false` marker on imposed terms. Throwing *at* and
    throwing *away* are distinct parses.
48. Formation role vocabulary carries a band preference — advisory for
    players, directive for brains. `skirmish` and `firing-line` presets
    exist. No fourth formation hook is added.
49. Four ranged brains ship with dialed thresholds; each has a
    documented, testable tell. `marksman` is assigned by loadout and is
    a crossbow-and-gun doctrine.
50. Morale is brain-local and breaks an NPC off on screen-down, wound
    band, outnumbered, or ammunition dry.
51. NPCs deplete ammunition through the same object model as players.
52. Every edge — new arrival *and* initiation — opens at the arena's
    maximum band, except that a successful concealed approach opens at
    `close`. A test covers the ambush case defeating an archer's
    band advantage.
53. A large-fight profile is taken at N=8 and N=16 participants, with
    the result recorded in the subsystem doc and no pathological
    blow-up in edge bookkeeping. *(Resolves slate Q20.)*
54. One demonstrator per system is live-driveable: a bow, a crossbow, a
    thrown flask, a sidearm, a sentry, a cover object, an overturnable
    furnishing. Each verified by driving, not only by suite. **The bow
    and the crossbow must read as different weapons to play**, not as
    one weapon with different numbers.
55. `docs/subsystems/ranged.md` exists and is the source of truth;
    `combat.md`, `hazard.md`, `magic.md`, `materials-response.md`,
    `crafting.md`, `chattel.md`, `concealment.md` and `perception.md`
    are updated at their seams.
56. `pnpm build`, `pnpm test`, `pnpm lint` and the lint family
    (`lint:gates`, `lint:instanceable`, `lint:imports`,
    `lint:module-scope`, `lint:boundary`) all pass.

## Cross-references

**Seeding slate**
- [ranged-slate.md](../slates/builds/ranged-slate.md)

**Load-bearing subsystem docs**
- [combat.md](../subsystems/combat.md) — sessions, poise, gambits,
  terms, `CombatGraph`, `CombatTerms`
- [combat-formations.md](../subsystems/combat-formations.md) — the
  three hooks, role vocabulary
- [materials-response.md](../subsystems/materials-response.md) —
  `response = f(mechanism, material, construction)`, the `Channel`
  vocabulary
- [hazard.md](../subsystems/hazard.md) — `HazardMixin`,
  `HazardDelivery` and its reserved `range`
- [magic.md](../subsystems/magic.md) — the effect union,
  `MagicLogic.deliverAt`
- [concealment.md](../subsystems/concealment.md) — the bands cover
  contributes to; cover-versus-concealment
- [behavior.md](../subsystems/behavior.md) — brains as modules, the
  `combatant` decision points
- [crafting.md](../subsystems/crafting.md) — Grade, `DurableMixin`,
  `KeenMixin`, the two-axis model
- [chattel.md](../subsystems/chattel.md) — serials, chain of title,
  pattern registration
- [credential.md](../subsystems/credential.md) — the credential-locked
  firearm
- [accountability.md](../subsystems/accountability.md) — the harm
  ledger, derived blame
- [perception.md](../subsystems/perception.md) /
  [senses.md](../subsystems/senses.md) — `AudienceGather`, `MAX_HOPS`,
  Audible push
- [location.md](../subsystems/location.md) /
  [zone.md](../subsystems/zone.md) — room extent, `cellSize`
- [activity.md](../subsystems/activity.md) — engagement actions for
  reload and span
- [furnishing.md](../subsystems/furnishing.md) — overturnable
  furnishings

**Related requirements in flight**
- [magic-items-requirements.md](./magic-items-requirements.md) — D17
  defers thrown delivery, splash and vessel breakage to this build and
  ships `Potable.route` for it. **This build starts after that one
  merges.**

**Related slates**
- [enforcement-slate.md](../slates/builds/enforcement-slate.md) — the
  general enforcement machinery gun policy rides
- [policing-slate.md](../slates/builds/policing-slate.md)
- [combat-slate.md](../slates/deferred-rpg/combat-slate.md) — the parent
  combat design, whose Thesis 1 refused geometric/ballistic ranged and
  made range a per-edge relationship
- [combat-experience-slate.md](../slates/deferred-rpg/combat-experience-slate.md)
  — poker-not-slots, NPC ≈ PC
