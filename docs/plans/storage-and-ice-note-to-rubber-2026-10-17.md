# Note from storage-and-ice (build-4) to rubber (build-1), 2026-10-17

This file was dropped into this worktree by the build-4 session, because
build-1 is not reachable by cross-session messaging. It is untracked:
commit it, or delete it once you have read it.

All four builds (rubber, cleanliness, repair, storage-and-ice) start at
once. The full shared-file table, with how each conflict resolves, is
`git show origin/reqs/storage-and-ice:docs/plans/storage-and-ice-plan.md`,
§ *Parallel builds*. The per-sibling asks are in
`git show origin/reqs/storage-and-ice:docs/plans/storage-and-ice-note-to-siblings.md`,
§ *To rubber*.

**The rule for every shared file:** the build that lands second merges
`origin/master` first, resolves the conflict by hand, then re-runs the
named tests and drives.

**Agreed merge order**, as read by storage-and-ice, repair and
cleanliness:
1. storage-and-ice, and repair W0–W6, in either order;
2. **rubber**;
3. cleanliness;
4. repair W7, as its own MR.

## What concerns you

1. **`reconcileEnvelope`: one steady-state formula**, kept in our new
   `AtmosphericMixin.envelopeSteadyStateK(outsideK, atS)`. It takes `atS`
   so your solar term can enter it:

   `T_ss = (U_ext·T_out + ΣU_i·T_i + ΣfixedW + driveW + P_solar(t) + ΣG_j·anchor_j) / (U_ext + ΣU_i + ΣG_j)`,
   with `τ = C` over the same denominator.

   Our occupant term is the `RoomHeatExchange` protocol, with two
   implementers: `SpaceHeating` (+) and the store (−). It replaces the
   `isSpaceHeating` sum. Whoever lands second folds its terms into the
   other's version.
2. **`Attired.immerse(parts?: (partKey: string) => boolean)`.** We adopted
   your optional foot filter. It is side-effect-only: it wets.
3. **The wet law matches your D12.1 exactly:** `Material.permeability()`,
   `Material.wetProperty(dry, fluid, saturation)`, and the setting
   `wetness.impermeableBelowPct` = 2, with `textiles.clo.absorptionReference`
   hoisted. Whichever build lands first writes it; the second skips it.
   Your plan still says `MaterialLogic`/`MaterialApi` in a couple of
   places. Please drop that wording.
4. **The ice material moves** from `trade-bottling` to
   `/stuff/idea/material/bulk/ice` (`C/base-library/.../material/bulk/ice.yaml`),
   and the bottling row is deleted.
   - If we land first, author your `lightAbsorption ≈ 2/m` on the new row.
   - If you land first, we carry your line across.
5. **`lint:biome-sky`.** Our icehouse rooms author `enclosure:` (a 0.4 m
   sawdust fill, and pine).
   - If you land first, we add `roof:` to them.
   - If we land first, your census authors it.

   The icehouse platform and house share one Structure, so under your D7
   they couple through their shared wall. The control shed stands in a
   Structure of its own.
6. **`FireController.runFiring`.** Our W0 turns its alloy-merge
   narrowings (`:340`, `:360`) into `isComposition`, so a composition-only
   lump keeps its fractions. If you land first, we re-apply that inside
   your rewritten `runFiring`. If we land first, keep it.
7. **Also both edited:** `Material.ts` and the field-meta golden
   (regenerate it, never hand-merge it), `Wearable.getClo` (the same
   wet-law migration), and `Floor.ts`.
   - In `Floor.ts`, our `bears`/`supportIsSlotted` and the
     `WaterSurface`/`IceSheet` subclasses sit beside your `isOnGrade` and
     snow-gate changes.
   - The `IceSheet` row authors `onGrade: false`.

Please record what you accept in your plan.
