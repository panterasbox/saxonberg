/**
 * Stamp — ⭐ a potter's die: a little fired-clay seal cut with a mark, the
 * thing `impress stamp on jug` presses into a leather-hard base (ceramics
 * S5). The pot keeps WHOSE mark it is — the stamp's `markOf` (authored on a
 * row that ships a known potter's die) or, for one somebody cut, its maker.
 *
 * It affords `impress` itself (a static on the CLASS — a row's
 * `commandContributions:` is dead silently), held or lying on the bench.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const MARKING = ['platform/cmd/crafting/impress.yaml'];

export default class Stamp extends CraftedMixin(Good) {
  static commandContributions: CommandContributions = {
    environment: MARKING,
    peers: MARKING,
  };

  static fieldMeta: FieldMeta = {
    markOf: { persistent: true, authorable: true },
  };

  /** Whose mark the die was cut with — an identity path; `''` = its maker's. */
  public markOf = '';

  /** ⭐ The identity a pot pressed with this carries (`Impressible` reads it). */
  public markIdentity(): string {
    return this.markOf || this.getMaker();
  }
}
