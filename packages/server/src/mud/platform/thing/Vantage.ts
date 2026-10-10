/**
 * Vantage — a place on land from which an author says *you can see that*.
 *
 * ⭐ On land the claim is AUTHORED, because what is in the way is not
 * modelled and a computed claim would be confidently wrong. A headland
 * overlooks a bay; the author says so by standing a Vantage on it and
 * citing the bay, and `look` believes it. Only at sea does the engine
 * compute a range (`ExpanseApi.sightRangeNm`), because nothing is in the
 * way there.
 *
 * `overlooks` cites rows — a Structure, an expanse node, the expanse
 * itself — and the vantage contributes each one's `outsideDescription`
 * to the room's prose (`RoomContributorMixin`), so the bay is described
 * once, on the bay, and read from the headland. A row with no outside
 * description contributes nothing rather than a placeholder.
 *
 * A fixture: authored `fixedInPlace: true`, like a ladder.
 */

import Good from '../../lib/stuff/Good';
import { RoomContributorMixin } from '../../lib/description/RoomContributor';
import { Template } from '../../lib/stuff/Template';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { FieldMeta } from '../../lib/mixin';

export default class Vantage extends RoomContributorMixin(Good) {
  static fieldMeta: FieldMeta = {
    overlooks: { persistent: true, authorable: true },
  };

  /** Row paths of what can be seen from here. */
  protected overlooks: string[] = [];

  public getOverlooks(): string[] { return [...this.overlooks]; }
  public setOverlooks(value: string[] | null): void {
    this.overlooks = Array.isArray(value)
      ? value.filter((v) => typeof v === 'string' && v.length > 0)
      : [];
  }

  /** The outside of everything this vantage overlooks, in citation order. */
  override async contributeToRoom(_viewer: Stuff): Promise<string | null> {
    if (this.overlooks.length === 0) return null;
    const lines: string[] = [];
    const rows = new Map(
      (await Template.findByPaths(this.overlooks)).map((t) => [t.path, t]),
    );
    for (const path of this.overlooks) {
      const tpl = rows.get(path);
      if (tpl === undefined) continue;
      const d = (tpl.data ?? {}) as Record<string, unknown>;
      const text = typeof d.outsideDescription === 'string'
        ? d.outsideDescription.trim()
        : '';
      if (text !== '') lines.push(text);
    }
    return lines.length > 0 ? lines.join(' ') : null;
  }
}
