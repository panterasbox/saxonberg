/**
 * Boundary — the concrete twin of the substrate `Boundary`: a way's
 * boundary that opens and shuts and has no bolt.
 *
 * A curtain across an arch, a shutter you cannot bar, a fixed grating
 * (authored `open: true`, refusing `close` by its row). Anything with a
 * bolt is a `Door`; a pane of glass between two places is a `Window`. Both
 * extend this. Shares the base's name — the default for a twin (CLAUDE.md
 * § Instanceable Lives in `platform/<branch>/`).
 *
 * ⭐ `fixed: true` on a row is the fixed grating's honest "no": it is always
 * open and `close` refuses with the reason (owner's call, 2026-11-09 — no
 * third twin for one flag).
 */

import { Boundary as BoundaryBase } from '../../lib/boundary/Boundary';
import { SealableMixin } from '../../lib/spatial/Sealable';
import type { FieldMeta } from '../../lib/mixin';
import type { VetoResult } from '../../lib/errors';
import type { Stuff } from '../../lib/stuff/Stuff';
import { GrammarApi } from '../../api/grammar';

export default class Boundary extends SealableMixin(BoundaryBase) {
  static fieldMeta: FieldMeta = {
    fixed: { persistent: true, authorable: true },
  };

  /** A boundary fixed open — a grating: it never shuts. */
  public fixed = false;

  public isFixed(): boolean {
    return this.fixed;
  }

  public setFixed(value: boolean): void {
    this.fixed = value === true;
  }

  public override canClose(by: Stuff): VetoResult {
    if (this.fixed) {
      return { ok: false, reason: `${GrammarApi.cap(this.getPresentation())} is fixed open; it does not shut.` };
    }
    return super.canClose(by);
  }
}
