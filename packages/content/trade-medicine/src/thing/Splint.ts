/**
 * Splint — the carried instrument that backs `set` (a broken bone). The
 * Whetstone shape: a `ToolItem` whose `splint` capability the `set` view's
 * instrument arg asks for by name, contributed OUTWARD to whoever carries
 * it (`environment` bucket — you set a bone with your own splint, anywhere,
 * and one on a shelf across the room lends you nothing). Wears with use
 * like any durable tool.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SplintBase = AudibleMixin(ToolItem);

export default class Splint extends SplintBase {
  /** Carried, never sideways — the personal-capital rule. */
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/set.yaml'],
  };

  /** The defining capability — the `set` view asks `[capability.splint]`. */
  public override capabilities: string[] = ['splint'];
}
