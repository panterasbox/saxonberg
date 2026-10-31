/**
 * HarborOffice — ⭐ **the room a hail reaches** (harbors P8, P11): the
 * harbor's office on its quay, where the harbormaster keeps the book.
 *
 * A `Locale` sited by the river (`frameSite` authored `landing: false` —
 * no craft comes alongside an office) that answers the kernel's
 * `Hailable` protocol: a ship at the bar hails it (`hail office`), and the
 * answer is its harbor's (`Harbor.answerHail` — the NPC's routine, by the
 * posted criteria). A player holding the seat on shift is told as well.
 */

import Locale from '@saxonberg/server/mud/platform/location/Locale';
import { HailableMixin } from '@saxonberg/server/mud/lib/expanse/Hailable';
import { FrameSitedMixin } from '@saxonberg/server/mud/lib/expanse/FrameSited';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Harbor from '../idea/Harbor';

export default class HarborOffice extends HailableMixin(FrameSitedMixin(Locale)) {
  static fieldMeta: FieldMeta = {
    harbor: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** The port this is the office of, by row path. */
  protected harbor: string | null = null;

  public getHarbor(): string | null { return this.harbor; }
  public setHarbor(v: string | null): void { this.harbor = typeof v === 'string' && v !== '' ? v : null; }

  /** Its harbor, loaded. */
  public async liveHarbor(): Promise<Harbor | null> {
    if (this.harbor === null) return null;
    const h = await StuffApi.singleton<Stuff>(this.harbor).catch(() => null);
    return h instanceof Harbor ? h : null;
  }

  public override hailName(): string {
    return 'the harbor office';
  }

  /** ⭐ The harbor answers by its posted criteria, and whoever keeps the office is told. */
  public override async answerHail(craft: Stuff, _caller: Stuff): Promise<string> {
    const harbor = await this.liveHarbor();
    if (harbor === null) return 'Nobody answers from the harbor.';
    const nowS = WorldClockApi.getNow().rawValue();
    const answer = await harbor.answerHail(craft, nowS);
    await harbor.tellKeepers(craft, answer, nowS);
    return `The harbor office answers: ${answer.words}`;
  }
}
