/**
 * Still — the distiller's station, and ⭐⭐ **the first thing in the tree
 * that is both a furnace and a vessel.**
 *
 * It was the furnace family's composition alone (`Kiln`/`Forge`'s stack —
 * a `BurnerMixin` appliance holding a steady heat, lit with `ignite`) plus
 * the `still` crafting capability. That was honest as far as it went and
 * it could not run: a pot still is a pot with a fire under it, and this
 * class held no pot.
 *
 * ⛔ **And it had never run.** The `distil` / `brandy` / `grappa` recipes
 * named its capability, but the rows authored no `reserves.fuel`, so
 * `FireLogic` refused to ignite the burner (`not-flammable`),
 * `reachableHeatForImpl` counts only burners that are lit AND fuelled, and
 * every `order distil` had declined `insufficient-heat` for the whole life
 * of the pack. Nothing observable depended on any of it — the counter's
 * gin came off the faucet rows — which is exactly why it went unnoticed.
 * The whiskey build retired those three recipes for four
 * {@link FractionSchedule} rows and made the pot real.
 *
 * **What the three new mixins claim:**
 *
 *   - **`BulkableMixin`** — *a still holds a charge.* `interiorBulk`, with
 *     the capacity per row. `CraftVessel` is the Thermal + Bulkable
 *     precedent; this is the first Burner + Bulkable one.
 *   - **`CraftedMixin`** — *the still carries the identity of what is in
 *     it.* The `Vat`'s own reason: the charge's grade and the charging
 *     hand arrive through the transfer seam and leave again on the draw,
 *     so the bottle names a person and a band.
 *   - **`FractionatingMixin`**, outermost — *this host's interior yields
 *     in ordered fractions as it is drawn.* The draw order IS the boiling
 *     order and cumulative volume is the clock, so there is no separate
 *     receiver and no second timer. Outermost because its policy seams
 *     (`getBulkAvailable`, `debitBulk`, `getBulkPayloadForDraw`) must
 *     shadow Bulkable's.
 *
 * ⭐ No new verb anywhere. `pour` charges it, `ignite` lights it, `pour`
 * draws it off, `smell` reads it. The whole of the cut is where you stop.
 *
 * Ships at `/trade/distilling/thing/Still`.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { LightSourceMixin } from '@saxonberg/server/mud/lib/perception/LightSource';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { BurnerMixin } from '@saxonberg/server/mud/lib/fire/Burner';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { BulkableMixin } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { FractionatingMixin } from '@saxonberg/server/mud/lib/fractionation/Fractionating';

const StillBase = FractionatingMixin(
  BurnerMixin(
    LightSourceMixin(
      ThermalMixin(CraftedMixin(BulkableMixin(ToolMixin(Good)))),
    ),
  ),
);

export default class Still extends StillBase {
  constructor() {
    super();
    this.capabilities = ['still'];
    this.setKeywords(['still', 'pot-still']);
    this.setPrimaryKeyword('still');
    // The pot. Authored capacity per row; the flag is the class's,
    // because a still with no interior is not a still.
    (this as unknown as { interiorBulk: boolean }).interiorBulk = true;
  }
}
