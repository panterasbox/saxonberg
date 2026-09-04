/**
 * SewingTool — what `sew` and `alter` are done WITH: a needle.
 *
 * ⭐⭐ **This is the correction the build most needed.** `sew` and
 * `alter` were afforded by the CUTTING TABLE, which is furniture and
 * has nothing to do with sewing — you sew with a needle, on your knee,
 * in a chair, at a campfire. Worse, the split ran the wrong way in both
 * directions: a player holding a sewing kit in a field was offered no
 * `sew` at all, and a player standing at the shipped **sewing machine**
 * — the rate-3 tool the whole capability table exists to demonstrate —
 * was offered none either. The kit and the machine carried the
 * capability; the table carried the affordance; neither carried both.
 *
 * ⭐ **Extends `MendingTool` rather than `ToolItem`**, so a tailor's
 * needle-case affords `repair` and `salvage` too and carries the
 * `mending` capability the sew step already resolves. A thing that can
 * sew a coat together can obviously also mend one, and saying so in the
 * type is cheaper and truer than restating the capability on the row.
 *
 * ⚠ The general store's `sewing-kit` and `sewing-machine` stay
 * `MendingTool` and are NOT re-pointed here, because `trade-tailoring`
 * DEPENDS ON `terminus` — a terminus row naming a tailoring class is
 * the dependency backwards. That is the right answer anyway: a general
 * soft-goods kit mends anything, and the trade sells its own
 * instrument. Both still pace the step, because `findCapability` ranks
 * on the `mending` capability and does not care which class carries it.
 *
 * ⚠ The verb affordance is a STATIC ON THE CLASS; a row's
 * `commandContributions:` is dead silently.
 */

import MendingTool from '@saxonberg/server/mud/platform/thing/MendingTool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const TAILORING = [
  'trade/tailoring/cmd/tailoring/sew.yaml',
  'trade/tailoring/cmd/tailoring/alter.yaml',
  /*
   * ⚠⚠ Restated, and they MUST be. `bucketFilenames` unions a class's
   * own `commandContributions` with every MIXIN in its chain — but a
   * base CLASS is not a mixin, and `getContributions` is a plain
   * property read, so this static shadows `MendingTool`'s outright.
   * Mixins union; base classes shadow. Dropping these two lines would
   * silently take `repair` and `salvage` off every needle-case, with
   * nothing to say so.
   */
  'platform/cmd/crafting/repair.yaml',
  'platform/cmd/crafting/salvage.yaml',
];

export default class SewingTool extends MendingTool {
  static commandContributions: CommandContributions = {
    environment: TAILORING,
    peers: TAILORING,
  };
}
