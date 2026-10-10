/**
 * Pump — **a made, graded, carriable machine that moves a fluid, and holds
 * one packing.** What every pump row names: a hand pump on a village well,
 * a force pump on a hire rack, a pump-maker's stock.
 *
 * `PumpingMixin(StagedMixin(ContainerMixin(CraftedMixin(Good))))`:
 *
 *  - **Good** — you can carry it, sell it and set it in a well: a pump is
 *    fitted, moved and swapped (`put force pump in well`).
 *  - **Crafted** — so a maker's mark and a grade can ride it the day the
 *    assembly build makes a pump a recipe output. No `ToolMixin`: a pump
 *    offers no capability to a recipe.
 *  - **Container + Staged** — it holds its packing, and a row is born
 *    with one (`props: [/trade/tanning/thing/packing]`). The mixin vetoes
 *    everything else into the barrel.
 *
 * ⚠ **No `Switchable`** (a hand pump has no switch) and **no supply** — a
 * powered pump is a pack's subclass that composes its mover
 * (`/system/energy/thing/ElectricPump`); the kernel reads the `Powered`
 * shape structurally and never imports a grid.
 *
 * ⭐ It affords `pump` to the room it lies in, so a loose pump on a floor
 * is still something you can try — and it tells you it is not set in
 * anything, which is where the verb's lesson starts.
 *
 * See [docs/subsystems/pump.md].
 */

import Good from '../../lib/stuff/Good';
import { ContainerMixin } from '../../lib/spatial/Container';
import { StagedMixin } from '../../lib/stuff/Staged';
import { CraftedMixin } from '../../lib/craft/Crafted';
import { PumpingMixin } from '../../lib/pump/Pumping';
import type { CommandContributions } from '../../api/command';

const PumpBase = PumpingMixin(StagedMixin(ContainerMixin(CraftedMixin(Good))));

export default class Pump extends PumpBase {
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/device/pump.yaml'],
  };
}
