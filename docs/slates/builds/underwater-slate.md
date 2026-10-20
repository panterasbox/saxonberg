# Underwater slate — water you can be in, and what it does to you

> **Status: UNBUILT** — redesigned 2026-10-18 in one session with the
> founder, over the September exploration draft (whose audit, § 8a there,
> is kept below where it still holds). Nothing underwater exists: swimming
> is at the surface only (maritime), and the ice build's `Pool` has an
> abstract `bed:` prop. Companion: [river-slate](./river-slate.md).
> **Left:** water as a STATE of any place (a mixin; `Pool` the class
> retires) with `water: { of, depthM }` · the column Warren and its bands,
> the bed band replacing the `bed:` prop · the craft size rule · breath as
> store ÷ burn with two clocks · the blackout, neutral depth and the
> rescuable dying clock · descent, equalizing and `drop belt` · the medium
> as PROPERTIES and the census's twelve seams (no validator) · underwater
> combat · the lifeline · the bell mixin · the hard-hat suit and the bends ·
> tides from the shore, tidal streams, the surf · life across the tree (the
> five findings) · sealants, sponges, insulation · `/trade/diving` · and,
> marked LEAN, the tank, the submersible and domes
> **Size:** a build — the water place first; the river, craft and the
> harvest are later builds (§ 17)

**Sits on:** [respiration.md](../../subsystems/respiration.md) (the drain,
the worn supply, the water-breather inversion) ·
[location.md](../../subsystems/location.md) (the **Warren**) ·
[expanse.md](../../subsystems/expanse.md) (the frame, sea state, bands that
set you, the Ship) · [watershed.md](../../subsystems/watershed.md) (the
water's rows, the memoized reads, ice) · [ground.md](../../subsystems/ground.md)
(every Location's floor) · [thermal.md](../../subsystems/thermal.md) ·
[light.md](../../subsystems/light.md) · [combat.md](../../subsystems/combat.md)
+ [ranged.md](../../subsystems/ranged.md) · [mortality.md](../../subsystems/mortality.md)
(the rescuable `dying` clock) · [assembly.md](../../subsystems/assembly.md)
(parts and wear) · [fishing.md](../../subsystems/fishing.md) (the derived
fishery, habitat) · [arcane-science.md](../../arcane-science.md) ·
[boundary.md](../../subsystems/boundary.md) (the two-anchor object).

Markers: **[DECIDED]** with the founder · **[LEAN]** documented, the
founder holds no strong view (*"this stuff is so far out… but it's good to
document what we have"*) · **[PARKED]** its own conversation.

---

## 0. How this was decided, and what it replaces

The September draft was written as an exploration slate before maritime
and the ice build put water in the game. The founder: *"most of this is
placeholder though and never got an actual conversation."* Three of its
pillars did not survive the conversation:

| September | 2026-10-18 | why |
|---|---|---|
| the column is a lane of **band-zones**, the ascent a logistics **Journey** | the column is a **Warren** of real band rooms; vertical moves are ordinary traversal | ⭐ *"how do parties stay together?"* — co-presence in this engine IS the room; a depth-as-a-position model (tried first in this session) would have needed a depth filter in every channel |
| `depth` on a zone, `up`/`down` derived | `depthM` below the water's datum on the place; vertical links are exits the Warren supplies | zones have no relative geography; *"this sounds like the exit graph by another name, and if it needs dynamism that's what Warrens are for"* |
| a **medium affordance table** of which verbs work | **properties** on a `Medium` row, read by each subsystem's own physics | a verb list is unbounded and fails open; the census (§ 5) found the failures CLUSTER on a dozen seams |

And one class was reopened rather than assumed: **`Pool`**, designed inside
the ice work and never examined for general swimming (§ 2).

⚠ Lesson for whoever designs next, from the session itself: **a shipped
design that never had its own conversation is not settled.** Rivers and
`Pool` were both treated as solved and both were reopened.

## 1. What this is **[DECIDED]**

Underwater content operates on the same terms as content above water —
rooms, exits, brains — and **Atlantis is in bounds**. Two layers, split by
the namespace test (*is it true whether or not anyone participates?*):

- **The physics is `/system/water`** and kernel seams: water as a state,
  the column, the body, the medium, buoyancy, tides. Rivers flow and people
  drown with nobody employed.
- ⭐ **Diving is a trade, `/trade/diving`** (§ 11) — practised and
  quittable. It owns gear, a discipline and services, and **no resource**:
  it is the alternate SITE for RGOs that already exist. *"Diving as a means
  to an end"* (2026-10-08) and *"diving is its own trade with its own
  content pack"* (2026-10-18) are both true at different layers.

## 2. ⭐⭐⭐ Water is a state, not a class **[DECIDED]**

**`Pool` the class retires** (or survives as a thin default row for "a
still water room"). Its mechanism moves onto **a mixin any Location
composes**, and whether a place is water *right now* is derived.

Kept from `Pool`, because it was right:

- the floor IS the support state — the water's surface, ice, or ground —
  and holding its slot is standing on it; no per-occupant flag;
- you swim iff you are in the water; a body in the water leaves by swimming;
- ⭐ the build-4 principle, generalised: **a phase change never creates or
  removes space.** Nor does a tide, a flood or a dive. What changes is what
  is underfoot, and what you are in.

What a place declares:

```yaml
water: { of: /stuff/idea/Watercourse/hollowmere, depthM: 4 }
# of: a still water · a river position (river-slate) · a sea node
# depthM: the floor's depth below that water's DATUM; negative = normally dry
```

- **The datum** is the water's normal level — mean sea level, a mere's
  summer level, a river's normal stage. A tidepool is `depthM: -0.5`; at a
  +1.5 m tide it is a metre deep.
- **The current medium derives** from the water's level now + `depthM`:
  dry · wading (up to about the chest) · swimming at the surface · a
  **column** below if deeper still · or frozen, the floor the ice sheet.
- **A derived room** (a band, a river stretch) takes `of` and depth from the
  Warren that budded it; it authors nothing.

**The read follows the place's ref to its water** — load-on-use, never a
reverse index. The level is a pure function of (water, time), **memoized
per weather segment** (the flow memo, the ice memo's sibling), with a
**sync peek** on hot paths (entry, `look`, support) warmed by an async read
— build-4's `iceAt` / `iceAtSync` pattern. Nothing pushes the level into
rooms: actors re-read it, an **immersed body re-reads it on its own
respiration/thermal beat** (which is how a rising tide reaches you), and an
unobserved room reconciles on load.

⚠ **The water place must be a water SOURCE** (`ShoreMixin`'s role) — the
census found `wash`, `rinse`, `cool`, `steep` refuse a diver surrounded by
the sea.

## 3. ⭐⭐⭐ The column **[DECIDED]**

> **Any water place deeper than a body can stand in has a column beneath
> it**, budded by a column **Warren** keyed to that surface place, from
> the water's numbers at that point.

- **Bands come from the water, never from feet:** the surface · the lit
  layer (to where clarity kills the light) · in still water the thermocline
  when the season sets one · the dark · **the bed**. A 4 m mere is surface +
  bed; a deep sea node five at most. Each band is a water place citing the
  same water at the band's `depthM`.
- **The bed band's floor is ground** — ground's own floor, which later
  carries the RGO cover — and it **replaces the ice build's `bed:` prop**.
  What sinks goes to the bed band.
- **Sideways at depth follows the surface's water exits**, copied by the
  Warren — dive at the north cell, walk the bed south, surface in the south
  cell, whatever zone it is in.
- **Authored rooms below are external neighbours** (the Warren's own test:
  their existence does not depend on its policy) — a wreck, a reef,
  Atlantis's airlock, joined by ordinary exits.
- **A band can appear or vanish** as the depth changes; the Warren reaps an
  empty one.
- **In a river the current carries on at depth** (river-slate).
- **At sea the column is keyed to the node**, from the expanse's `depthM`
  and bottom. ⭐ **Between nodes there is no column** — as on the surface, a
  body in the open field is always aboard a craft.
- **Under ice** the sheet is the surface place's floor and so the column's
  **ceiling**; the hole is the only `up`.
- A party is together by sharing a band room.

### The craft size rule — everywhere

> ⭐⭐ **A small craft is a Thing inside the water's room; a big one is its
> own Location, positioned in the water's frame, touching the water's
> rooms only through crossings resolved at the moment you cross.**

A canoe is in the stretch room with the swimmer; a sternwheeler is beside
it (river-slate). A two-man bell is in the band; a caisson is a Location
positioned in the column whose open mouth is an exit to the band at its
depth. Never a Location inside a Location.

### Kept from September

- **Implicit up**, unless a place declares a ceiling; a ceiling place must
  reach air by authored exits, and a gate proves it.
- **Ascent is never gated on skill — only on breath and ballast.** It puts
  the skill in **yield per breath** rather than survival: a trade where
  competence decides whether you drown is a death-check; one where it
  decides how much you bring up is a job.
- ⚠ **A band is not standable; its BED is** (`noDefaultFloor: true` on every
  non-bed band) — the ground build's retrofit, and the census's posture fix
  (§ 5).

## 4. The body **[DECIDED]**

### Breath — store ÷ burn, and two clocks

Replaces respiration's fixed `INHALE_HOLD_SEC`:

- **the store** — lung volume from stature and the body plan;
- **the burn** — work, through the same `exert({powerW})`: kicking for the
  bottom burns several times what hanging still does;
- **conditioning** — the `wind` slow stock, finally driven hard;
- **cold** — the dive reflex slows the burn.

⭐⭐ **Two clocks, and only one is felt.** The **urge** (CO₂) is what you
feel — discomfort → urgency → desperation, in the character's voice; it
does not kill you and you can push through it. The **oxygen** you do not
feel; at zero you black out without warning. ⭐ **Hyperventilating** delays
the urge and adds no oxygen, so the warning comes after the blackout —
**shallow-water blackout**, derived. ⛔ **No forced ascent** (EotL's panic
reflex is the engine doing the player's job); going up is your decision.

### After the blackout

- **Neutral depth.** Lung air compresses with depth (Boyle), so a limp body
  above its neutral depth drifts up — face-up and clear it may breathe
  again — and below it sinks to the bed. In a river the current carries it.
- **The dying clock.** Underwater asphyxia enters **mortality's rescuable
  `dying` clock** rather than respiration's fixed `ANOXIA_LETHAL_SEC`;
  **cold lengthens it**. Unconsciousness comes minutes before death — the
  most rescuable death there is.
- **Rescue is getting them to air, then treatment** — a buddy in the band,
  the tender on the line.
- ⭐ **Secondary drowning**: water in the lungs is a harm condition that
  worsens hours later. A rescue is incomplete, not binary.
- **The three voices** (content-craft § 2): the character goes calm; the
  narrator appraises what the character cannot. *Drowning is the case that
  proves the three-voice model load-bearing.*
- ⚠ From the ice build's live walk: a body going under in the cold must be
  **TOLD** it is. The cold clock needs a felt voice the way the urge has one.

### Moving up and down

- **Band traversal timed by power against net buoyancy.** Ballast takes you
  down fast; what you carry fights you up — underwater `LoadBearing` reads
  **net negative buoyancy** (*a bag of shells is nothing; one ingot is an
  anchor with you attached*).
- **`drop belt` never fails — and costs the stone** unless it is on its own
  line (the tender hauls it back), so the cheap dive loses gear.
- ⭐ **Equalizing caps the descent.** Descend faster than you can equalize
  and you get **squeeze** — pain, then a burst eardrum (vertigo,
  self-limiting). Competence raises the cap. September's lean of "no
  pressure harm at breath-hold" is reversed: it is the trade's *you have to
  be taught* moment, and it buys bottom time, not survival.
- Sideways along the bed is ordinary movement on the same breath clock.

⛔ **Body composition never surfaces as a number** (kept from the audit, as
a prohibition): fat floats, muscle sinks, and the moment it reads as a
ranking body type is a productivity stat.

## 5. ⭐⭐⭐ The medium — properties, not a verb list **[DECIDED]**

A `Medium` row carries **physical properties** — density, thermal
conductivity, how sound carries, whether it supports combustion, light
attenuation and colour transmittance per metre, breathability — and the
water's own row supplies per-water numbers (clarity, temperature, salinity,
dissolved oxygen). Vacuum and smoke are later rows on the same shape.

⛔ **No `isNotUnderwater` validator.** Every verb author would have to
remember it, forgetting fails open, it is wrong for half the verbs (`get`,
`look`, `swim`, `fit`, `write` on a slate) and it puts the decision in the
controller. **A refusal belongs to the mechanism the verb uses**, in that
mechanism's words.

⭐ **`Vocal` is the one chokepoint for anything that needs a mouth** —
`say`, `shout`, `cast`, reading a scroll aloud, a regulator in your mouth
(EotL's tank mutes you) — and it asks **apparatus × medium**, *can this
body's voice carry here*: a merfolk voice carries underwater, a human one
does not (§ 15).

### The census — this section's acceptance list

Run statically 2026-10-18 over **281 command views** (tables in the
session's scratchpad; to be re-run live in a band room at build). **Zero
verbs are refused underwater by physics today**; ~120 wrongly work. They
collapse onto these seams, and the drive proves the list empty:

1. ⭐ **No "this place is water" read exists** — respiration infers
   immersion its own way; nothing else reads the place. § 2's mixin.
2. **Fire burns underwater.** `BiomeApi.airShareOf` is 1 − Σ concentrates,
   so a water place reads 1.0; a furnace's light checks fuel only. One read
   moves ~20 verbs (forge, smelt, cook, bake, char, kiln, bellows, `cast`,
   `zap`).
3. **Immersion does not wet** — only dousing and electricity push `wet()`.
   One immersion-wets-on-entry rule fixes paper, ink, salt, tinder, bandages.
4. **Objects cool as in air** — only bodies get water's conductivity; hot
   work survives (`hammer`, `quench`, `gob`, `shape`).
5. **An open vessel is not full of the medium** (`pour`, `fill`, `mix`,
   `stir`, `dye`, `tan`) — and the mirror: the water place is not a source
   (`wash`, `rinse`, `cool`, `steep` wrongly REFUSED).
6. **Speech ignores the medium** — `VocalMixin` emits unconditionally,
   `talk` and `pilot` bypass `Vocal`, sound is blocked only by vacuum.
7. **The airway is never consulted** — `eat`, `drink`, `sip`, `dose`,
   `smell`, `taste`, `blow`.
8. **No drag** — combat, ranged, every swung tool (`hew`, `fell`, `rive`,
   `plough`).
9. **Posture and floor** — `sit`, `kneel`, `dig`, `plant`, `ditch` work in
   mid-water; § 3's floorless bands fix most.
10. **Sight has no attenuation or colour filter** — `look`, `search`,
    `survey`, `sense` should degrade.
11. **An exit with no `media` admits walking anywhere** — the gate must read
    the destination's medium (maritime's far-side rule).
12. **Small cases** — `fish` with a rod while submerged (`reachAt`
    resolves the reach); `splice`/`sever`/`switch` miss shock; `order` is
    speech; `hail` from below.

Plus **#94** (filed): `inhale` refills a held breath while immersed — the
one exploit the census found.

What the census confirmed should work: traps (*"a trap full of water"*),
`release`, `sample` (sediment), `dig` on the bed, `harvest` as shellfish or
kelp, and money (the implant).

### What the properties give, when wired

| underwater | from |
|---|---|
| no fire, no lamp, no forge | combustion's air share (seam 2) |
| no speech; sound carries far and **without direction** | `Vocal` and the medium's sound property |
| sight to turbidity; **red goes first, blood looks black** | attenuation + `Colour` transmittance (the glass build) |
| cold as a clock | conductivity, ~25× air |
| spears work, swords do not | drag (§ 6) |
| shock catches everyone touching the water | electricity's conduction spread (shipped) |
| no rest | no standable floor off the bed, and the breath |
| heavy things become movable | buoyancy — *the medium that takes your tools away hands you a crane* |

**Communication is content**: line signals (§ 7), hand signs to someone in
sight, and **a slate and grease pencil** — `write` works on the right
surface.

## 6. Combat **[DECIDED]**

The shipped frame holds — session, poise, gambits, tempo, terms, morale. No
new combat system; the physics feeds it, and one thing becomes central:
**the fight is about air.**

**Coordinates are the author's choice**: `Location` for a
gridded reef; `SphericalLocation` — exists, positions by focus and
radius, *no implicit adjacency, every exit explicit* — for a column, a
dome, a city under one. A column's exits are `up` and `down`, derived
from depth. `lint:locations` is satisfied either way.

- **Drag in the weapon profile.** A weapon is already a derived bundle from
  form × material × mass × length; water adds the **area presented along
  the motion**. Swung edges and clubs collapse (energy ∝ v²); **thrusts
  survive** — spears, daggers, harpoons. Thrown weapons die within a metre;
  a bow will not fire; a speargun fires short range through ranged's
  `energySource`.
- **Footing in poise.** A swimmer has none — push someone and you push
  yourself away. Poise is low and hard to buy back; **grappling
  dominates**. The hard-hat diver in lead boots *has* footing on the bed.
- **Visibility caps range** beside the room's real size: in murk every fight
  opens at `close`.
- ⭐ **`subdue` underwater is holding someone under** — the same gambit, its
  consequence changed by medium (lens 5: no new verb). A crocodile's death
  roll is the species form, a natural attack that is a hold.
- ⭐ **Morale reads the urge.** At its peak a fighter breaks for the surface;
  the one with more breath wins by not letting go. And **a drowning person
  panics and grabs the nearest body** — the rescuer — which is why
  lifeguards approach from behind, falling out of morale, not a script.
- **`disarm` widens to any worn or held thing** — the mask, the regulator,
  the hose, the line. Cutting a hard-hat diver's hose kills him slowly.
- **Blood carries** — a scent plume on the current, and anything whose
  apparatus smells blood in water comes (§ 15).
- **Onlookers cannot shout a fight down**; they intervene physically or not
  at all.

## 7. Gear and epochs **[DECIDED]** except where marked

Each rung changes **what the water is to you**:

| rung | epoch | practical depth | the water is | it kills you by |
|---|---|---|---|---|
| **breath-hold** | medieval and before | 10–30 m (Statti, 1913: ~80 m) | a place you visit | **staying** |
| **the bell** | early modern (bells are ancient) | tens of metres (Halley ~18 m) | a place you work from | the air fouling |
| **pump and helmet** | 1830s → | ~50–60 m on air | a place you work in | **ascending wrong** |
| **tank** [LEAN] | 1940s → | as helmet on air | a place you inhabit | running out far from up |
| **submersible** [LEAN] | 1930s → the trench | the hull's rating | a place you look at through a window | implosion — the one death with no clock |

⭐ **Light is not the pre-industrial depth limit; pressure physiology is.**
Below ~200 m any water is dark, and only the submersible goes there with its
own lamps. What blinds a medieval diver is **clarity** (an estuary can be
black at 3 m) and **enclosure** (a wreck's hold, a cave, a dome). Light
underwater before electricity: the sun, bioluminescence, a lamp *inside a
bell* (which burns the bell's air), and magic.

Rider kept from the audit: **the author chooses the depth; depth is what the
ladder buys.** Atlantis reachable by a medieval diver means Atlantis is
shallow, not that depth is cheap.

### The lifeline

**A boundary two-anchor object** (the door/window/bridge shape) whose diver
end **moves with the diver**: fixed at a boat, a bank, a hole's edge or a
bell; a real **length** (depth plus distance sideways — the leash). It
affords **`haul`** (the tender raises the body band by band at the tender's
power — the rescue for a diver who cannot act), **`tug`** (line signals, a
tiny agreed vocabulary, carried by the rope regardless of the medium — one
rope carrying the air, the safety and the only channel) and **following it
back** (under ice the only way to the hole). Lines **foul** on what the
bands along their path contain — a snag, wreckage — and hauling then fails
until someone clears it.

### The bell

A container of trapped air, **not a vehicle** — an upside-down bucket on a
crane. ⭐ **A mixin, like `Exitable`, on either host**: a Thing for the
two-man bell (co-present with the diver outside), a Location for the
caisson, the habitat, Atlantis's airlock (the craft size rule). The mixin
owns the **air stock** — compressing with depth so the water rises inside
(Boyle), **fouling** with each breather's CO₂ at their exertion rate (the
fire build already counts CO₂ against breathable share), refreshed by
**Halley's weighted barrels** (1690s) and later the pump — the **waterline
inside**, and the **position in the column**, changed by `haul` on its
cable. Respiration already breathes the nearest container that holds a
medium, so a body inside breathes its air. Lose the cable and the bell is a
sinker with people in it, alive exactly as long as its stock.

### The hard-hat suit

The standard diving dress — copper helmet, canvas dress, lead weights and
boots, a hose to a hand pump on deck (*"those suits that look like Big
Daddies from Bioshock"*). Helmet, dress and boots are **wearables**; worn
together they are a closed air system on **respiration's worn-supply path**
(`AirTank`'s), whose source is **the hose** — a second line on the
lifeline's shape. **The pump is a crewed device**: stop cranking and the
`supply` drain starts. **You walk the bed** — too heavy to swim; the reverse
of the free diver. Ascent is **hauled**, on the crew: the invariant holds.

- **Squeeze** — the pump stops and the helmet has no **non-return valve**:
  the pressure drives the diver up into the helmet. The valve is a part
  (assembly); a suit without it is a different, deadlier suit.
- **Blow-up** — too much air inflates the dress and shoots you up: the bends
  plus embolism. The exhaust valve is yours, and managing it is the skill.

### The bends and narcosis

⭐ **A hidden gas load**, as contamination is a silent population. Breathing
compressed gas at depth, tissues take on dissolved gas with depth × time and
release it with time at lower pressure — **Haldane (1908)**, a few
compartments with half-times. Ascend faster than it leaves and it becomes
**decompression sickness**, a harm condition reconciled on read, **after**
you surface (joints → neurological → fatal). **Nothing in the body tells
you**: you learn it from **dive tables**, a document bought or taught. The
stops are **staying in a band** — September's *the stop is a stop set*,
with no new verb. **Treatment is recompression** — back down, or a chamber a
harbor town builds (the medic vertical's second consumer). Free divers do
not get it, which is why it lives on the pump rung.

**Narcosis** below ~30 m on air — the rapture of the deep — is a
three-voice condition: the character cheerful, the narrator noting what they
just let go of.

### The tank and the submersible **[LEAN]**

- **The tank** — `AirTank` ships; the rung adds **air as an economy**:
  tanks filled at a **powered compressor** (the grid or `ManaPowered`), a
  counter business at a harbor, and ⭐ **bad air** — a compressor whose
  intake breathes its own exhaust fills tanks with carbon monoxide.
  Physiology carries over unchanged.
- **The submersible** — a positioned Location with boundary's `Window`s, a
  manipulator (`sample`, `get` through the hull) and a **rated hull**
  (materials-response); below the rating, implosion, kept as a singularity.

### ⭐⭐ Underwater magic — a parallel ladder priced by canon **[DECIDED]**

*"Underwater magic sounds great; we'll want all this stuff."* Checked
against [arcane-science.md](../../arcane-science.md) and needing no new rule:

- **Casting needs a voice, wands do not**; a scroll is read aloud (and paper
  soaks — moot without a sealed case; a scroll's row may say otherwise). So
  **you cast before you go in**, and only a wand or a worn item renews a
  working below.
- ⭐ **Breathing, light and warmth are HELD bindings** — *"magic is
  excellent at what happens once and poor at what must be held"* — a
  standing bill under Voss decay, so a pump crew undercuts magic for routine
  work by canon, and **mundane diving keeps its market**.
- ⭐⭐ **Underwater the built alternative is gone** — no flame burns — so
  this is **the one place magic's expensive held bindings have no cheaper
  rival**. The demand is real because the physics removed the competition.
- **Casting warms you** — η < 1 dissipates in the caster — so a mage runs
  warm against the water's cold, and a novice warmer than a master.
- **Breathing water skips the compressed-gas ladder**: no bends, no
  narcosis, no lung squeeze (lungs full of liquid do not compress —
  perfluorocarbon liquid breathing is real). What still limits you is cold,
  light, the working's clock, and the way back.
- **Transform is unaffordable** — no spell makes a person a merfolk; gills
  are a working that moves oxygen from water to blood for as long as it is
  held. **Rule 6 holds**: a working that lapses at 40 m is magic generating
  the problem and the breath arithmetic solving it.
- EotL's shapes as rows: the bubble of air, the Kraken's crown, the
  necklace.

## 8. Materials for water **[DECIDED]**

What a material already carries: `waterAbsorptionCapacity` (a real % of dry
mass), the wet law (`permeability()`, `wetProperty()`), conductivity and
specific heat, textiles' derived clo (wet wool keeps more than wet linen),
elasticity and toughness (rubber).

- **Sealants are a coating LAYER**, the dye stack's shape over an unchanged
  substrate: permeability near zero, **decay modulated** (oil on iron — the
  decomposition seam's first modifier), and **wear** — abrasion, time, heat
  — so reapplying is upkeep and somebody's income (the caulker paying the
  seams). ⭐ The chain already ships: pitch and tar (trade-fuel — Stockholm
  tar is a charcoal by-product), beeswax (apiculture), tallow (butchery,
  chandlery), linseed oil (flax), resin (forestry's sap). It makes a boat's
  **seams an assembly part** whose permeability wears (an old hull leaks;
  somebody bails), a tight barrel, dubbined boots, **oilskins**. One verb:
  `coat <thing> with <material>`.
- ⭐ **Wetness is bulk held in a porous solid.** A soaked object holds
  capacity % × dry mass. So a **sponge is a vessel** whose capacity is its
  material's: soaking it is `fill`, squeezing it is `pour`, and wringing a
  wet shirt is the same act. Saturation and fill fraction are one number.
  Natural sponge is the bed's cover (§ 12) with real processing (kill, rot,
  beat, wash, bleach); cellulose and foam are later rows.
- **Insulation in water** by epoch: grease (a coating on the body — channel
  swimmers' goose fat), **wool** (the shipped wet-clo carve-out; the hard-hat
  diver's woollens), sealskin; the **drysuit** (an outer layer of
  permeability 0 over wool); the **wetsuit** — ⭐ **fit decides flushing**
  (textiles' fit, so a loose wetsuit is cold) and ⭐ **foam compresses with
  depth** (Boyle again, so neoprene insulates less deep). ⚠ Neoprene is
  synthetic rubber, which the rubber build deferred to
  [destructive-distillation-slate](./destructive-distillation-slate.md); sponge
  rubber may be a rung between.

## 9. Domes and air pockets **[LEAN]**

Atlantis's dominant shape is **a town that happens to be underwater** —
EotL's 490 rooms are mostly a theatre, shops, a whodunit and a shuttle.

- **A dome is a Structure on the bed whose rooms are dry by ENVELOPE**, not
  elevation — the room envelope (`enclosure:` material + thickness, the
  rubber build) decides where water enters; a breach is a local flood.
  Inside, rooms are ordinary content, and fire works.
- **The airlock is a room that cycles its own medium** — the one mechanical
  room; Atlantis's port docks a submersible or a shuttle there.
- ⭐ **Air is a civic utility someone pays for** — `energy.md`'s
  street-lighting pattern (producer, depleting store, civic bill), supplied
  by a pump, a breathing tube to a float, an arcane source, or ⭐ **plants**:
  a kelp garden makes oxygen only with light, so a shallow dome grows its
  air and a deep one needs lamps and power (Biosphere 2's lesson).
- ⭐ **Fire burns the city's air** — a forge under the sea is a permit with a
  computable cost.
- ⭐ **The inside pressure is the author's choice**: a **one-atmosphere dome**
  (a rated hull; people come and go) or an **ambient habitat** (nothing to
  implode; its people **saturate**, and reaching the surface takes days of
  decompression — Atlantis's citizens could not simply leave). Derived from
  the bends model.
- **Natural air pockets** use the same air-stock physics and are often
  **stale** — you can surface in one and not be able to breathe it.

## 10. Wrecks, and what water does to things **[DECIDED]**

*"I expect it will usually be players trying to salvage their own wrecks
rather than its own enterprise."* So the question is **what an ordinary
object endures underwater**, authored or emergent.

| | cold, fresh, low-oxygen | warm and salt |
|---|---|---|
| iron | rusts slowly | **concretes** — gone inside in decades |
| wood | waterlogged, **preserved** (the *Vasa*; Great Lakes wrecks) | **shipworm** eats it in years |
| bronze, copper, gold, glass, stone | survive | survive |
| cloth, leather, paper, food | only buried in anoxic silt | gone |
| mechanisms | seize; cleanable | seize and corrode |
| sealed containers | protect (1840s Baltic champagne was drinkable) | until the seal goes |

- **Per material, from the water's salinity, temperature and oxygen**, an
  **immersion response** on the material row beside the wet law;
  **reconciled on read** from time submerged — a player's ship sunk ten
  game-years ago computes once, when found.
- **Burial in silt protects**; **fouling colonizes** — ⭐ **a wreck becomes a
  reef**, habitat the derived fishery should read as structure.
- ⭐ **Assembly decides functional vs scrap** — each part decays by its own
  material: the bronze bell comes up a bell, the iron cannon a lump of
  concretion (scrap via `salvage`), the rigging not at all.
- **Title survives sinking** (chattel): a raised crate is still its owner's;
  salvage of somebody else's is an award by contract, abandonment the
  polity's call, and **the wreckers** (lights to lure ships) are
  accountability's to record. **Lifting is displacement** — a sealed barrel
  or a bag of air (`displacement` on a hollow thing, September's one
  buoyancy addition).
- Wrecks come from authors **and from play** — any craft that sinks goes to
  the bed with cargo and title intact.

⚠ **This is one consumer of a larger question** — decomposition everywhere,
which so far exists only for corpses and food —
**[PARKED] → [decomposition-slate](./decomposition-slate.md)**. This slate
needs only the seam: *a material's decay rate is a function of its
environment, reconciled on read.*

## 11. Work below the waterline — `/trade/diving` **[DECIDED]**

**Diving owns gear, a discipline and services; no resource.** It ships the
stone and belt, lines, bell, the hard-hat dress and pump, dive tables; the
discipline (equalizing, buoyancy control, line work, reading a bed); its
verbs (`tug`, `drop belt`, `equalize` if it needs one); and the jobs, which
are services: **tender and pump crew**, and the **diver for hire** —
inspection, harbor works, bridge footings, cable laying, recovering a
player's own wreck, ⭐ and **recovering a body** (who the town sends for).
The trade-shopkeeping shape: a trade whose product is a service.

⭐⭐ **The demand is REPAIR, not construction.** *"Our structures clone fully
built or not at all"* — construction from scratch is missing everywhere, a
cross-cutting gap **[PARKED] → [construction-slate](./construction-slate.md)**.
But the repair build ships building upkeep, and **water wears things fastest
of all** (§ 10): piles rot and shipworm eats them (San Francisco Bay's
wharves, 1920s), fittings concrete, **intakes and outfalls foul and silt**,
hulls foul, a weir's face scours. The works already exist — the Wharfside
intake and outfall, the millsite weir, the *Hesper*'s hull, every quay —
and once immersion decay reaches them **they need somebody below the
waterline on a schedule physics sets**. *Upkeep is somebody's income.*

- **Public gigs** — the markets faucet: clearing snags, dredging a silted
  channel, recovering a body, inspecting a weir after a flood.
- ⭐ **The diver's competitor is the tide.** **Careening** — beach her at
  high water, scrape and caulk her dry at the ebb, float her off on the next
  flood — is free with the tide tables, slow, and only where the range
  allows. A diver is faster, works anywhere, and costs a wage.
- Wet welding and riveting (1930s →) are the same job at a later rung.

Kept from the audit: **the pumped diver is dependent** — his life held by a
man turning a crank, paid by the hour — the most interesting labour
relationship in it, and ⚠ **who goes down** (pearling fleets ran on
indentured and Indigenous divers) is lens 4's, recorded on the
**accountability ledger** (*you sent him down*), never resolved by it.

## 12. The bed's harvest **[DECIDED]**, waiting on foraging

- **The bed is ground with a cover** — forestry's `Wood` shape (ground with
  a `StandMixin` cover, derived on read, changed only by the act) — making
  it the pattern's **third consumer** (stand, coppice panel, bed), the
  signal to lift the cover into kernel substrate.
- ⭐⭐⭐ **Recharge depends on the harvest act's technique** — cut a sponge
  above its base and it regrows, tear it out and the spot is dead; take the
  big shellfish and leave the small; cut kelp at the canopy, not the
  holdfast. **Sustainability as a skill rather than a restraint** — you do
  not take less, you take *correctly*. ⛔ No sustainability gauge.
- **Shell is the income; the pearl is luck** (the ratified refusal of a
  variable-ratio reward). **Trips, not yield**. **Products are rows** — the
  cenote where keeping anything is taboo must be authorable.
- ⭐ **The bed is FORAGED only.** *"We generally only forage there, we don't
  cultivate it."* Cultivation is mostly not underwater at all — oyster and
  mussel beds worked on foot at low tide or from a boat, seaweed and pearl
  lines from a boat, stew ponds and raceways from the bank — so it is
  husbandry on water: **[PARKED] aquaculture**, its own thread.
- ⚠ **It waits on foraging**, which has no slate yet: *"most of the
  interesting content underwater is going to come after we build
  foraging."* The harvest designs on whatever foraging decides on land.
- ⭐ **Who owns a bed?** Water rights cover drawing water; nothing covers
  occupying or harvesting the bed. The foreshore is often its own legal zone
  (§ 13). A minimum-take rule is **a conservation law the mechanism will
  actually reward**, because recharge depends on the act.

## 13. ⭐⭐ Tides — from the shore **[DECIDED]**

*"Most people only experience tides from the shore, either watching water
levels change or seeing what the tide brought in… the interesting thing to
me is tidepools, not tides, but it's all one thing."*

**The mechanism is small**: a **level term on the moon clock** —
semi-diurnal, springs at new and full moon, neaps at the quarters — with a
**range per water** (a funnelling estuary huge, a sheltered sea small; lakes
and rivers above the tidal reach none), feeding § 2's depth read.
`CelestialLogic` has computed the moon for months and nothing asked it for a
tide.

- **The moving edge.** The shore is a strip of places across the range,
  each a `depthM`; the waterline is wherever the level falls among them.
  `look` reads it in words — *"the tide's on the turn; the rocks at the point
  are already covered."*
- ⭐ **What the tide brought in.** Each high water leaves a **strandline** —
  seaweed, shells, driftwood, and whatever was floating: ⭐ **the realm's own
  drift**. Buoyancy sends floaters up and the sea carries them, so
  jettisoned cargo, a wreck's barrels, a body, the logs a river carried down
  fetch up at the high-water mark: **the realm's losses arriving later,
  unbidden**.
- ⭐⭐ **Tidepools.** A water place in the strip with a basin: part of the sea
  at the flood, **isolated at the ebb** — warming, salting as it
  evaporates, short of oxygen, its stranded creatures living with it. **You
  look into it** and reach in by hand (the trench's *"a place you look at"*
  at its smallest). ⭐ **Zonation is the arithmetic of the tide**: barnacles
  high, anemones and crabs lower, kelp at the bottom — derived from the
  pool's `depthM` against exposure.
- **The causeway that closes**, the tidal cave whose mouth becomes a
  ceiling, the bar that floats a ship only at high water, the river's tidal
  reach where the current reverses (river-slate).
- **Tide tables are knowledge**, sold not shown — almanac → print → the
  implant's calendar (lens 5).

### Tidal streams — the tide offshore

Offshore the tide is a **current**: it floods one way, ebbs the other, slack
at the turn. **A tidal stream is a tide-phase term on a band's set** — a band
declares a flood direction and a peak rate; the set runs peak × phase,
strongest at mid-tide, zero at high and low water — integrated by the voyage
exactly as a constant set is.

- **Narrows make it fierce**: **tidal gates** (go through with the stream),
  **races and overfalls** over shoals, and ⭐ **whirlpools** — the
  Corryvreckan, the Maelstrom — **a hazard that exists only near peak
  stream**, gone at slack: EotL's timed whirlpool, timed by the moon instead
  of a random timer.
- ⭐ **Slack water is the diver's window** — the column carries the current
  at depth, so divers plan for slack: a dive decided at the surface by
  reading the clock.
- Far offshore it is negligible; an undeclared band has none.

### The tide lens pass

1. **Pedagogy** — the tide comes **~50 minutes later each day** (the lunar
   day is 24 h 50 m) — the first-contact lesson is arriving at the wrong hour
   and finding water; springs and neaps; zonation; drift.
2. **Expression** — the smugglers' cove at low water, the tidal island
   chapel, Mont-Saint-Michel's causeway, the mudflat crossing with a guide,
   the drowned forest shown at the year's lowest tides, a stocked tidepool.
3. **Immersion** — the shore is different at every visit. **Participation**
   — the beachcomber, the cockler and bait digger, ⭐ **the guide across the
   sands** (Morecambe Bay has had a Queen's Guide since 1548 — a seat), the
   coastguard, the tide-table printer.
4. **Values** — **who owns what washes up**: the finder, the lord ("right of
   wreck") or the original owner (title survives sinking)? ⚠ And the
   **Morecambe Bay cocklers** (2004, 23 migrant workers drowned, cut off by
   the tide, working for a gangmaster) — risk sold to those least able to
   refuse it.
5. **Continuity** — the same knowledge and question at every rung.
6. **Economy** — the wrack has shipped demand: **seaweed as fertilizer**
   (soil's reserves), **kelp ash as soda for glass** (the Highland kelp boom),
   driftwood as fuel and timber; cockles wait on foraging.
7. **Governance** — **the foreshore** is often its own ownership zone in
   law; the right of wreck; the guide as an office (criterion: the posted
   crossing times; appeal: the polity).

## 14. The surf **[DECIDED]**

- **What arrives**: the expanse's sea state from local wind, plus ⭐ **swell
  as a lagged term** — the weather field's wind over a distant band some days
  ago, arriving long and organized (the field is stateless, so it is a pure
  read at an earlier time and another place). A calm day can have big surf.
- **Where it breaks**: shallower than ~1.3× its height, so ⭐ **the break
  moves with the tide** (surfers read the same tables). **How**: by the
  strip's slope — spilling (gentle), **plunging** (the barrel), surging and
  the dumping shorebreak that breaks necks.
- ⭐ **The currents are the killer, and "undertow" is the wrong word.** The
  **longshore** current drifts you sideways; the **rip** takes piled-up water
  back out through a gap (a sandbar, a pier, a groyne) in a narrow fast
  channel — strongest with big surf at low tide, readable as the calm dark
  lane between breakers. People drown swimming straight in against it; ⭐
  **the escape is to swim parallel to the shore** — lens 1 teaching
  something that saves real lives.
- **The hold-down** is the breath model — two waves in a row; the shorebreak
  impact; rocks and reef.
- **Craft in the surf** — launching and landing through it (broaching, the
  surfboat and lifeboat crews), the bar crossing.
- **Surfing** — a board is a craft Thing (a hull row, paddle propulsion);
  catching a wave is timing, riding is competence deciding *how much ride*;
  the wipeout is everyone's physics. ⭐ **The culture is the players'** —
  chiefs' reserved breaks in old Hawaii, *closest to the peak has the wave*
  — a norm with nothing to compute, so no engine rule. Rivers surf too: a
  rapid's standing wave.

## 15. ⭐⭐ Life across the tree **[DECIDED]**

*"'Aquatic species' is half the animal and plant kingdom and we're casting
it off like it's one thing."* Walked case by case:

| organism | holds? |
|---|---|
| trout, carp, eel (shipped) | ✅ gill breathers; habitat already tolerates by `oxygenMgL` |
| an eel crossing land at night | ⚠ breathing must be a rate (finding 1) |
| ⚠ **the shipped bullfrog** — `quadruped` plan, `air` only, lifecycle `alive, dead` | ✗ would drown underwater (no water place exists yet, so no live bug); no tadpole (findings 1, 2) |
| mayfly, dragonfly, mosquito — larva under, adult in air | ✗ finding 2 |
| salmon, eel — fresh and salt by life stage | ⚠ finding 5 |
| seal, otter, whale, penguin, cormorant, turtle, crocodile | ✅ **our breath model is theirs** — a whale holds 90 minutes because its store is enormous |
| a turtle overwintering under ice | ✅ once breathing is a rate |
| crab, lobster walking the bed | ✅ the hard-hat diver's `walk` in the bed band |
| clam, worm burrowing | ✅ the bed is ground |
| coral, sponge, oyster bed, mussel bank | ✅ agent-first taxonomy: they cannot act on their own behalf → **covers** |
| jellyfish, man o' war | ✅ a **hazard** carried by drift; a swarm is material |
| octopus | ✅ an agent — hiding, ink as turbidity, size against a gap |
| shark, dolphin | ⚠ finding 3 |
| electric eel, stingray, stonefish | ✅ conduction spread, the toxin route, concealment + hazard |
| a 30 m whale | ⚠ presence larger than the room — fine as seeded passing presence |
| kelp, seagrass | ✅ covers, depth-limited by clarity |
| algal bloom, cyanobacteria | ⚠ finding 4 |
| bioluminescent plankton | ✅ a light property of the water as material |
| cholera, schistosomiasis | ✅ watershed's contamination kind |
| merfolk | ⚠ a hybrid plan breathing both, swimming, drying on land |
| selkie | ✗ finding 2 |

**The five findings:**

1. ⭐ **Breathing is a RATE, not a medium tag.** Every body has an **oxygen
   store** and an **intake rate per medium** by apparatus — lungs for air,
   gills for water, skin for both, slowly. A body survives where intake
   covers burn. § 4's breath model becomes **the general model for every
   animal**, replacing `breathableMedia: [water]` as a yes/no.
2. ⭐ **Apparatus and locomotion belong to the current FORM**, read per
   lifecycle stage or shape — the tadpole and the frog, the larva and the
   fly, the selkie's two shapes. One seam.
3. **Every sense reads apparatus × medium** — `Vocal`'s rule generalised:
   human smell fails underwater (you would inhale), a shark's works; the
   **lateral line** and **electroreception** are new channels that work only
   in water; echolocation sees through murk.
4. ⭐ **Breathable water is a mixture, as air is** — the fire build's lesson
   (*a breathable tag is not breathable air*) again. A fish needs **dissolved
   oxygen**, derived: cold holds more, rapids aerate, plants add by day and
   take by night, decay on the bed consumes. Respiration reads the same
   `oxygenMgL` the fishery's habitat already does. It gives the tidepool
   running short at the ebb and ⭐ **eutrophication** — the Delight's farm
   nitrate → a bloom → an oxygen crash → fish killed **downstream**: lens 1
   and the watershed's politics from numbers already on the row.
5. **Salinity is a habitat tolerance**, by life stage where it changes.

**Fauna presence.** *"Procedural is the population, never rooms"* (fishing):
the bands read each species' habitat; **what is in a band now is a seeded
field** (the expanse's traffic shape — FNV over water, band and game hour,
weighted by the record), the same for everyone and unfarmable, read in
words; **individuals are minted when acted on** (the hunt; a predator
acting) — load-on-use. Authored places author their own cast (Atlantis's
Kraken in its lair).

**Aquatic people.** Breathing is respiration's inversion (amphibious
species both). ⭐ **Merfolk dry out on land** (EotL's best idea) — a
desiccation clock, the wet law reversed, a dip or a drink buying time: a
water species' trips ashore as bounded as a diver's trips down. ⭐ **`Vocal`
asks apparatus × medium**: merfolk talk to merfolk underwater while the
human diver beside them cannot, and cannot be heard on the dock.

## 16. The lens pass (2026-10-18, run at decision ~27)

1. **Pedagogy** — strong: Manning, meanders, Boyle, CO₂ vs O₂ and
   shallow-water blackout, the dive reflex, Haldane, zonation, rips. ⚠ A
   player can only learn what they can READ: **two `Reading` rows** — current
   speed (a float and log) and water temperature (a thermometer); competence
   sharpens them.
2. **Expression** — the ordinary case is a row citing a water with a
   `depthM`; the bespoke is authored rooms as external neighbours; boats and
   gear are assembly rows with supply-chain depth.
3. **Immersion** — the census was this lens working. ⚠ The new risk is ours:
   **derived band and stretch rooms will read generic** — *"you are in a
   run"* forty times. **Prose banks with seeded variation**, plus the
   derived delta on entry, are a **budgeted build line**, not a footnote.
   **Participation** — tender, hauler, ferryman, river pilot, boatwright,
   caulker, the snag-boat gig, the guide across the sands. ⚠ The hole: **who
   owns a bed or a stretch** (§ 12).
4. **Values** — body composition never a number; the tender's attention
   unmeasurable; ⚠ **hiring someone to go down** belongs on the
   accountability ledger.
5. **Continuity** — `descend`/`ascend`/`haul`/`tug`/`drop belt` at every
   rung; the stop is staying; one Ship and one set of Helm verbs; an oar
   becomes an outboard by `fit`. No leaks.
6. **Economy** — ⚠⚠ the weak lens, and it orders the builds (§ 17):
   salvage is the only demand that existed first; **repair of submerged
   works** (§ 11) is demand that physics creates on content that exists;
   river craft are supply waiting for destinations.
7. **Governance** — thin, correctly: the bed licence, the right of wreck,
   the foreshore, the guide's seat, whether a tender answers for a diver —
   criterion, appeal and tier as each is designed.

**Altitude.** *Invariant*: the medium is derived and water a state; ascent
never gated on skill; no roll decides what an action did; a course plans on
claims, never truth. *Grain* (an author's default): the band and stretch
templates and thresholds, the line-signal vocabulary, scrolls needing a
voice, every killer's constants.

September's essence sentence, still the one: ⭐⭐⭐ **Holding your breath and
reaching for something, while somebody waits above.**

## 17. Build order and dependencies

Lens 6 orders them:

1. **The water place** (this slate): water as a state, the column, the
   body, the census's seams, combat's medium terms, the lifeline, the bell,
   the hard-hat suit, `/trade/diving`'s gear and services, tides and the
   shore, the five life findings.
2. **The river as a line** ([river-slate](./river-slate.md)).
3. **Craft on rivers** (river-slate) — once content along the river gives
   anyone a reason to go somewhere on it.

Waits on others: the **harvest** on foraging (no slate yet); wreck decay on
[decomposition-slate](./decomposition-slate.md) (only the seam is needed
here); construction-from-scratch work on
[construction-slate](./construction-slate.md); neoprene on
[destructive-distillation-slate](./destructive-distillation-slate.md).

## 18. ⬅ From the storage-and-ice build (2026-10-18)

The ice build (build-4) recorded these on this slate before merging; they
are folded in so its merge resolves to this text.

- **What exists**: a `Pool` authors `bed: <row>` — the water pack's
  `pool-bottom`, a sealed holder — and `Pool.sinks(thing)` (material density
  against `BiomeApi.densityOf('water')`; anything that acts, moves itself or
  is fixed never sinks) with `Pool.sink(thing)` on arrival in open water and
  at the thaw. The pool is the ONE seam, so § 3's bed band changes
  `Pool.sink` and the row and nothing else. Floaters stay in the place;
  hollow things are not modelled.
- **The bed is LISTED** — `pool-bottom` is an ordinary prop, so the pool's
  `look` shows "the bottom of the pool" under HERE in summer and on 7 cm of
  black ice alike. Whether the bed is seen from the surface (clear water, a
  sounding, never through ice) is sight through the column (§ 5, seam 10).
- **A swim through winter ice took a body down in SILENCE** — every act
  refused "not conscious enough" while `assess` read unhurt; cold, most
  likely. § 4's rule: the cold clock needs a felt voice.
- **A break-through never heals** — the sheet's broken patch still read so
  after three days of hard frost; it should regrow like a cut one. The ice
  build's to fix.
- ⬅ From maritime (2026-10-14): **swimming is at the surface until this
  build** — the swimmer breathes whichever of water and air the body can;
  going under (depth > 0) is what makes the water the medium breathed.

## 19. Parked, and open

**[PARKED]**, each its own conversation: decomposition · flooding
([flooding-slate](./flooding-slate.md)) · construction · aquaculture ·
foraging (for the harvest). **Not yet talked through** (named by the lenses,
offered and passed over): finding your way underwater (counting kicks, the
bed's slope, whether a dive writes `walked` claims) · sacred water (the
cenote of offerings, drowned gods, ordeal by water).

**Open:**

1. The bell mixin's and the water-state mixin's names.
2. Where the five life findings land — respiration's own build, or this one.
3. The `Medium` row: a new idea kind, or columns on `Biome` (⚠ the biome may
   only say what the outside AIR is doing — which argues for its own row).
4. Bed and foreshore ownership — the RGO pass's, with the governance lens.
