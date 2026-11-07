# Digging slate — what digging is, everywhere in the game

> **Status: UNBUILT.** The general model was designed with the owner on
> 2026-11-02, inside the water-supply planning.
> **Shipping in water-supply:** the **hole** as kernel substrate (`HoleMixin`:
> banked depth, spoil, hoisting, standing depth and lining, the water strike),
> with the dug well as its only consumer; and drilling's bore striking water.
> **Left:**
> - graves (interment ships, the dig does not)
> - pits and pit traps
> - trenches and footings (construction)
> - cellars and dugouts (a hole that buds a place)
> - machines: the steam shovel and the dredge
> - blasting
> - the wand of digging as content
> - backfill
> - casing off an aquifer, and the uncased bore that fouls one
>
> **Size:** a build.

## 1. ⭐⭐ Four kinds, told apart by what the digging LEAVES **[DECIDED]**

| kind | what it leaves | verbs (shipped) | substrate |
|---|---|---|---|
| **extraction** | material in your hands: clay, stone, marl, turves, worms, spoil | `dig`, `split` | the ground's worked-act protocol: *the ground decides what comes up* |
| **improvement** | a changed state of the ground, banked and reverting: drained, cleared, limed, ploughed | `ditch`, `grub`, `lime`, `plough` | kernel ground improvement |
| **a hole** | a void at a POINT, with a depth | `bore` (drilling), `dig a well` (water-supply) | `HoleMixin` (water-supply); drilling's wellhead |
| **a place** | a space you walk into | `drive`, `sink`, `raise`, `hew`, `shore` | mining's warren mints rooms |

⭐ **A hole becomes a place when you can stand in it and move around**: a
cellar, a quarry pit, a mine level. Mining's warren already mints places. A
hole stays a point (drilling's doctrine: *a bore is a POINT, not a PLACE*).

## 2. ⭐⭐ Big and small are VOLUME and TOOLING, never different acts **[DECIDED]**

- Every dig moves earth. Its pace comes from the ground (hardness and
  stoniness, which ground character already prices) and the tool.
- A trowel, a spade, a pick, a steam shovel and an excavator answer the same
  command with different numbers. The reaper is *"a row with a bigger number"*
  than the sickle, and this is the same rule.
- A big dig is many acts, banked: the hole remembers its depth. A crew is
  several people banking into one hole.

Lens 5's test passes: an excavator answers the same command as a spade.

⭐ **A wand of digging is a tool, not a mechanism.** By arcane science, magic
pays its price list. Moving a cubic meter of earth is real work (breaking it,
then lifting it), so the wand is a digging tool whose pace is paid in charge.
`dig with the wand` is the same act.

## 3. ⭐⭐ The four physical rules every hole obeys **[DECIDED]**

1. **Spoil goes somewhere.** What comes out lands as a spoil heap. Backfill
   spends it.
2. **The deeper, the more you lift.** Past a few meters, spoil must be hoisted
   with a windlass, a bucket and a partner at the top. Well-sinking was
   two-person work, and the arithmetic says why.
3. **Walls stand to the ground's depth.** Past it, you shore or line. Three
   shipped instances are one rule: mining's `shore`, drilling's liner, and the
   well's brick lining. The collapsing trench (construction's hazard) is the
   same rule.
4. **Below the water table, the hole fills.** This is how a well strikes, why
   mines need pumps, and why New Orleans buries its dead above ground.

## 4. Open

1. The threshold at which a hole buds a place (size, or an act?).
2. Graves: depth, and the six-foot law as a governance row (lens 7).
3. Blasting: a charge as a tool, or its own act.
4. The machine's crew and fuel: the steam shovel is a `Powered` tool.
5. The dredge: digging under water (underwater and river substrate).
