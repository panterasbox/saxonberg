/**
 * Bailer — ⭐⭐ **the carried instrument that affords `bore`, and the
 * reason a bore site can exist before there is anything standing on
 * it.**
 *
 * ## The circularity this class exists to break
 *
 * The derrick affords every act at a hole, which is correct — the
 * instrument affords the verb, and a derrick is the instrument. But
 * **siting** is the act that puts the first rig on a piece of ground,
 * and at that moment there is nothing there to afford it. A derrick
 * cannot be what affords raising a derrick.
 *
 * ⭐ The kernel already blessed this exact split and said why: *`plot` is
 * deliberately NOT afforded by the field — you plot ground that is not
 * yet a field, so a field cannot be what affords it; a spade is. The two
 * halves of the ladder are afforded by the two things that are actually
 * present at each end of it.* A bailer is the spade of this trade: it is
 * the one tool that is on the rig from the first yard to the last, and
 * it is in your hands rather than in the ground.
 *
 * ## ⚠ Why there is no `make derrick`
 *
 * There was, for about an hour, and it was wrong twice. `CraftingLogic`
 * lands a tangible output **at the maker**, so a `fixedInPlace` frame
 * weighing a ton and a half would have arrived in somebody's pocket; and
 * six lengths of mine timber is two hundred and forty kilograms, which
 * no body in this game can carry to a hillside. So the rig is **raised
 * by the siting act** — which is also what happens in the fiction, and
 * what the trade's own thesis says should be cheap: *the expensive part
 * of a bore is never the derrick, it is the fifteen hundred in wages
 * that go down the hole after it.*
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';

/** The capability a bailer affords. An open vocabulary, like every other. */
export const BAILING = 'bailing';

export default class Bailer extends Tool {
  /**
   * ⚠⚠ **The affordance is this static and nothing else.** A row's
   * `commandContributions:` is dead silently; two builds in this repo
   * shipped exactly that failure. Without this block, somebody standing
   * on staked ground holding a bailer types `bore` and is told *"I don't
   * understand 'bore'."*
   *
   * ⚠⚠ **`environment`, and `inventory` was WRONG** — the buckets name
   * WHO RECEIVES, from the declaring object's point of view. `inventory`
   * is *everything nested inside this object* (a pack affords `rummage`
   * to what it swallowed), so a bailer declaring `inventory` granted
   * `bore` to whatever was inside the bailer. `environment` is *its
   * container chain, outward* — the doc's own example is a wand in your
   * hand granting YOU `zap`, which is exactly this. The drive found it:
   * a player holding a bailer on staked ground typed `bore` and was told
   * *I don't understand 'bore'.*
   *
   * ⭐ And `peers` beside it, so a bailer lying at the wellhead works
   * too. Putting your tools down at the rig should not take the verbs
   * away.
   */
  static commandContributions = {
    environment: [
      'trade/drilling/cmd/drilling/bore.yaml',
      'trade/drilling/cmd/drilling/bail.yaml',
      'trade/drilling/cmd/drilling/line.yaml',
    ],
    peers: [
      'trade/drilling/cmd/drilling/bore.yaml',
      'trade/drilling/cmd/drilling/bail.yaml',
      'trade/drilling/cmd/drilling/line.yaml',
    ],
  };
}
