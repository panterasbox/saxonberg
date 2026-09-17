/**
 * SmeltingFurnace — the shaft you CHARGE, and the one thing in the game
 * that affords `smelt`.
 *
 * ⭐ A verb an object affords is a property of what the object IS, so it
 * is declared exactly once, on the class — the `Anvil` shape. A row's
 * `commandContributions:` is read by nothing and fails silently, which
 * is exactly how `smelt` shipped unreachable: the view existed, the
 * controller existed, and no class named the view.
 *
 * ⚠⚠ **The `ContainerMixin` is not decoration.** `smelt` reads the ore
 * and the fuel out of the furnace's own contents and pours the product
 * back into it; a bare {@link Forge} is a `Furnace` and not a
 * `Container`, so the shipped controller's own guard
 * (`isFurnace && isContainer`) could never have passed against one. A
 * furnace you cannot put anything into is a hearth.
 *
 * ⚠ Why a pack class and not a `commandContributions` edit on the
 * kernel's `Forge`: a kernel static naming a trade's view crosses the
 * pack boundary, and the Hearthworks forge — a smith's fire, not a
 * smelter — must not afford `smelt`.
 */

import Forge from '@saxonberg/server/mud/platform/thing/Forge';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SmeltingFurnaceBase = ContainerMixin(Forge);

const SMELTING = ['trade/smelting/cmd/smelting/smelt.yaml'];

export default class SmeltingFurnace extends SmeltingFurnaceBase {
  static commandContributions: CommandContributions = {
    environment: SMELTING,
    peers: SMELTING,
  };
}
