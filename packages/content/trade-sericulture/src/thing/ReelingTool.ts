/**
 * ReelingTool — ⭐ the instrument that affords `reel` for silk.
 *
 * `reel` is fishing's verb; a rod affords it for line, and this affords
 * the same view for silk — a hand reel over a pot, or a reeling basin with
 * a fire under it. The cocoon stack affords nothing: an instrument confers
 * a verb, furniture and stock do not (and a stack that afforded `reel`
 * would need a guard to re-narrow it to "only when a reel is near", which
 * is the tell that the host is wrong).
 *
 * ⚠ The view key is the fishing pack's — a cross-pack key, which is how a
 * forestry `Panel` names the platform's cultivation views.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const REEL = ['trade/fishing/cmd/fishing/reel.yaml'];

export default class ReelingTool extends Tool {
  static commandContributions: CommandContributions = {
    environment: REEL,
    peers: REEL,
  };
}
