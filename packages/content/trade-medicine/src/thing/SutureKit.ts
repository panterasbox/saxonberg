/**
 * SutureKit — the carried instrument behind `suture` (D8). A needle and
 * linen thread; the `suture` view asks for its `suture` capability.
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import { AudibleMixin } from '@saxonberg/server/mud/lib/perception/Audible';
import { SoilableMixin } from '@saxonberg/server/mud/lib/cleanliness/Soilable';
import { ContaminableMixin } from '@saxonberg/server/mud/lib/material/Contaminable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

// ⭐ Soilable and Contaminable, as the surgical kit (cleanliness D14): a
// needle can be washed, boiled or flamed, and the wound reads which.
const SutureKitBase = AudibleMixin(SoilableMixin(ContaminableMixin(Tool)));

export default class SutureKit extends SutureKitBase {
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/medical/suture.yaml'],
  };

  public override capabilities: string[] = ['suture'];
}
