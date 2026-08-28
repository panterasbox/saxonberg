/**
 * Still — the distiller's station: the furnace family's composition
 * (`Kiln`/`Forge`'s stack — a `FurnaceMixin` appliance holding a steady
 * heat, lit with `ignite`) that is ALSO a crafting tool offering the
 * `still` capability, so a recipe can require it the way a shaken drink
 * requires `shaker`. No shipped recipe names it yet: the distillery build
 * (the supply chain's production half) brings the wash and the run. It
 * ships now so the trade's floor has its tool, and its row is what makes
 * the pack a capability pack with something to stand on.
 *
 * Ships at `/trade/distilling/thing/Still`.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve';
import { LightSourceMixin } from '@saxonberg/server/mud/lib/perception/LightSource';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { FurnaceMixin } from '@saxonberg/server/mud/lib/fire/Furnace';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';

const StillBase = FurnaceMixin(
  LightSourceMixin(ReservedMixin(ThermalMixin(ToolMixin(DetailedMixin(Thing))))),
);

export default class Still extends StillBase {
  constructor() {
    super();
    this.capabilities = ['still'];
    this.setKeywords(['still', 'pot-still']);
    this.setPrimaryKeyword('still');
  }
}
