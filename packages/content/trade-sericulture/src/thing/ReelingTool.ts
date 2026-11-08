/**
 * ReelingTool — ⭐ the instrument that affords `unwind`.
 *
 * Winding a thread off cocoons is sericulture's own act — a hand reel over
 * a pot, or a reeling basin with a fire under it. (It borrowed fishing's
 * `reel` until controllers-are-io D19; one view, one word.) The cocoon
 * stack affords nothing: an instrument confers a verb, furniture and stock
 * do not (and a stack that afforded `unwind` would need a guard to
 * re-narrow it to "only when a reel is near", which is the tell that the
 * host is wrong).
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const UNWIND = ['trade/sericulture/cmd/sericulture/unwind.yaml'];

export default class ReelingTool extends Tool {
  static commandContributions: CommandContributions = {
    environment: UNWIND,
    peers: UNWIND,
  };
}
