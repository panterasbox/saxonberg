/**
 * SurgicalKit — the carried instrument that backs `operate` (an internal
 * wound). The Whetstone shape: a `Tool` whose `surgery` capability the
 * `operate` view's instrument arg asks for by name, contributed OUTWARD to
 * whoever carries it (`environment` bucket). Wears with use like any
 * durable tool.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import { SoilableMixin } from '@saxonberg/server/mud/lib/cleanliness/Soilable';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

// ⭐ Soilable and Contaminable (cleanliness D14): instruments can be
// washed, boiled, flamed — and a kit that is merely washed seeds the wound
// a sterile one does not. The kernel `Tool` stays uncontaminable.
const SurgicalKitBase = AudibleMixin(SoilableMixin(ContaminableMixin(Tool)));

export default class SurgicalKit extends SurgicalKitBase {
  /** Carried, never sideways — the personal-capital rule. */
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/operate.yaml'],
  };

  /** The defining capability — the `operate` view asks `[capability.surgery]`. */
  public override capabilities: string[] = ['surgery'];
}
