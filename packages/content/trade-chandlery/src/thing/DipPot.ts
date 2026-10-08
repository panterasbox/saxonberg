/**
 * DipPot — ⭐⭐⭐ **the instrument that affords the verb, which this pack
 * shipped without.**
 *
 * The chandlery's row pointed at the kernel's `CraftVessel`, and a kernel
 * class cannot know a pack's view exists. So **nothing anywhere conferred
 * `dip`**: no `commandContributions` in the whole pack, no kernel
 * reference to the chandlery, and therefore no way for a player standing
 * in the shop to dip a candle. The pack was unreachable — the
 * **affordance** link of the five, which fails closed and silent.
 *
 * ⚠⚠ **And the drive had been passing it.** Checkpoint 14–15 asserted
 * only that the refusal was not `no-recipe` and not `not-learned`; an
 * unknown verb is neither, so a verb that did not exist satisfied the
 * test. *A vacuous assertion looks like a passing one.* The checkpoint
 * asserts the verb is UNDERSTOOD now, which is the thing that was
 * actually in doubt.
 *
 * ⭐ The shape is `GristMill`'s, deliberately and for its stated reason:
 * *a quern in your hands or a mill in the room is what makes `mill`
 * sayable.* A pot of fat over a fire is what makes `dip` sayable, and a
 * second chandlery needs zero pack code — it names this class and gets
 * the verb.
 *
 * ⚠ `peers` AND `environment`, both: the pot is a fixture you stand
 * beside rather than something you hold, so the environment arm is the
 * one that actually fires here; `peers` is kept because a small
 * travelling pot is a legitimate row and should confer the same verb.
 */

import CraftVessel from '@saxonberg/server/mud/platform/thing/CraftVessel';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

/** This pack's one view, named once. */
const DIP_VIEW = 'trade/chandlery/cmd/chandlery/dip.yaml';

export default class DipPot extends CraftVessel {
  /**
   * ⭐ The instrument affords the verb — a static on the class, never a
   * row key: a row's `commandContributions:` is dead silently.
   *
   * ⚠ One entry covers `dip` AND `melt`, because `melt` is an alias on
   * that view rather than a second verb (the collision ladder's first
   * rung). Conferring the VIEW is what carries both words; there is
   * nothing to list twice.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: [DIP_VIEW],
    environment: [DIP_VIEW],
  };
}
