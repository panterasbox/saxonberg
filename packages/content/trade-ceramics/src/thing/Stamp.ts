/**
 * Stamp — ⭐ a potter's die: a little fired-clay seal cut with a mark, the
 * thing `impress stamp on jug` presses into a leather-hard base (ceramics
 * S5). Its face bears a DEVICE (`MarkedMixin` — whose mark: `markDevice` on
 * a row that ships a known potter's die, or, for one somebody cut, its
 * maker), and the pot takes that device.
 *
 * It affords `impress` itself (a static on the CLASS — a row's
 * `commandContributions:` is dead silently), held or lying on the bench.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const MARKING = ['platform/cmd/crafting/impress.yaml'];

export default class Stamp extends MarkedMixin(CraftedMixin(Good)) {
  static commandContributions: CommandContributions = {
    environment: MARKING,
    peers: MARKING,
  };

  /** The device is cut into the face — raised, felt as well as seen. */
  public override markForm = 'embossed';

  /** ⭐ Whose mark the face is cut with — authored, else whoever cut it. */
  public override getMarkDevice(): string {
    return super.getMarkDevice() || this.getMaker();
  }
}
