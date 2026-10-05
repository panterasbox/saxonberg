# trade-chandlery

One dip, two fats. The whole pack is two verbs and three rows.

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
- `src/idea/cmd/chandlery/MeltController.ts` — `melt <solid>`: fat or
  wax into the pot.
- `src/idea/cmd/chandlery/DipController.ts` — `dip`: the candle.

⚠ **Two verbs, and the plan said none.** `make <recipe>` runs a recipe
*script* (a session `def` or a learned home recipe), not an authored
catalogue recipe — every trade in the tree ships its own craft verb for
that, and this one is no exception. Recorded in the plan.
