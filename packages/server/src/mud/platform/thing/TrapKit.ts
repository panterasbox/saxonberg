/**
 * TrapKit — the carried, deployable trap (the player-trapper's acquisition,
 * kept deliberately **thin**: no recipe/component economy in v1). A plain
 * `Thing` you obtain ready-made and `arm` into a room or onto an exit; the
 * `arm` controller clones the kit's `trapTemplate` (one of the `/stuff/thing/traps/`
 * generics), sets the deployed trap's concealment from the placer's own
 * `stealth` competence (the shared spine with self-hiding), and stamps the
 * placer on it (`HazardMixin.placedBy`) so a spring is attributable.
 *
 * A kit is consumed on a successful deploy (one trap per kit — the one-shot
 * v1 stance; no rearm, no re-pocketing beyond picking your own un-sprung
 * placed trap back up). The `trapTemplate` is authored on the kit's seed.
 */

import Thing from '../../lib/stuff/Thing';
import type { FieldMeta } from '../../lib/mixin';

export default class TrapKit extends Thing {
  static fieldMeta: FieldMeta = {
    trapTemplate: { persistent: true, authorable: true },
  };

  /**
   * The template path of the `/stuff/thing/traps/` generic this kit deploys (cloned
   * by `arm`). Authored on the kit's seed.
   */
  public trapTemplate = '/stuff/thing/traps/step-dart';

  /** The trap generic this kit deploys (a `/stuff/thing/traps/` template path). */
  public getTrapTemplate(): string {
    return this.trapTemplate;
  }

  public setTrapTemplate(path: string): void {
    this.trapTemplate = path;
  }
}
