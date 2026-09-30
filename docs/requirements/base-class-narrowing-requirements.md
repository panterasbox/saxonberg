# Base-class narrowing — requirements

**Kind:** refactor/sweep (with one shipped-defect repair)
**Leads from:** kernel — first consumers are **every player reading a
`<composition>` panel** (the claim this build is about), and for the
thermal repair, concretely, **a blood unit in a medic's bag and a
ration in a pack**, both of which sit in a frozen thermal moment
today.

⭐⭐ **Composition is a public claim.** The client shows a player what
an object composes, ungated. A mixin that is composed and never used
is the model telling a player the object can do something it cannot —
and an author the same thing, which is worse, because the author
believes it. This build removes claims that are false and repairs the
one defect hiding behind the biggest of them.

Executes the ranked defect register in
[base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md),
whose numbers were taken by full-tree census and **re-measured at the
start of this cycle** — every finding below still holds.

## What already exists

- **The census is done.** The slate is not a design sketch; it is a
  measurement with evidence per claim, plus a list of rejected
  approaches nobody should re-take.
- **The blocker cleared.** Its `⛔ blocks everything else` item was
  the containment-partition concept, which **shipped 2026-09-28**
  ([spatial.md § Placement](../subsystems/spatial.md)). Two register
  entries closed with it: `looseContents` became a method, and the
  array-first hole in `lint:object-verbs` is now empty.
- **`feel <thing>` already reports a surface band in words** — the
  fast, player-visible temperature read this build's drive needs, and
  the reason its slow arcs do not have to be slow.
- **`KeptAnimal` is a shipped rung** ([pets.md](../subsystems/pets.md))
  with rows already on it (the cat, the canary) — so the `Branded`
  move has a real destination, not a hypothetical one.
- **`ExitableVessel` ships three composers** — `Coach`, `Barge`,
  `HaulageRig` — and a coach row already authors `open: false`, so
  the open/closed state a room's envelope reads from openings is
  already there on the object.

**Therefore what is genuinely new here is** not a mechanism at all,
with one exception: **a thing you can go inside becomes a place with
air.** Everything else is subtraction — the model saying less, and
meaning it.

## Goals

- **A backpack, a till, a jar, a rack, a footlocker, a handcart and a
  shop counter stop claiming they have weather.** Today 38 rows
  inherit an atmosphere that is provably unreachable, and the
  composition panel tells players about it.
- ⭐ **A thing you can go inside has its own air, and it is real** —
  a closed coach in a storm is not the street. This is the one thing
  the build adds, and it is what makes the subtraction honest rather
  than merely tidy.
- **A thing carried in a bag stops being frozen in time.** Its warmth
  tracks the world again, which a player can feel with one command.
- **A person, a corpse and a shade stop advertising that they can be
  branded like livestock;** a kept animal still can.
- **Nothing in the game refers to seven classes and two mixins that no
  content, no verb and no player has ever reached** — and the gate
  that was supposed to notice one class of that is tightened so it
  cannot re-grow.

## Non-goals

- ⛔ **`Concealable` on `Thing`** (register #4, *the bullet-bite*) —
  182 classes, 596 rows, and **no signal exists in the data** to draw
  the line automatically. A human decides it class by class. → stays
  on [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  as its own conversation.
- **`Persona`'s 60 empty biographies** (#5) and **`MineRoom`'s
  unauthored air** (#8) — pure content gaps; rows somebody authors, no
  code. → the same slate, and the mine one has teeth because the metal
  chain models blackdamp.
- **A general "step outward until a scope answers" ambient walk.** The
  repair here is the one step the placement build's seam already
  supports. Anything deeper → the same slate.
- **Interior air for anything that is not enterable.** A chest is not
  a place. → nowhere, deliberately.
- **`Chamber`, and the `Atmospheric` widening it needs** — a
  compartment is not a Container and the mixin's base constraint says
  Container. → [fridge-design-pack](../slates/builds/fridge-design-pack.md),
  which carries the full spec.
- **The four findings the placement build filed** (the re-meltable
  solid welded to metallurgy · no rung reads a temperature inside
  something · substring keyword matching · `Posed.restingOnPath`) →
  already on the narrowing slate's register; not this build.

## Placement

**The kernel's**, all of it — these are kernel classes and kernel
mixins, and the rows affected belong to whoever already owns them.
No pack gains or loses a namespace.

⭐ **Does a second instance need code?** For the one thing this build
adds: **no.** A second enterable vessel with its own air is a row
that states its interior size; the derivation and the mixin are the
kernel's. A second kept animal that can be branded is a row on the
shipped rung.

## Collisions

- ⚠ **`Coach`, `Barge` and `HaulageRig`** are the three shipped
  enterable vessels, and they are the only things that GAIN behaviour
  here. The barge is the odd one — an open boat is not a sealed cabin,
  and if its interior reads as a room with its own air that is wrong
  in the other direction. **The build must look at all three and let a
  row say it has no interior worth modelling.**
- **The logistics/transport pack** owns those rows; the haulage depot
  counter and warehouse are `Vessel` descendants that LOSE the claim,
  which is the intended outcome.
- **Dave's Bar, the cookhouse and every shop** hold tills, racks and
  counters among the 38 rows. Nothing they do changes; what changes is
  what their panels say.
- **The medic's bag** is where the thermal repair is felt first, and
  the clinical-medicine content already carries blood units with a
  freshness clock.
- ⚠ **Seven classes are being deleted.** Two of them (`Candle`,
  `Screen`) each carry a whole subsystem exercised only by their own
  test — deleting the class deletes the only exercise of that code.
  The build must say, for each, whether the subsystem goes too or is
  left with a different consumer.

## Surface decisions

### `Atmospheric` moves to `ExitableVessel`; it does not simply go away

**The question.** The census says remove the mixin from `Vessel`. But
`Vessel`'s descendants include the things a player can walk into.

**The answer.** Remove it from `Vessel` and put it on
`ExitableVessel`, where it also becomes *real* — an enterable vessel
states its interior size, so the envelope that is dead everywhere
today actually runs there.

**The reasoning.** ⭐ *A thing you can go inside is a place, and
places have air.* Lens 3 chose this: the alternative leaves the build
purely subtractive, and a closed coach in a storm reading the street's
weather is exactly the kind of quiet dishonesty the census exists to
find — the same defect as the backpack, pointing the other way. It
also costs no new mechanism: the envelope's open/closed handling is
shipped and a coach already authors a door state.

**Alternative considered.** Remove it from `Vessel` outright. Smaller
and defensible, but it retires a claim instead of making one true, and
the coach loses a thing it should have had.

### A row may decline an interior

An open barge is not a cabin. A row states its interior size, and a
row that states none is not a place — it keeps the honest silence a
backpack now has. **The default is no interior**, because the failure
this build exists to fix is claiming one you do not have.

### The thermal repair is one step outward, not a walk

A carried thing reads the air of *what it is in* — and when that is a
bag rather than a room, the bag has nothing to say, so the thing reads
the room the bag is in. One step, which the placement build's
enclosing-scope seam already supports. Anything deeper is a separate
question about nested containers.

### Dead means unreachable by content, verbs and players — not merely unused in tests

A class that only its own test references is dead. ⚠ Where that class
is the sole exercise of a subsystem, the build says explicitly whether
the subsystem is dead too — deleting the test-only consumer of live
code would hide it, not remove it.

### The gate closes behind the fix

`lint:object-verbs` is a ratchet at zero that an Api static taking an
*array* of world objects slipped through. The one instance is gone, so
the hole is empty and can be closed at zero now. ⭐ Census, then
ratchet — the pattern this repo already uses.

## Lens pass

1. **Pedagogy** — ⚠ **weak, and that is the honest entry.** Nothing
   here teaches a Discipline. The one thing it teaches is
   environmental: a bag is not a cold room, and a closed carriage is
   warmer than the road. Recorded as a gap, not dressed up.
2. ⭐⭐ **Creative expression — the strongest, and the reason to
   build it.** An author reads a composition panel to learn what a row
   can do. 38 rows currently say *weather*; 73 say *brandable*. An
   author who believes either writes content that silently does
   nothing. **The build's whole product is that the panel can be
   trusted.**
3. ⭐ **Immersion** — an object stops lying, and one starts telling
   the truth. A till does not have weather; a closed coach in a storm
   is not the street.
4. **Values** — ⚠ thin. No choice is forced, nobody's standing
   changes. Recorded as a gap.
5. **Epochs** — neutral and free: a sealed cabin holds its own air in
   any era, and the mechanism is the same one rooms already use.
6. **Economy** — ⚠ thin directly, but the thermal repair touches
   spoilage, which is the clock under food and blood trade. A carried
   perishable that never changed temperature was a small free lunch;
   it stops being free.

## The drive

A character with a bag, a perishable, and a coach to get into.

**A — the panel stops lying.**

1. Inspect a backpack (or a till, or a shop counter). ⭐ Its
   capability list does **not** mention atmosphere or weather.
2. Inspect a person. It does **not** say they can be branded.
3. Inspect a kept animal — the cat or the canary. It **still** does.

**B — a thing in a bag is no longer frozen in time.**

4. `feel` a perishable you are holding. Note the band it reports.
5. Put it in the bag. `feel` it again — it still answers, and it
   tracks the world rather than reporting a value stamped long ago.
6. Carry it somewhere markedly hotter or colder, wait a little, and
   `feel` it once more. ⭐ **The band has moved.** Today it would
   not have.

**C — a coach is a place with air.**

7. Stand in the street in cold weather and `feel`. Note the answer.
8. Get into the coach and shut the door. `feel`. ⭐ It is not the
   street.
9. Open the door and `feel` again — the inside gives way toward
   outside.
10. Get into the barge (or whatever row declines an interior) and
    `feel`. It reads the world outside, honestly, because an open
    boat is not a cabin.

**D — nothing that worked stopped working.**

11. Walk into a shop, a bar and the cookhouse. The tills, racks,
    counters and chests are all still there, still hold what they
    held, and `look`/`put`/`get` behave exactly as before.
12. Ride the coach somewhere. Haulage still hauls.

## Acceptance criteria

Observable from outside the code.

1. **A backpack's public capability list no longer claims weather**,
   and neither does a till, a jar, a rack, a footlocker, a handcart or
   a shop counter.
2. ⭐ **A closed enterable vessel reports a different warmth from the
   street it is standing in**, and opening it collapses that
   difference.
3. **A row that states no interior keeps the honest answer** — it
   reads the world outside, and nothing claims it is a place.
4. ⭐⭐ **A perishable carried in a bag changes temperature as the
   world changes**, readable with one `feel`. Today it does not.
5. **A person, a corpse and a shade no longer advertise branding; a
   kept animal still does.**
6. **Nothing in the running game refers to the deleted classes or
   mixins** — every venue that used them still boots, still furnishes,
   and still plays.
7. **Nothing that worked stopped working**: every container still
   holds what it held, every verb still reaches what it reached.

## Cross-references

- [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  — the census, the defect register, and ⛔ the rejected approaches.
- [spatial.md § Placement](../subsystems/spatial.md) — what unblocked
  this, and the enclosing-scope seam the thermal repair rides.
- [thermal.md](../subsystems/thermal.md) · [biome.md](../subsystems/biome.md)
  — the envelope and the ambient chain.
- [pets.md](../subsystems/pets.md) — `KeptAnimal`, the `Branded`
  destination.
- [fridge-design-pack](../slates/builds/fridge-design-pack.md) — owns
  `Chamber` and the widening this build does not touch.
