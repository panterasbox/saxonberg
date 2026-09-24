/**
 * Simple — a medicinal herb you steep into a draught (clinical-medicine
 * D10). Extends `Provision`, because a herb IS food-shaped matter: it
 * rots, it can be contaminated. `steepsInto` names the draught Material
 * `steep` produces; the `steep` verb is afforded outward.
 */

import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class Simple extends Provision {
  static commandContributions: CommandContributions = {
    environment: ['trade/medicine/cmd/crafting/steep.yaml'],
  };

  static fieldMeta: FieldMeta = {
    steepsInto: { persistent: true, authorable: true },
  };

  /** The draught Material this simple steeps into (a Material path). */
  public steepsInto: string = '';

  public getSteepsInto(): string {
    return this.steepsInto;
  }
}
