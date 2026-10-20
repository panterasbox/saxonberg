# From ceramics (build-3) to sugar and potash — 2026-10-20

The three builds run in parallel and **nobody waits** (the owner's
ruling). Ceramics' full per-file table, with the resolution for BOTH
landing orders, is `docs/plans/ceramics-plan.md` § *Merge protocol*
(`git show origin/reqs/ceramics:docs/plans/ceramics-plan.md`). This note
is only what we change in the files you touch, the shapes we copied from
you so the second lander's merge is near no-op, and what you would do if
we land first. Before our MR merges we probe each of your tips merged
onto ours in a throwaway detached worktree + `lint:family` (repair's
precedent); you may want to do the same with ours.

**What ceramics changes that touches you (the headline):** ⭐ **`fire` has
no recipe path any more** (the owner's M1 — *one rule fires everything*).
Materials declare `heatTransitions` (dose = `holdS·10^((T−ref)/zK)`, the
rubber cure's arithmetic generalized), every `Thermal` body integrates
its own heat-work off its own trajectory, and a firing recipe row is a
dead row the day we land. We delete `burn-lime`, `fire-pot`,
`retort-wood`/`retort-coal`, `vulcanize`, `remelt-cullet`, and make the
glass batch a `stir` mix. `FireController.ts` is rewritten (light, hold,
`--draught <word>` option, settle). `Crosslinking.ts` becomes
`HeatTransition.ts`.

**For everyone:** never hand-merge `pnpm-lock.yaml` (resolve by `pnpm
install`); recount `PackLogic.discover.test.ts` on the merged tree (we add
`trade-ceramics`: +1); numeric ceilings are recomputed on the merged
tree, never summed; `Material.ts` — we APPEND every new field at the end
of `fieldMeta` and every accessor at the end of the class, so your
mid-file regions are untouched; `Thermal.ts` — we never edit
`effectiveR()`.

## To sugar (build-1)

What we copied from you, verbatim, so one copy survives the merge (delete
ours if you land second, delete yours if we did):

1. **`BulkPayload.dissolvedSolidsKgPerL?: number`** — your declaration
   (same comment, same type) in `lib/thermal/Thermal.ts`.
2. **`Material.solidsKgPerL` + `getSolidsKgPerL`/`setSolidsKgPerL`** —
   your accessor pair and semantics (`0` for a non-solution).
3. **`BulkableLogic.transfer`'s solids fold** (step 5) — your hunk.
4. **`Mould.drainsInto(): (Stuff & Bulkable) | null`** — your signature
   and body (the vessel the mould stands ON). We use it for the salt pan's
   bittern (W8) and the ceramic water filter.
5. **`Thermal.heatSource(): (Stuff & Burner) | null`** — public, your
   signature and doc (we need it for the atmosphere read).

What we add beside yours in the same files:

- `Thermal.ts`: `heatWork` + `reconcileHeatWork()` called right after
  `reconcilePhase()` in `reconcileThermal()`; `evaporativeDepressionK()`
  read in `ambientTrajectory()`'s flat branch; `poolVesselIn()` in
  `doMelt`; a **crystallize arm** inside the same `if (bp > 0 && temp >=
  bp)` block your `concentrateIfReached` sits in — ours goes BEFORE yours
  if we land first, AFTER yours if you do; either is one line of
  placement. We do not touch your `fireCouplingR` in `effectiveR()`: if
  we land first, re-apply it there (the method is unchanged by us).
- `Mould.ts`: a `cure` early-return block ABOVE the drain arithmetic in
  `reconcileSetting`; a slip-absorption branch (never an edit to
  `creditDrainings`); `impression`, `receivedPour`, `pourSuperheatK`,
  `pourDurationS`, `pressRelease`; and **`loadKg()` is renamed
  `loadN()`** (press force + weight) — your `reconcileSetting` calls it
  once; rename the call.
- `Material.ts`: `heatTransitions` replaces `crosslinking` (one line in
  `fieldMeta`, one field, one get/set pair); everything else appended.
- `BulkPayload.composition?: CompositionEntry[]` (from
  `Composition.ts`) — a molten pool keeps what was dissolved in what
  melted into it; folded by volume beside `dissolvedToxins`.
- `mould.md` is rewritten (envelope, impressions, the pour, pressing,
  cure). Your drainings paragraph (D16) stays verbatim under *The drain
  set*; if we land first, add it there.

**Your cone row** (`trade-sugar/…/thing/cone.yaml`, `_materialPath:
ceramic/ceramic`): when both are in, it is `_materialPath:
/stuff/idea/material/ceramic/earthenware` with `coats: {inside:
[{material: /trade/ceramics/idea/material/glaze/lead, thicknessM: 0.0003,
state: fused}]}` and `class: /trade/ceramics/thing/Cone` (so a potter can
make one). Two keys; whoever lands second edits it.

**If we land first:** merge master; keep ONE copy of items 1–5 (identical
text — git usually does it for you); re-apply `fireCouplingR` into
`effectiveR()`; place `concentrateIfReached` after our crystallize arm;
rename your `loadKg()` call; add your drainings paragraph to `mould.md`;
recount the pack test. Nothing of yours changes shape.

## To potash (build-2)

1. **Your `calcine.yaml` is a dead row the day `fire` loses its recipe
   path.** The conversion is one block on
   `content/trade/potash/idea/material/black-salts.yaml` and the deletion
   of the recipe:

   ```yaml
   heatTransitions:
     - key: calcine
       referenceK: 900
       zK: 40
       fullDoseS: 1800
       massRetained: 0.8
       ladder:
         - { atDegree: 1, becomes: /stuff/idea/material/mineral/potash }
       discipline: ashery
   ```

   The cake keeps its `Ash` class; its potash fraction rescales by
   `1/massRetained` (your D12a's arithmetic, now the transition's); the
   grade rule (your D12b) is the heat-work grade rule. Your wire step
   reads the cake's material after the burn instead of a new object.
   If we land first, you make this change at your merge; if you land
   first, we make it in our W0.
2. **`FireController.ts`:** your two hunks (fractions ÷ `massYield`,
   weakest graded input) do not survive our rewrite — the rules live in
   the transition. Re-pin your two `describe`s on a transition fixture
   (our rewritten `FireController.test.ts` has the shape).
3. **Your `openClamp` ash branch** (`CharController.ts`) is deleted by
   ruling A (charcoal is the wood transition; `char` only sets the
   draught, lights and holds). Its arithmetic survives: the wood
   transition's `oxidized` rung calls `Burner.mintAshHeaps(kg ×
   ashFraction, alkali)` when the method exists (a structural probe), so
   your heaps, your alkali and your unit mass are what a lost burn
   leaves. If we land first, your port is that one call; if you land
   first, we call it directly.
4. **Tags:** we adopted your vocabulary now — our glaze-flux rows carry
   `flux`, lime goes where `stabilizer` goes, and we never read
   `smelting-flux`. Your `burn-lime.yaml` slot edit meets a deleted file
   (limestone carries the transition); the deletion wins.
5. **Wood rows:** you add `alkaliShare` to nine `wood/*.yaml`; we add
   `heatTransitions` to the same nine. Union by key.
6. `Burner.ts`: your `ashAlkaliKg`/`mintAshHeaps` region and our
   `heldTemperatureKFor`/`heatCeilingFactor`/`chamberVapors`/`settleFiring`
   region do not touch; `fieldMeta` unions.
7. `rejection/…/thing/store-counter.yaml`: we add firebrick, crucible,
   lead and tin lines; `chandlery/thing/counter.yaml`: we re-point
   `soft-soap-jar` and `lye-flask` to the pottery's rows with an import
   backstop, you add a `buys` line — line-union.

**If we land first:** merge master; items 1–3 as written; everything else
is a union. Nothing of yours changes shape.
