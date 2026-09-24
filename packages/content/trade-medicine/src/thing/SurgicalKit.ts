/**
 * SurgicalKit — the carried instrument that backs `operate` (an internal
 * wound). The Whetstone shape: a `ToolItem` whose `surgery` capability the
 * `operate` view's instrument arg asks for by name, contributed OUTWARD to
 * whoever carries it (`environment` bucket). Wears with use like any
 * durable tool.
 */

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SurgicalKitBase = AudibleMixin(ToolItem);

export default class SurgicalKit extends SurgicalKitBase {
  /** Carried, never sideways — the personal-capital rule. */
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/operate.yaml'],
  };

  /** The defining capability — the `operate` view asks `[capability.surgery]`. */
  public override capabilities: string[] = ['surgery'];
}
