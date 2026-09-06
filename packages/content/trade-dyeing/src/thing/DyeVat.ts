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
    /*
     * ⚠⚠ `liquidTight`, NOT `open` — and the distinction cost this
     * build a whole live drive.
     *
     * `closure` is the RETENTION axis: `BulkableLogic.requiredClosureFor`
     * returns `liquidTight` for every material there is ("v1 has only
     * liquid"), so anything poured into an `open` interior drains
     * straight through to the floor. The LID is the other axis
     * entirely — `Sealable`'s `setOpen(true)`, which is what "no lid,
     * open to the air" actually means, and what the over-ret / the
     * unsealed ferment read.
     *
     * Authored `open` here on the reasoning "a pit in the ground has no
     * lid", and the result was a vessel that could never hold anything:
     * `pour sheaf into pit` answered "The liquid runs straight through
     * a retting pit and pools on the floor", the straw was destroyed,
     * and the chain's first stage was unrunnable. No unit test caught
     * it because the pack's tests build the pit's contents directly
     * instead of pouring into it.
     */
    this.setClosure('liquidTight');
    // A copper with no lid: unsealed, but it certainly holds its bath.
    this.setOpen(true);
    this.setKeywords(['vat', 'dye-vat', 'bath', 'pot']);
    this.setPrimaryKeyword('vat');
  }
}
