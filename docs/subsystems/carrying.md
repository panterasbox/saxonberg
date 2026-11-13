# Carrying

The carrying subsystem answers **where a thing goes on a body, and what
the body knows about the things it carries**. ⭐⭐ **`ContainmentApi.move(item,
body)` is the receiving act** (size and carrying W8): a body is a
destination that places what arrives — a hand, a pocket, a pouch on the
belt, the bag at its side, the pack on its back. Everything on a body is
**held**, **worn**, or **placed** on something worn. Nothing sits loose.

That one invariant is what makes hands mean something. A full hand is a
choice that costs you — what you hold is what you can use now, what is
in a pocket or on the belt is a moment away, what is in the pack is
packed — and the same body knows where each thing lives and how long it
takes to get it out in a fight.

An author needs two calls and nothing else: **`move` to stage**,
**`container.canReceive(item)` to ask first**. Both are on every
container.

The tape measure every placement asks is [size.md](./size.md). The
weight is [encumbrance.md](./encumbrance.md). The slots are
[slot.md](./slot.md) and [embodiment.md](./embodiment.md).

## The Cast

| Piece | Where | What it is |
|---|---|---|
| **the hook** — `arrivalFor(item, how?)` | `ContainerMixin` (`lib/spatial/Container.ts`), beside `canAddContainable` | where an arrival goes in this container: `contents` (the default, every ordinary container) · `seat` (slots) · `pair` (a worn host's region) · `into` (a carried bag) · `refuse` |
| **the dry read** — `canReceive(item)` | `ContainerMixin` | `null`, or an `ArrivalRefusal` — the hook's answer read dry, then the tape measure and the container's own veto. **Every container answers**: a chest by its fit, a canary *nowhere to carry that*, a person by hand → pocket → pack. No caller narrows before asking |
| **the chokepoint** | `ContainmentLogic.move` | a destination that is an agent is asked `arrivalFor`; `move` performs the answer (`seatInSlots`, `placeOn`, the bag's own move) or **throws** a `ContainmentError` (`reason`, `facts`, a message naming the body, the item, the hands and what was tried) |
| **the invariant** — nothing loose | `Creature.arrivalFor` (every body) | admits only what arrives placed, an agent, a thing being seated (`Slotted.isSeating`), or one the body is admitting (`Creature.admitWhile`, gated `AnyOf(SelfOnly, FromModule(PersistableLogic))` — the restore). Else `refuse` `nowhere-to-carry`. **Fails closed**: no species row loaded is no escape |
| **the seating mark** | `Slotted.seatInSlot` / `seatInSlots` | contents first, then the slots, under a mark (`try/finally`, a failed claim rolled back out) |
| **the capability** — `CarryingMixin` | `lib/slot/Carrying.ts`, composed on `Character`, `DraftAnimal`, `KeptAnimal` and ranching's `WorkingAnimal` | overrides `arrivalFor` with D11's order; homes, tiers, readying, letting go, the restore's overflow |
| the hands | `Attired` (`handSlots`, `heldThings`, `wears`) | the slot substrate's fact — any body's hands by its plan |
| `CARRYING_DEFAULTS` | top of `Carrying.ts` | the grip dials (one-hand fraction, two-hand length); the awkwardness dials are `LOAD_BEARING_DEFAULTS`' |
| `carry.order` | `Carrying`'s `static settings` | `hands-first` (default) · `pockets-first` |
| pockets | `PlacingMixin` named regions + the `/platform/placements/pocket` document | a region of a garment, never an object |
| the belt | `PlacingMixin`'s `from` member + its hanging length | a `Garment` row with `placements: [from]` — no belt class |
| worn and hung containers | `Pack` (`Wearable(Slottable(Vessel))`, composes `Placing` and `Sealable`) | a satchel, a rucksack, a belt pouch, a pannier, a holster (`shapedTo:`) |
| the words | `CommandController.carryRefusalWords` · `readiedWords` | the body reports facts; the verb words them |

**Who carries.** `Carrying` composes only where a body carries: a person
(`Character` → every Avatar, NPC, Extra, Cast), a draft animal (a mule's
pack saddle — panniers hang), a kept animal (the dog's mouth is a hand;
the cat answers `nowhere-to-carry` *by its plan*), a working animal. A
`Beast`, ranching's `Livestock`, a `Fish`, a bare `Creature` do **not**:
`move(item, <any of these>)` throws unless the arrival is placed, seated,
an agent or admitted — a hog's halter is *seated* (`equip`), and it is
led by it. A `Corpse` is a Thing. Narrow with `MixinApi.isCarrying(x)`
(`Creature & Carrying`). No Api.

## ⭐⭐ `move` — the one way onto a body

```typescript
ContainmentApi.move(item, body);          // placed, or throws
const refused = body.canReceive(item);    // null, or why — ask first for a refusal
```

`Carrying.arrivalFor` is one resolution (`resolveReceive`), which
`canReceive` reads dry — so the pre-check and the act cannot disagree. In
order, after the body's admissions (`super.arrivalFor`):

1. **Already in a hand** — `contents`, nothing to do.
2. **A handless body handed its tack** puts it on (`seat` its claim) —
   `put pack saddle in mule`.
3. **The hang rule.** A worn container that claims no slot of this body
   (a belt pouch, the medic's pouch, a holster) **arriving from off the
   body** is hung `from` the first worn host that offers it with room
   (`pair`) — *you clip the holster to your belt*.
4. **A stack meets its like** in a hand, a pocket or a ready container
   and merges — it takes no hand.
5. **`carry.order`** between a free hand (or two — the grip) and the
   first **carry place** that fits — a worn pocket (`pair`), a hung or worn
   container (`into`), the pack on the back — never into itself.
6. Else `refuse`: `too-heavy` · `hands-on-cart` · `cannot-grip` ·
   `nowhere-to-carry` — with facts: what the hands hold, what was tried, a
   held thing that **would** go away and where (`away`), and whether the
   thing takes both hands while one is free (`needsBoth`).

⭐ **`move` never lies.** With no honest place it throws — it never lands
the thing at the feet or anywhere but the body. A non-carrier (a fish, a
canary) has no honest place for anything: a fish's inside is a stomach,
not a pocket. A key moved out of its pocket onto its owner asks the hook
like any arrival and goes to a hand.

⭐ **The refusal is the tutorial**, worded by the verb's controller
(`carryRefusalWords`): *"Your hands are full — the mug and the lantern —
and the map won't fit in your pockets. Put something away (`put mug in
left pocket`) or set it down (`drop lantern`)."*

### The idioms — two calls, no synonym

There is exactly one movement verb (owner: *"every time you invent a
synonym for `move()` you're making it harder for everyone else in the
game"*). What differs is whether the caller wants a refusal:

| idiom | written as | used by |
|---|---|---|
| **stage it** | `ContainmentApi.move(item, body)` | the harness `hand`, `props:` (a refused prop is a diagnostic), `get`, a kit, an NPC arming itself |
| **handed** — a write sits between | `canReceive(item)` before any write, then `move` | `buy`, `give`, `put X in <person>`, a rack or shelf reclaim, a store withdrawal, untying a line, a tip jar — refused in words, **nothing moves and nothing is charged** |
| **made** — never refused after the inputs are spent | on the **mint path's owner**: `if (maker.canReceive(made) === null) move(made, maker); else move(made, here)` (+ that owner's *you set it down* line) | crafting's `landOutput`, the taps, the harvests, a catch, the cuts, the casts, the tears, a drink made for you, a minted card or key or receipt, cash the ledger has moved |
| **wear it** | `body.seatInSlots(garment, claim)` | outfits, loadouts, `equip` out of a wardrobe; a bag that claims no slot is `move`d and hung |

The made fallback is written on each owner (68 of them), never on
containment — the cost of one movement verb, chosen by the owner.

### The one overflow — the restore

`Carrying.onRestored` (after `Creature`'s, which stands the species row
up) → `placeLoose()`: anything a restore finds loose goes through the
body's own `arrivalFor`, else to a player's **residence** (a live room at
`ParcelApi.heldUnitOf`) with a line (*"your crate would not fit anywhere
on you; it is in your room"*), else at their feet, said so; an NPC's is a
diagnostic. This is the carrier's explicit choice, never `move`'s
behavior. A restored **non-carrier** with loose contents is admitted and
reported (`Creature.onRestored` → a diagnostic). The restore itself
admits every body (`PersistableLogic.restoreItem` → `admitWhile`).

`Carrying.isHonest(item)` is the walk the invariant means: a slot
occupant, or placed on a host that is itself honest on the body, or
inside such a thing.

## Hands and grip

The hands are `Attired`'s (W8) — the slot substrate's fact, so any body
answers them by its plan; the grip and the free hands are the carrier's.

- **`handSlots()`** (`Attired`) — the body plan's slots whose `bodyPart` serves
  `manipulation`: the biped's `hand:left`/`hand:right`, the `canid` plan's
  `mouth` (a dog carries a stick, a lead's end — one thing). A horse has
  none.
- **`freeHands()`** — hand slots that are empty and can grip
  (`Vitals.canGrip`), **less a hitched cart's `handedness`**.
- **`heldThings()`** (`Attired`) — what the hands hold. `held` means a hand slot,
  everywhere: the load gauge, MQL's `:held`, `wornStack` (which skips
  hands — a coat in your hand is held, not worn), `equip`.
- **A hand takes any good** — `Good` and `Vessel` are slottable, and a
  carrier's hand slot admits any slottable thing whatever its `accepts`
  ([slot.md](./slot.md)). The grip decides.

### ⭐ Two hands by weight, two hands by use

The grip (the carrier's private `handsFor`, read through
`wieldPlanFor`):

- `null` — heavier than the strain ceiling (`too-heavy`);
- `2` **by weight** — mass over `ONE_HAND_FRACTION` (0.3) of the holder's
  carry capacity, or longest side over `TWO_HAND_LENGTH` (0.6) of its
  stature. Derived, so a gnome needs both hands where an ogre needs one;
  no strength stat is added;
- `2` **by use** — the thing's Wieldable claim names two hand slots
  because its *use* needs two (a bow: one hand holds, one draws; a
  musket; a spear couched as a pike). Authored, and only for use: a
  weapon row whose two hands were only about weight lost its claim — the
  holder decides;
- else `1`.

`wieldPlanFor(item, claim)` is the one question (the `*PlanFor` shape):
the slots it takes — a one-hand claim widened to two when the weight or
the reach says so — or `too-heavy` / `hands-on-cart` / `hands-needed`.
`equip` asks it, and words the body's own refusal.

## The tiers — hand · ready · packed

`tierOf(thing): 'hand' | 'ready' | 'packed' | 'elsewhere'`, read off the
slots and the placement pairs, never stored:

| tier | what | a … |
|---|---|---|
| **hand** | in a hand slot | the mug you are holding |
| **ready** | worn; or hung `from` / pocketed on a worn host; or inside a container that is worn off the back, hung or pocketed | a key in a pocket, a holster on the belt, the canteen clipped to a pack's strap, the satchel at your side and what is in it |
| **packed** | inside a container in the `back` slot | the rucksack's contents — *take it off first* |
| **elsewhere** | not on this body | — |

The slot named `back` is what makes a pack's inside packed: a satchel
row claims `[torso]` and is ready, a rucksack claims `[back]`. Two rows,
no flag. `inventory` buckets what is directly on a body by `tierOf`
(held · regions · worn · ready containers · packed containers — the
controller's `tiersOf`); the carrier's private `carryPlaces()` is the
arrival walk's order: worn pockets, then containers hung from or pocketed
on a worn host, then worn containers off the back, then the back.

## Homes

A home is **the carrier's knowledge** of where a thing lives — no field
on the thing (a brick has no home). `put <thing> in/on <container on
me>` sets it (`ContainmentLogic.putPlanFor`'s completion), and so does
`bringToHand` when a thing had none. `setHome(item, host, region?)` —
a home can be a pocket by name, and `homeOf(item)` answers
`{ host, region? }`. Homes are forgotten **lazily**: `homeOf`
drops one when either end has left the body, so `drop`, `give` and a
sale need no hook. Persisted by `captureSlice` as `HomesSlice` ends —
`{kind: 'chattel', chattelId}` or `{kind: 'path', path, templatePath}`
(never a stuffId, which does not survive a restart) — and restored by
`hydrateSlice` after contents and the estate.

## ⭐⭐ Readying

`ready(item)` is the model's act — the thing comes to hand:

- already in hand → ok;
- **ready** tier → free a hand: `stow` puts the held thing back in its
  home if it still fits (a homeless held thing goes to the first carry
  place it fits, which becomes its home), else refuse **`hands-full`**,
  naming the held thing and both ways out — *drop it* or *put it away
  first*. **Never dropped for the player.** Then `bringToHand`, which
  returns a `ReadiedOutcome` — where the thing came from and where each
  held thing went (`CarriedAt` facts) — that the verb words
  (`readiedWords`: *you sheathe your sword and pull out your compass*);
- **packed** → refuse `packed` (*"It's packed in the backpack — take it
  off first (`remove backpack`)."*);
- in the room: a fixture is used where it stands; a portable thing
  refuses **`pick-up`** (*"You'd have to pick the tape up first (`get
  tape`)."*); in another body → `not-on-you`.

⭐ **A verb asks for it with one arg field.** A view's object arg
declaring `readies: true` is readied by the dispatcher
(`CommandGiver._executeOne`, after the validators) before the controller
runs, and the outcome or refusal is worded there by a clone of the verb's
controller (`carryRefusalWords` / `readiedWords`) — the body decides. Only a
single bound thing is readied. The views: `measure`/`analyze` `tool`,
`read`, `light`/`douse`, `pour` `source`, `fill`/`drink` `target`,
`shape` `instrument`, `fit` `tool`, `cut` `tools`. See
[command-spec.md](./command-spec.md).

### Readying in a fight is priced by holder

In a live combat session `ready` is the weapon switch generalized to any
item (`Combatant.beginWeaponSwitch(item)`): guard down, no instrument,
for the seconds **combat prices** (W8 — `CombatLogic`'s module-private
`switchSecondsFor`, by the `combat.*` dials; the carrier reports what is
in the way through `handsToFree(item)`) — **two halves**, each priced by
where the thing goes or comes from:

| holder | seconds (dial) |
|---|---|
| dropped | 0 |
| a shaped holder (`shapedTo` set — a holster, a scabbard), a `from` clip, a non-hand slot (the `sidearm` sheath) | `combat.draw.seconds` (1.5) |
| an open pocket, an unshaped pouch, a homeless put-away | `combat.reach.seconds` (3) |
| a pocket that `closes`, or a shut pouch | + `combat.unfasten.seconds` (3) |
| packed | refused — `remove` of a worn pack in a session costs `combat.switch.seconds` |

`beatsForSeconds` rounds the sum up. The act does not wait for the
switch: the readied act runs on the thing where it is, and the beats are
the price. `fight draw`/`fight switch` are callers of `ready`. The start
line names the holder (`FightSwitchController`'s — *fumbles at her coat
pocket*, *her hand drops to her holster*); the landing is combat's own
beat (*you have the sword in hand*). No competence term yet. See
[combat.md](./combat.md).

## Pockets — named placement regions

A pocket is a **region its garment offers**, never an object. `Garment`
composes `PlacingMixin` with a class default of no placements, and a row
names its pockets as entries over the `/platform/placements/pocket`
document (`encloses: true`, words *into* / *in*):

```yaml
placements:
  - { member: /platform/placements/pocket, name: left pocket,
      mouth: { width: 0.12, height: 0.035 }, volumeM3: 0.0006 }
```

The pocketed thing lives in the **wearer's** contents with the pair
`(trousers, left pocket)` — as the ham lives in the room with `(hook,
from)`. The entry's `mouth` and `volumeM3` are the tape measure
(realistic: a key, a coin, a matchbox go in a trouser pocket; a mug does
not). **`covered: true`** (an inner pocket) hides it from other people;
an outer pocket is covered when its garment is not outermost. **`closes:
true`** (a buttoned breast pocket) is fastened — shut for pressing and
perception, a fastening to undo in a fight — with no flap state and no
button verb: it still costs you the choice of pocket.

`put key in coat` takes the one pocket that fits or asks *"Which — the
left pocket or the right pocket of the coat?"*; `put key in inner pocket`
names it (a region's name is a word its host answers to). A bare `pocket`
binds the first pocket of the nearest garment. See
[spatial.md](./spatial.md).

## The belt — every from-host

A **belt** is a `Garment` row claiming `[waist]` with `placements:
[from]`. The same row shape is the bandolier and the chest harness
(`[torso]`), a pack's straps (`Pack` composes `Placing` — a canteen
clipped to a strap is ready while the inside is packed), the pack saddle
(`back:1` and `from` — two panniers hang), a key ring (`round`, its
circumference), a pegboard and a tool rail. **No belt class.**

What hangs is bounded by **length** (each thing its hanging width, the
first always taken) and **strength** (the material's
`tensileStrengthMPa`); a worn belt's length is its wearer's waist
([size.md](./size.md)). `roomFor(region)` answers in words — *plenty*,
*one more pouch*, *a small thing*, *none* — and `i belt` prints it.
`put holster on belt` → *"You clip the holster to your belt"*; `get
holster from belt` takes it off. A hung thing is **fastened**: it stays
put in water and zero g. Hung rigid metal **clanks** (below). What hangs
widens the body: hung things ride flat at the flanks by their thinnest
side, and a laden mule is refused at a narrow gate.

**Holders.** A holster, sheath, scabbard or quiver is a `Pack` row with
`shapedTo:` (a row path or a mixin name — the holster names the pistol
row, the quiver the arrow row, the canteen clip `BulkableMixin`), an
authored `mouth` and `shape: rod`. Draw-fast **derives** from `shapedTo`:
a holster on the belt draws faster than a pouch on the belt. A belt
pouch, purse, saddlebag or pannier is a `Pack` row that claims no body
slot and hangs; a bumbag claims `[waist]` (its own strap).

## ⭐ What is placed on a thing travels with it (D33)

`ContainmentLogic.moveCore` carries every thing whose pair names a moved
host into the host's new environment **with its pair kept** — a coat
taken off, given away or hung in a wardrobe keeps its pocketed key; a
belt taken off brings its pouches. The followers arrive *placed*, so a
body receiving a coat admits them; the whole bring-along is asked of the
destination first, so a refusal moves nothing (a body's `arrivalFor`
admits a placed arrival). See
[spatial.md](./spatial.md).

## Leading and hitching

- **Hitching takes hands.** `hitch` refuses `hands-on-cart` when
  `freeHands()` is fewer than the cart's `handedness`; while hitched,
  `freeHands()` is reduced by it and an arrival or `ready` says so (*"Your
  hands are on the handcart — `unhitch` it first."*).
  `Drivable.getDriveHands()` is a hauled host's `handedness`, else its
  authorable `driveHands` (default 2 — reins). See
  [conveyance.md](./conveyance.md).
- **Leading.** `tie rope to mule` resolves to the **halter** — the first
  `Tieable` in `Attired.wornStack()` (the `/trade/tanning/thing/Halter`
  class; `Carrying.halter()` retired, W8): the rope's end hangs `from` the
  halter and the free end comes to the leader's hand. A tieable with no
  `from` has the rope moved onto the animal, which places it; none →
  `no-halter` (*"the mule wears nothing to tie to"*). `Rope.tieTo` leads a
  body that is handless **or wears a halter** — any body, carrier or not
  (a haltered hog is led)  — so a dog (whose mouth is a hand) is led on its
  collar, and a person handed a rope takes it in their hands.
  `Mobile.crossExit` leads: for each held line end whose far end is on a
  led body in the same place, it pre-checks `exit.canTraverse(animal,
  its default mode)` — a refusal refuses the leader (*"The mule won't
  follow you: …"*) — then the animal follows. The rope's length is not
  modeled across rooms.

## What the body stops with

`releaseHeld(slots?)` moves each hand occupant to the enclosing place
with a scene line. `Vitals` calls it when the body **goes under** (a fall
from conscious read in `reconcileConditions` — dying and sedation read
unconscious) and on **severance** of a hand's part. Worn things stay.
Death still moves everything to the corpse. Logout drops nothing.

## Restores and guests

- **First-load placement** (D32) is code on the restore hook, never a
  script: `Carrying.onRestored()` → `placeLoose()`, which takes each loose
  thing out of the body and lets the body place it (its `arrivalFor`) —
  hands, pockets, packs — else the residence, else the feet (the one
  overflow, above).
- **An owned host keeps its pairs across a restart**: a pair whose host
  is an owner-persisted good is captured as `hostChattelId`, and an owned
  good placed on a host records `placedOn` on its estate entry; the
  restore re-places both after re-wearing (a worn belt's length is its
  wearer's waist, so pouches re-hang as worn).
- **A guest's borrowed things go home** (D37). Before a guest is reaped,
  `returnBorrowed()`: a good titled to someone else goes to its owner's
  hands (else set down where they stand), anything untitled the guest
  held or pocketed is dropped where it stands, what it wears is reaped
  with it.

## Noise, awkwardness, running

- **`gearNoise(): 0 | 1`** — 1 when a held thing, or one hung `from` a
  worn host, is rigid and rings (`ringSound().rings`, else a `metal`
  tag): a sword on a belt, a lantern in hand, a key ring. A thing in a
  pocket or a shut pouch is silent. `LocomotionLogic.emissionAt` lifts the
  mode's `noiseLevel` one band — what `sneak` and stealth read.
- **`awkwardnessOf(item)`** — the burden gauge's (`LoadBearing`, W8):
  `1 + AWKWARD_LENGTH × max(0, longest/stature − 1) + AWKWARD_BULK ×
  volume/bodyVolume`, multiplying a held load.
- **`run` refuses `awkward-load`** naming the thing when a held thing is
  longer than `RUN_AWKWARD` (1.0) × stature or more awkward than
  `RUN_AWKWARD_FACTOR` (1.5): you walk the pole. See
  [locomotion.md](./locomotion.md).

## Seeing what others carry

Perception decides, not MQL ([perception.md](./perception.md)): on
another body you see what is in their hands, the outermost layer at each
slot, what hangs from their belt, and an uncovered, unfastened pocket's
contents — never an inner pocket, a buttoned one, or a shut bag.
`inventory <person>` lists exactly that. `search <body>` on a body that
cannot resist (a corpse, the unconscious) finds what its pockets cover;
a conscious one refuses (*"Bob won't let you"*).

## The verbs

| verb | what it does here |
|---|---|
| `get` | `canReceive`, then `move` — a hand, then a pocket or bag it fits; a no-slot pouch onto the belt |
| `put X in/on/from Y` | onto a host or into a container; pockets by name; sets the thing's home when `Y` is on you |
| `give X to Y` | `canReceive` first (on the recipient as a container — no narrowing), then `move` |
| `drop` | to the place; instant, and free in a fight |
| `inventory` (`i`) | by tier — *In hand* · *Ready* (each pocket and hanging member by name, each ready container with its perceived contents) · *Worn* · *Packed* (each pack as *N things, M kg*) — then the burden in words. `--all` `--flat` `--held` `--ready` `--worn` `--packed` `--weight`; `i <container>`, `i belt` (what hangs and the room left), `i <person>` |
| `wear` / `wield` / `equip` | `seatInSlots` by the claim; the grip by `wieldPlanFor` |
| `fight draw` / `fight switch` | `ready` in a session |
| any `readies:` verb | readies its tool first |
| `stoop` / `crawl` | lower profiles through low ways ([size.md](./size.md)) |

The player's guide is the `carrying` wiki guide (base-library
`guide/carrying`).

## ⭐ The census gates

- ~~**`lint:body-moves`**~~ — **retired W8**: it counted the moves onto a
  body so each could be ported to `receive`; with `move` the receiving act
  there is nothing to port, and a body with no honest place throws at run
  time, naming why.
- **`lint:perceived-surfaces`** counts every surface that shows a viewer
  a list it never asked `PerceptionApi.perceived` about. 32 → **0** at W3.

See [lint-family.md](../lint-family.md).

## Dials — `CARRYING_DEFAULTS`

`ONE_HAND_FRACTION` 0.3 (of carry capacity — a 70 kg human holds 10.5 kg
in one hand) · `TWO_HAND_LENGTH` 0.6 (of stature — a 1.75 m human's
1.05 m). The awkwardness dials (`AWKWARD_LENGTH` 0.5 · `AWKWARD_BULK` 1.0 ·
`RUN_AWKWARD` 1.0 · `RUN_AWKWARD_FACTOR` 1.5) are `LOAD_BEARING_DEFAULTS`'. A body whose carry capacity reads 0 (no mass
yet) is not judged by weight. The combat seconds are app settings
(`combat.draw.seconds`, `combat.reach.seconds`, `combat.unfasten.seconds`,
`combat.switch.seconds`).

## Deferred

- **The ledger's pre-check for cash** — coins minted after the post take
  the made fallback (to you, else at your feet); a pre-check before the
  write would mint first and destruct on refusal.
- **A competence term in readying** (the combat slate).
- **Autocomplete** must obey the perception filter when it exists.
- **The roof rack** (an outside surface on an `Exitable` host).

## History

- **Size and carrying (2026-11-11 → 2026-11-12, `39d4ba23e..50f562ed4`).**
  The subsystem landed in eight waves: the census and `receive` (W0),
  hands, tiers, homes, readying and the kernel ports (W4), pockets, worn
  and hung containers, the tiered inventory and the pack ports (W5), the
  gear rows and the starter kit (W6), and **the flip** (W7) — the
  `loose-on-body` veto, `receive` as one resolution, the three idioms
  across every site, `held` = a hand everywhere, first-load placement and
  the guest return. Before it, `get` claimed no hand: a thing sat loose
  in the body's contents and paid a held surcharge
  ([encumbrance.md](./encumbrance.md)), and *hand slots were for
  activities, not storage* ([embodiment.md](./embodiment.md)).
- **W8 — `move` just works (owner review, 2026-11-12).** The owner read
  `Carrying` (35 members) as *"a camel or hydra or blind man's elephant"*
  and set the shape: *"if I'm a content author and I need to just move
  something into someone's inventory … I can call `move(item, whoever)`
  and I don't really have to worry about anything else"* — and *"the one
  thing I don't want is for move to lie."* So: the body places what
  arrives through `Container.arrivalFor`, or `move` throws; `canReceive` is
  on every container; the `receive` family is deleted (no synonym for
  `move`); the invariant is every `Creature`'s and fails closed; the
  capability composes on the four carrier classes; the hands are
  `Attired`'s, awkwardness the gauge's, the switch's seconds combat's, and
  the words the controller's. `Carrying`'s interface is 14 members.
