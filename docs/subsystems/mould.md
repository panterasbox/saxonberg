# Moulds — the vessel decides the shape of what sets in it

A **mould** is a vessel that answers one question: *when what is in me
sets, what shape comes out?* Shipped by the dairy build (2026-10), with
three consumers on day one: the **cheese hoop** (curd sets by draining),
the **ingot mould** (molten metal sets by freezing) and the **ice pan**
(water sets by freezing).

Source: `packages/server/src/mud/lib/mould/Mould.ts` (`MouldMixin`, the
`Mould` interface, `SetPool`, `MadeFromHolding`) and the instanceable twin
`packages/server/src/mud/platform/thing/Mould.ts`.

## ⭐⭐ The container decides; the material sets

> ⭐ **A firing asks the mould too (rubber build, 2026-10).** `fire`
> reaches one level into a mould standing in its chamber and hands it the
> outcome as a pool — the same `castInto` the freeze edge calls — so a
> rubber charge in a boot mould comes out as boots; the cast takes the
> weaker of the mould's grade and the cure's. And `holdsCast()` is true
> only for a CAST (a thing of the mould's shape, or a cracked mould's
> lump): a mould charged with solids waiting to be fired is not "set".
> The seam is moulding-slate § 5's. See [rubber.md](./rubber.md).

Before moulds, two things decided the shape of a set solid and neither
was the container:

- the **material** — `Material.castTemplate`, read at the freeze edge (so
  water froze into an ice *block* in a bucket);
- the **recipe** — `outputTemplate`.

A mould is the claim that the **container** decides, and that a recipe
owns no shape. So **the set site asks the container first and falls back
to the material**:

```
template    = mould?.castTemplateFor(material) ?? material.getCastTemplate()
destination = mould ?? the vessel's own scope
```

A plain vessel keeps the old behaviour exactly — the lump drops *beside*
it. A mould keeps what set in it, in its own shape, **inside it**, until
somebody takes it out (`get wheel`, `get ingot`, `get block` — a plain
`get` reaches into an open mould; ⚠ `get X from Y` has no `from` and
takes the mould as well).

⭐ **How a thing sets is the MATTER's business, never the mould's.** Two
set processes ship:

| process | the material's fact | driven by |
|---|---|---|
| **freezing** | `meltingPoint` + `latentHeatOfFusion` | the thermal reconcile — `Thermal.reconcileBulkPhase` asks `castInto` when the pool sets |
| **draining** | `Material.drainSetting { days, becomes?, becomesAs?, moisture: {unloaded, loaded}, loadRef }` | the mould's own reads — `MouldMixin.reconcileSetting` |

A **drain set** progresses at `(1 + ratio) / days` per game day, where
`ratio = min(1, loadKg / (poolKg × loadRef))` — the weight placed **on**
the mould (a hoop composes `PlacingMixin`; `loadKg()` is the mass of what
is placed `on` it). The set thing's moisture is
`unloaded + (loaded − unloaded) × ∫ratio` (a stone put on halfway presses
it halfway), its mass is the pool's less the water driven out, and its
material is `becomes` (curd → cheese). Dry, cure and bake are the next set
processes and hang on the same hook.

## What rides onto the cast

The pool's payload is carried onto a cast **that can hold it**, by
narrowing on the clone:

- `maker` → `Crafted.setMaker` (the payload's, else the mould's own maker,
  which a fill into an empty mould carries in);
- the mould's grade → the cast's grade (a scalded vat's `poor` rides into
  the wheel);
- ⭐ the mould's `discipline` → `Crafted.castDiscipline` (repair D1,
  2026-10-17): the cast remembers WHICH TRADE its mould is, because that
  is the trade that mends it — the pour credits the pourer and forgets,
  and a consumed mould is gone after the cast, so it rides as a value;
- `freshness` → `Fresh.setMicrobialLoad`; `pathogens` → `Contaminable`;
- a drain set's moisture → `WaterActive.setWaterState`;
- `madeFrom` (the material a maturing batch was made from — maturation's
  own payload field) → the duck-probed `MadeFromHolding.setMadeFrom`, so a
  wheel can say it is *made from ewe's milk*.

⚠ An ingot composes none of these and is told nothing.

**Which material the cast is** (`SetPool.stampMaterial`): a **drain** set
always stamps `becomes` (one wheel row, every cheese) — or, when
`becomesAs` names the shape this mould casts, that shape's material: one
strike sets as loaf sugar in a cone and as raw sugar in a hogshead's
block (sugar, 2026-10-26: without it the estate's block was white loaf
sugar and no boiler recognized it); a **freeze** stamps
the pool's material when the pool is NOT `liquid`-tagged (a metal is the
same material molten or set — one ingot row serves copper, tin and iron)
and otherwise keeps the shape row's own (an ice block is ice, never water).

## Reusable and consumed

`reusable` (default `true`): the cast moves INTO the mould and the mould
wears by `wearPerCast` (`Durable`; `repair` mends it). A **cracked** mould
casts the material's own lump — the shape is the mould's only while the
mould is whole. A consumed mould (`reusable: false`) is broken to release
its cast; it ships and no row uses it (the first casting trade that needs
sand or wax does).

## ⛔ No verb

The acts are the shipped ones — `pour` into the mould, `put` a weight on
it, `look` at it (*filled · setting · set*, never a number), `get` the set
thing out. **A pour INTO a mould authoring a `discipline` credits it** at
`standard` (`PourController`), so there is no recipe, nothing for a deed to
gate, and nothing a `mould` verb would do that these four do not.

## What composing it claims

*A made, wearing vessel that holds what set in it.* `MouldMixin` requires
`Bulkable` (the pool), `Thermal` (freezing is heat) and `Container` (the
cast stays in it). ⛔ Not every vessel is a mould: a pail, a pot and a
crucible are not, and a pool left in one sets as a lump.

| host | composition | rows |
|---|---|---|
| `platform/thing/Mould` | `Mould(Durable(Crafted(Thermal(Bulkable(Container(Good))))))` | `ice-pan` (commons), `ingot-mould` (smelting) |
| `trade-dairying` `Hoop` | `Placing(Mould(Durable(CraftVessel)))` | `hoop` — food equipment that takes a press |

## ⭐ A pool sets because it has cooled

`Thermal`'s post-drift driver runs the phase for every thermal bulk holder
(the climate build's D7 — *a pool freezes because it is cold*, the mirror
of *a solid melts because it is warm*). So molten metal sets by itself in
a crucible or a mould, and water freezes in an ice pan wherever it is cold
enough — a freezer, or a winter street. ⓘ The dairy build first shipped a
narrower driver for non-`liquid` pools only; the climate build's general
rule superseded it at the merge.

## The smelt and the crucible (the second consumer)

The smelt's LIQUID branch runs the metal, as bulk at the furnace's held
heat, into **the crucible standing in the furnace** (the player put it
there); the player **pours the crucible into the mould** while it is
molten. ⛔ The engine picks no mould. Left to cool, a crucible holds a
lump; with no crucible the metal pools on the hearth and sets as a lump in
the furnace. Bare-handed `get crucible` scalds (the shipped hot grab);
pouring it where it stands burns nobody.

## ⭐ The mould keeps its drainings (sugar, 2026-10)

A drain set no longer throws away what it drives out. `DrainSetting`
gains `drains` (what the drained matter IS, e.g. molasses off a sugar
loaf) and `drainPerBand` (an extra share per grade band below `fine`: a
poor strike gives up more and keeps less). When the mould stands ON a
vessel that can take them (`drainsInto()`: the placement host, Bulkable,
with an interior), the drainings are credited to it **as the set
progresses**. Each step credits `total × progress`, tracked in
`setDrainedKg`, and the remainder lands at the set. The cast's mass is
what is left. The drainings get a **fresh payload**, not the pool's,
so they cannot carry the pool's treatment, and a grade one band below
the mould's. A sugar cone on its curing pot is the first consumer; a
mould on a board keeps today's behaviour (the whey runs away).

## ⭐ Percolation — a liquid through a porous solid (sugar, 2026-10)

`PercolatingMixin` (`lib/material/Percolating.ts`) composes on a porous
SOLID. `receivePercolant(litres)` puts liquid on it. The **reach**
(`0..1`) advances on read over the host's `percolationDays()` while
liquid is working, and each advance calls the host's
`@hook onPercolated(from, to)`. `percolatesInto()` names where what
comes out goes: the vessel below the mould the solid sits in (a loaf in
its cone on a pot), else the vessel it is placed on. A clayed sugar loaf
is the first consumer: its head washes white past a third of the reach,
its middle past two-thirds, its foot when the water is through, and
the molasses it carries out runs into the pot. The lye hopper's ash is
the planned second consumer (the potash build).

## Deferred

- **Other moulded goods** — candles and soap (`rendering-slate`), bricks,
  baking tins, press-moulded ceramics, glass press- and blow-moulding —
  each a `Mould` row plus a set process.
- **Dry, cure and bake as set processes** on `reconcileSetting`.
- **A consumed mould** (sand, lost wax) → the first casting trade.
- **The pool's payload onto a non-food cast** (dirty water → a dirty
  block).
- ⚠ **Nothing refuses molten metal into a vessel that cannot take it**:
  `BulkableApi.transfer` reads closure and blends heat, never the
  receiving vessel's melting point. A finding for `bulk.md`.
