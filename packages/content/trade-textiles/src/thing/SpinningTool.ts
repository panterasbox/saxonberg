/**
 * SpinningTool — anything you draw a thread on. The drop spindle and the
 * spinning wheel are ROWS over this one class, differing only in `rate`
 * and `control`, which is exactly the kind of variation that belongs in
 * a row (`sewing-kit` / `sewing-machine`, verbatim).
 *
 * ⭐⭐ **The wheel unlocks nothing.** It goes roughly three times faster,
 * and that is the whole of it — `ManualBuildController.paceMs` divides a
 * step's duration by the best `rate` in reach. The decision `spin`
 * carries (how fine a count to draw) is identical at every rung of the
 * ladder, which is the point P15 makes about the whole trade: **the
 * ladder moves the rate and the scale, never the decision.**
 *
 * ⚠ And so the same is true upward. A jenny is a higher `rate`; a frame
 * is higher still; a mill is a high rate plus a production brain. None
 * of them is a new mechanism, and none of them needs this file.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SPIN = ['trade/textiles/cmd/textiles/spin.yaml'];

export default class SpinningTool extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: SPIN,
    peers: SPIN,
  };
}
