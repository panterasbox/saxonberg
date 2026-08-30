/**
 * Muddler — the bar tool that muddles: it affords `muddle`, and that is
 * the whole reason it is a class rather than a row over `ToolItem`.
 *
 * ⭐ A verb an object affords is a property of what the object IS, so it
 * is declared exactly once, on the class, as `static
 * commandContributions`. The row keeps what genuinely varies per
 * instance — the working this muddler performs (`technique: muddled`),
 * its material, its mass.
 *
 * Ships in the hospitality pack because `muddle` is a hospitality view:
 * each pack's classes name only its own verbs, so the kernel can never
 * name a trade's vocabulary.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const MUDDLE = ['trade/hospitality/cmd/crafting/muddle.yaml'];

export default class Muddler extends ToolItem {
  static commandContributions: CommandContributions = {
    environment: MUDDLE,
    peers: MUDDLE,
  };
}
