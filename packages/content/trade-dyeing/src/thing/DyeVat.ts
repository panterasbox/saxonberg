/**
 * DyeVat — a bath you dip cloth in, and the pack's whole tool ladder.
 *
 * ⭐ The `sewing-kit` / `sewing-machine` shape for the third time: a
 * **household vat** is rung zero — yours, free, small, poor control — and
 * a **dyehouse vat** is rung N, with `rate` for scale and ⭐ **`control`
 * for EVENNESS**, which is the quality axis this trade already needs.
 *
 * ⭐⭐ Which unifies neatly: **evenness is what the dyehouse sells.**
 * Garment-dyeing at home is the worst stage on the worst equipment and
 * comes out visibly amateur — correct, and another legible social
 * signal. ⚠ It also makes dyeing the DOMESTIC trade and tailoring the
 * professional one: you go to a tailor to be measured, but you recolour
 * your own coat at home. That asymmetry is deliberate — it is what
 * makes "recolour often" actually often.
 */

import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const DYEING = [
  'trade/dyeing/cmd/dyeing/mordant.yaml',
  'trade/dyeing/cmd/dyeing/dye.yaml',
];

export default class DyeVat extends Vat {
  /**
   * ⚠ The verb affordance is a STATIC ON THE CLASS. A row's
   * `commandContributions:` is dead silently — a mistake this codebase
   * has already paid for once.
   */
  static commandContributions: CommandContributions = {
    environment: DYEING,
    peers: DYEING,
  };

  constructor() {
    super();
    this.category = 'dye-vat';
    this.setClosure('open');
    this.setOpen(true);
    this.setKeywords(['vat', 'dye-vat', 'bath', 'pot']);
    this.setPrimaryKeyword('vat');
  }
}
