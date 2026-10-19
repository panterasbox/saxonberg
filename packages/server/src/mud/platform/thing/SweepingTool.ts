/**
 * SweepingTool — **what sweeps and brushes** (cleanliness D15, D18, B46):
 * a broom, a flue brush and its rods, a clothes brush, a carpet beater.
 * `sweep` (and `muck`, the byre's word for it) is the instrument's verb,
 * not the room's — a broom in your hand means you can sweep anywhere, and the floor's own kind decides what that does (a
 * strewn earth floor gives up everything, a scrubbed one its debris); a
 * flue brush up a chimney sweeps the flue.
 *
 * ⭐ Rows, not subclasses, for the variants: the broom and the flue brush
 * are rows on this class, told apart by their `capabilities`
 * (`sweeping` · `flue-brushing`), which is what the view's `tool` arg reads.
 */

import Tool from './Tool';
import type { CommandContributions } from '../../api/command';

export default class SweepingTool extends Tool {
  static commandContributions: CommandContributions = {
    // `environment` — to whoever HOLDS it (`sweep` takes its tool from your
    // hands, then the room).
    environment: [
      'platform/cmd/inventory/sweep.yaml',
      // A brush brushes things (B46): a coat, a cushion, a rug beaten.
      'platform/cmd/inventory/brush.yaml',
    ],
  };
}
