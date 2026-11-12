# Carrying

The carrying subsystem answers **where a thing goes on a body, and what
the body knows about the things it carries**. A thing comes onto a body
one way — it is *received* — and the body decides where: a hand, a
pocket, a pouch on the belt, the bag at its side, the pack on its back.
Everything on a body is **held**, **worn**, or **placed** on something
worn. Nothing sits loose.

That one invariant is what makes hands mean something. A full hand is a
choice that costs you — what you hold is what you can use now, what is
in a pocket or on the belt is a moment away, what is in the pack is
packed — and the same body that receives a thing knows where it lives
and how long it takes to get it out in a fight.

The tape measure every placement asks is [size.md](./size.md). The
weight is [encumbrance.md](./encumbrance.md). The slots are
[slot.md](./slot.md) and [embodiment.md](./embodiment.md).

## The Cast

| Piece | Where | What it is |
|---|---|---|
| `CarryingMixin` | `lib/slot/Carrying.ts` | the receiving act, the hands, the tiers, the homes, readying, letting go |
| `CARRYING_DEFAULTS` | top of `Carrying.ts` | the dials (one-hand fraction, two-hand length, awkwardness, the run limits) — the `LOAD_BEARING_DEFAULTS` precedent |
| `carry.order` | `Carrying`'s `static settings` | `hands-first` (default) · `pockets-first` — a per-character setting |
| the veto | `Creature.canAddContainable` | refuses `loose-on-body` |
| pockets | `PlacingMixin` named regions + the `/platform/placements/pocket` document | a region of a garment, never an object |
| the belt | `PlacingMixin`'s `from` member + its hanging length | a `Garment` row with `placements: [from]` — no belt class |
| worn and hung containers | `Pack` (`Wearable(Slottable(Vessel))`, composes `Placing` and `Sealable`) | a satchel, a rucksack, a belt pouch, a pannier, a holster (`shapedTo:`) |
| the two gates | `lint:body-moves` · `lint:perceived-surfaces` | the census of ways onto a body; the surfaces that must perceive |

`CarryingMixin` is composed on **`Creature`**, outer of `Attired` and
inner of `LoadBearing` — it reads the slot substrate beneath it, and the
burden gauge reads it (awkwardness, hands). Not on `Actor`/`Agent` (a
shade carries nothing); not on `LoadBearing` (the gauge is weight, not
where). A `Corpse` is a Thing: it does not receive. Narrow with
`MixinApi.isCarrying(x)`. No Api: every act is the body's own method.

## ⭐⭐ `receive` — the one way onto a body

```typescript
body.receive(item, { prefer?, slot?, slots?, for?: 'hold' | 'wear' })
  // → null when it came on; a ReceiveRefusal (and nothing moved) when not
```

`receive` is one resolution (`resolveReceive`), which `canReceive`
reports dry — so the pre-check and the act cannot disagree. In order:

1. **Already in a hand** — nothing to do.
2. **The hang rule.** A worn container that claims no slot of this body
   (a belt pouch, the medic's pouch, a holster) **arriving from off the
   body** goes onto the first worn host that offers `from` with room —
   *you clip the holster to your belt* — before hands or pockets. One
   already on the body (`get holster from belt`) is taken in hand.
3. **A stack meets its like** in a hand, a pocket or a ready container
   and merges — it takes no hand.
4. **`carry.order`** between a free hand (or two, by `handsFor`) and the
   first **carry place** that fits (`carryPlaces()`, below) — never into
   itself or something inside it.
5. Else a refusal: `too-heavy` · `hands-on-cart` · `cannot-grip` ·
   `nowhere-to-carry`.

`slot:` pins a slot (`seatInSlot` — equip's claim), `slots:` several (an
NPC's wielded kit, `occupyAll`), `for: 'wear'` puts a garment on by its
claim. A body with no hands (a horse) tries only its worn containers; a
cat is told *it has nowhere to carry that*.

⭐ **The refusal is the tutorial.** `refusalWords` names what the hands
hold, what did not fit, and the next command in the actor's own pocket
names: *"Your hands are full — the mug and the lantern — and the map
won't fit in your pockets. Put something away (`put mug in left pocket`)
or set it down (`drop lantern`)."*

### The three counterparty idioms

Who is on the other side of the act decides what happens when the body
cannot take the thing (requirements' *made · handed · granted*):

| idiom | method | used by | when it will not fit |
|---|---|---|---|
| **made** | `receiveOrSetDown(item, at?)` | crafting output, harvest and tap yields, a catch, the pieces a cut or tear leaves, a drink made for you, a store's paid-out goods | set down where the body stands (or on `at`), with a line — **never refused after the inputs are spent** |
| **handed** | `canReceive(item)` before any write, then `receive` | `buy` (the counter, the consignment shelf), `give`, `put X in <person>`, reclaiming from a rack or shelf, a store withdrawal, untying a rope or line end, a tip jar, `get` itself | refused in words, **nothing moves and nothing is charged**: *"…stays on the shelf until you have one free. Nothing is charged."* · *"Bob has nowhere to take it — their hands are full. You keep it."* |
| **granted** | `await receiveGranted(item, opts?)` | the loadout and outfits, `props:` into a body, Gus's kit, a minted key, a bank card, a travel card, a claim ticket, a store receipt, the testharness hand, cash the ledger has already moved | the player's **residence** (a live room at `ParcelApi.heldUnitOf`), with a line; else at their feet, said so. An NPC's overflow is also `DiagnosticApi.record`ed (fix the loadout) |

A site whose destination may or may not be a body uses the port idiom:

```typescript
if (MixinApi.isCarrying(dest)) dest.receive(item);
else ContainmentApi.move(item, dest);
```

⚠ Cash is *granted*, not handed: the ledger post precedes the coins, so a
pre-check would belong to the ledger (a follow-up).

### ⛔ The veto — `loose-on-body`

`Creature.canAddContainable(item, how?)` runs the default tape measure
and then refuses `loose-on-body` unless:

- the thing arrives **placed** (`how.placed` — passed by `placeOn` and by
  the host-follow's followers), or
- it is an **agent**, or
- the body is **admitting** it — `Carrying.admitWhile(item, fn)`, gated
  `AnyOf(SelfOnly, FromModule(PersistableLogic))`: `receive`,
  `seatInSlot`, readying, and the restore's `restoreItem`.

A direct `ContainmentApi.move(x, body)` therefore throws. Taking a placed
thing off its host *into the same body* (`move(key, me)` with the key in
my pocket) asks the veto too — it was a way to loose. ⭐ **A body whose
plan is not known yet is not judged** (a fixture, a body mid-mint): it
takes a thing as the pre-flip body did.

`Carrying.isHonest(item)` is the walk the invariant means: a slot
occupant, or placed on a host that is itself honest on the body, or
inside such a thing.

## Hands and grip

- **`handSlots()`** — the body plan's slots whose `bodyPart` serves
  `manipulation`: the biped's `hand:left`/`hand:right`, the `canid` plan's
  `mouth` (a dog carries a stick, a lead's end — one thing). A horse has
  none.
- **`freeHands()`** — hand slots that are empty and can grip
  (`Vitals.canGrip`), **less a hitched cart's `handedness`**.
- **`heldThings()`** — what the hands hold. `held` means a hand slot,
  everywhere: the load gauge, MQL's `:held`, `wornStack` (which skips
  hands — a coat in your hand is held, not worn), `equip`.
- **A hand takes any good** — `Good` and `Vessel` are slottable, and a
  carrier's hand slot admits any slottable thing whatever its `accepts`
  ([slot.md](./slot.md)). The grip decides.

### ⭐ Two hands by weight, two hands by use

`handsFor(item): 1 | 2 | null`:

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

`wieldSlots(item, claim)` widens a one-hand claim to two when the weight
or the reach says so; `wieldRefusal` answers `too-heavy` /
`hands-on-cart` / `hands-needed`. `equip` asks both.

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
no flag. `carriedTiers()` sorts what is directly on a body (held ·
regions · worn · ready containers · packed containers) — the model's half
of the tiered `inventory`; `carryPlaces()` is the receive walk's order:
worn pockets, then containers hung from or pocketed on a worn host, then
worn containers off the back, then the back.

## Homes

A home is **the carrier's knowledge** of where a thing lives — no field
on the thing (a brick has no home). `put <thing> in/on <container on
me>` sets it (`ContainmentLogic.putPlanFor`'s completion), and so does
`bringToHand` when a thing had none. `setHome(item, host, region?)` —
a home can be a pocket by name. Homes are forgotten **lazily**: `homeOf`
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
  first*. **Never dropped for the player.** Then `bringToHand` and the
  scene line (*you sheathe your sword and pull out your compass*);
- **packed** → refuse `packed` (*"It's packed in the backpack — take it
  off first (`remove backpack`)."*);
- in the room: a fixture is used where it stands; a portable thing
  refuses **`pick-up`** (*"You'd have to pick the tape up first (`get
  tape`)."*); in another body → `not-on-you`.

⭐ **A verb asks for it with one arg field.** A view's object arg
declaring `readies: true` is readied by the dispatcher
(`CommandGiver._executeOne`, after the validators) before the controller
runs, and the refusal is rendered there — the controller is dumb. Only a
single bound thing is readied. The views: `measure`/`analyze` `tool`,
`read`, `light`/`douse`, `pour` `source`, `fill`/`drink` `target`,
`shape` `instrument`, `fit` `tool`, `cut` `tools`. See
[command-spec.md](./command-spec.md).

### Readying in a fight is priced by holder

In a live combat session `ready` is the weapon switch generalized to any
item (`Combatant.beginWeaponSwitch(item, {seconds})`): guard down, no
instrument, for `readySeconds(item)` — **two halves**, each priced by
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
line names the holder (`holderPhrase` — *fumbles at her coat pocket*,
*her hand drops to her holster*). No competence term yet. See
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
destination first, so a refusal moves nothing. See
[spatial.md](./spatial.md).

## Leading and hitching

- **Hitching takes hands.** `hitch` refuses `hands-on-cart` when
  `freeHands()` is fewer than the cart's `handedness`; while hitched,
  `freeHands()` is reduced by it and `receive`/`ready` say so (*"Your
  hands are on the handcart — `unhitch` it first."*).
  `Drivable.getDriveHands()` is a hauled host's `handedness`, else its
  authorable `driveHands` (default 2 — reins). See
  [conveyance.md](./conveyance.md).
- **Leading.** `tie rope to mule` resolves to the **halter**
  (`Carrying.halter()` — the first worn `Tieable` off the hands; the
  `/trade/tanning/thing/Halter` class): the rope's end hangs `from` the
  halter and the free end is received into the leader's hand. A tieable
  with no `from` has the rope received; none → `no-halter` (*"the mule
  wears nothing to tie to"*). `Rope.tieTo` leads a body that is handless
  **or wears a halter** — so a dog (whose mouth is a hand) is led on its
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
  script: `Creature.onRestored()` → `placeLoose()`, which takes each loose
  thing out of the body and `receiveGranted`s it — hands, pockets, packs,
  else the residence, else the feet.
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
- **`awkwardnessOf(item)`** — `1 + AWKWARD_LENGTH × max(0, longest/stature
  − 1) + AWKWARD_BULK × volume/bodyVolume`, multiplying a held load in
  the gauge.
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
| `get` | the receiving act (handed): a hand, then a pocket or bag it fits; a no-slot pouch onto the belt |
| `put X in/on/from Y` | onto a host or into a container; pockets by name; sets the thing's home when `Y` is on you |
| `give X to Y` | `canReceive` first, then `receive` |
| `drop` | to the place; instant, and free in a fight |
| `inventory` (`i`) | by tier — *In hand* · *Ready* (each pocket and hanging member by name, each ready container with its perceived contents) · *Worn* · *Packed* (each pack as *N things, M kg*) — then the burden in words. `--all` `--flat` `--held` `--ready` `--worn` `--packed` `--weight`; `i <container>`, `i belt` (what hangs and the room left), `i <person>` |
| `wear` / `wield` / `equip` | through `receive`'s `for: 'wear'` / slots and `wieldSlots` |
| `fight draw` / `fight switch` | `ready` in a session |
| any `readies:` verb | readies its tool first |
| `stoop` / `crawl` | lower profiles through low ways ([size.md](./size.md)) |

The player's guide is the `carrying` wiki guide (base-library
`guide/carrying`).

## ⭐ The two census gates

- **`lint:body-moves`** counts every `ContainmentApi.move` whose
  destination may be a body, against a hand-kept roster tagged by idiom
  (`made` · `handed` · `granted` · `inherit`, plus `allow` and
  `not-body`). Census 101 at W0, **0** since W5; the runtime veto is the
  backstop for its one blind spot (a parameter named `into`/`to`).
- **`lint:perceived-surfaces`** counts every surface that shows a viewer
  a list it never asked `PerceptionApi.perceived` about. 32 → **0** at W3.

See [lint-family.md](../lint-family.md).

## Dials — `CARRYING_DEFAULTS`

`ONE_HAND_FRACTION` 0.3 (of carry capacity — a 70 kg human holds 10.5 kg
in one hand) · `TWO_HAND_LENGTH` 0.6 (of stature — a 1.75 m human's
1.05 m) · `AWKWARD_LENGTH` 0.5 · `AWKWARD_BULK` 1.0 · `RUN_AWKWARD` 1.0 ·
`RUN_AWKWARD_FACTOR` 1.5. A body whose carry capacity reads 0 (no mass
yet) is not judged by weight. The combat seconds are app settings
(`combat.draw.seconds`, `combat.reach.seconds`, `combat.unfasten.seconds`,
`combat.switch.seconds`).

## Deferred

- **The ledger's pre-check for cash** — coins are granted after the post.
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
