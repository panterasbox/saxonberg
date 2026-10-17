# Note from storage-and-ice (build-4) to rubber, cleanliness and repair

Written 2026-10-17. The four plans were read side by side because all four
builds start at once. The full table of shared files, with how each
conflict resolves, is in our plan:
`git show origin/reqs/storage-and-ice:docs/plans/storage-and-ice-plan.md`,
§ *Parallel builds*.

**One rule for every shared file:** the build that lands second merges
`origin/master` first, then resolves the conflict by hand as that section
describes, then re-runs the named tests and drives. Never take a file's
"theirs" wholesale.

## To rubber (build-1)

1. **`reconcileEnvelope` gets one steady-state formula, and it lives in
   our `envelopeSteadyStateK(outsideK, atS)`.** The method takes `atS` so
   your solar term can enter it. The formula is:

   `T_ss = (U_ext·T_out + ΣU_i·T_i + ΣfixedW + driveW + P_solar(t) + ΣG_j·anchor_j) / (U_ext + ΣU_i + ΣG_j)`,
   with `τ = C` over the same denominator.

   Our occupant term is `RoomHeatExchange`, which has two implementers:
   `SpaceHeating` (positive) and the store (negative). Whoever lands
   second folds its terms into the other's version.
2. **We have adopted `Attired.immerse(parts?: (partKey) => boolean)`,**
   with the optional part filter your flooded cell passes.
3. **The wet law matches yours exactly:** `Material.permeability()`,
   `Material.wetProperty(dry, fluid, saturation)`, and the setting
   `wetness.impermeableBelowPct` = 2. Your plan still describes it as
   living on `MaterialLogic`/`MaterialApi` in a couple of places, but
   your D12.1 is the binding text.
4. **The ice material moves** to
   `/stuff/idea/material/bulk/ice` (`C/base-library/.../material/bulk/ice.yaml`),
   and the bottling row is deleted.
   - If we land first, author `lightAbsorption` there.
   - If you land first, we carry your line across when we move the row.
5. **`lint:biome-sky`:** our four icehouse rooms author `enclosure:`.
   - If you land first, we add `roof:` to them.
   - If we land first, your census authors it.

   The icehouse platform and house share a Structure, so under your D7
   they couple through their shared wall. The control shed stands in a
   Structure of its own.

## To cleanliness (build-2)

1. **Sawdust is one heap.** It is the carpentry `Sawdust` good (Poolable
   and Stackable, one stack per wetness band). Its material is tagged
   `[wood, organic, granular, flammable, absorbent, sawdust]`; we added
   `absorbent` and `sawdust` for your `strew` and your cleanser.
   - Sweep it **as a `Sawdust` stack**. Never fold it into
     `/stuff/thing/sweepings`: the icehouse keeper's `get sawdust` and
     the store's pool key both depend on the template.
   - Your `sawdust` `DirtKind` row is read by nothing today. Drop it or
     give it a producer.
   - If `Sweepings` merges goods, it needs a class.
2. **A water surface takes no dirt.** Our `WaterSurface`, and the
   `IceSheet` built on it, are floors: `bears(loadKg)` and
   `supportIsSlotted()` live on `FloorMixin`.
   - `receiveTraffic` and `soilFeetOf` should exempt them: a swimmer
     climbing out is wet, not muddy.
   - Map our eleventh ground kind, `ice`, in `cleaningMethod`.
   - Run your `soilAugmenter` after the sheet's `groundPhrase`.
   - Your fixture-state slice must not capture the sheet's `log`. The
     sheet keeps its own `(scope, key)` record.
3. **Immersion is ours:** `immerse(parts?)` and
   `SwimmableMixin.immersionOf` (Pools only). The frozen-water gate is
   `peekWaterRead(key)?.frozen` plus `room.getFloor().openWaterAreaM2() > 0`.
   Both match the names your plan already uses.
4. **The cookhouse:** you re-class its room and we edit its business and
   its cook. These are different files, so there is no conflict.

## To repair (build-3)

1. **`CraftingLogic`:** our W0 change is one small template-choice helper
   (off-spec lump plus salvage's metal branch), so it re-applies onto
   your rewrite. Our salvage test salvages a `Tool`, so it passes whether
   or not Tool is Assembled.
2. **`tickBusiness`:** our season rides only on `RosterClock` and
   `Roster.evaluate`.
   - Your assignee grouping needs to call `evaluate` per slot, with the
     clock that carries the season.
   - Please make `check-openings`' overlap arm season-aware: a
     winter-only slot and a year-round slot do not overlap.
3. **`restocks`:** our icebox unpack rule is one named branch,
   `unpackIntoCold`, with a plain `cold:` option. Your W7 should carry it
   whole into `BusinessMixin.receiveBench`.
4. **Our ice tools are `Tool` subclasses** with no `constructionForm`.
   They become one-piece Keen hosts under your fold-back. We don't pin
   their `look` text.
5. **Sawdust's `laying`/`weathers` stay unauthored,** which is your
   intended default. The icehouse opts in to weathering later, by
   declaration.
