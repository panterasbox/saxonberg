/**
 * LoftedSawmill — a sawmill with a **drying loft** over its saw floor
 * (assembly D15, AC 25): a space inside the mill with its own warm, dry
 * air, where boards stacked IN it season faster than in the yard beside
 * it.
 *
 * ⭐ Its own class because the loft is a claim about the BUILDING, not
 * about sawing: a pit saw is a blade and has nowhere to put a board, so
 * `ChamberedMixin` on `Sawmill` itself would have given every pit saw an
 * empty compartment (the base-class narrowing — compose a mixin on the
 * narrow class that IS the thing, never on the family).
 *
 * ⚠⚠ The statics SHADOW down a base-class chain, so the parent's `saw`
 * affordance is restated here or the mill would stop offering it.
 */

import Sawmill from './Sawmill';
import { ChamberedMixin } from '@saxonberg/server/mud/lib/spatial/Chambered';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const LoftedSawmillBase = ChamberedMixin(Sawmill);

export default class LoftedSawmill extends LoftedSawmillBase {
  static commandContributions: CommandContributions =
    Sawmill.commandContributions as CommandContributions;
}
