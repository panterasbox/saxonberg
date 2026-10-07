# trade-chandlery

One dip, two fats. The whole pack is one verb and three rows.

⭐ **The design claim, and the thing not to undo.** `recipes/candle.yaml`
authors **no** `outputMaterial` and **no** `outputAppearance`. That is
not an omission — it is the feature. `CraftingLogic.applyTangibleOutput`
derives the output's material from the matched input when none is
authored, so the same recipe over a pot of beeswax and a pot of tallow
makes two genuinely different candles, and `Candle`'s descriptions are
built from the material rather than welded.

Welding either field back on would collapse the pack to the state it
replaced: a candle that is always wax, whatever you dipped it in.

- `src/thing/Candle.ts` — a `Lamp` that smells of what it is made of.
- `src/idea/cmd/chandlery/DipController.ts` — `dip [the cake] [in
  <pot>]`: the candle, and the melt that fills the pot when what you
  have is a cake.

⚠ **One verb, and the plan said none.** `make <recipe>` runs a recipe
*script* (a session `def` or a learned home recipe), not an authored
catalogue recipe — every trade in the tree ships its own craft verb for
that, and this one is no exception. Recorded in the plan.

⭐⭐⭐ **`melt` was a second verb for one build, and is an ALIAS now.** The
argument for it was that the pot has to be filled before anything can be
dipped out of it, and that beeswax arrives as a *cake* where rendered
tallow arrives liquid in a crock and is simply `pour`ed in. The asymmetry
between the two fats is real and still modelled — what was wrong was
spending a verb on it. Melting is the first STEP of the only act this
pack has, and the verb-collision ladder's first rung is *unify behind an
interface*: `dip` attempts the candle, and only if the pot has nothing to
give does it reach for something solid, melt it (narrating the melt) and
try again. Tallow therefore never takes that path at all.
