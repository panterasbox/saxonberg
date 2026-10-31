/**
 * HarborBook — ⭐ **the berth book on the harbor office's desk** (harbors
 * P11): who has been given which quay, and since when, read off the
 * harbor it belongs to. `look book` reads it.
 *
 * A fixture. It is where the harbormaster's acts are afforded (`berth
 * <ship> at <quay>`, `berth <ship> roads` — to whoever stands at it; the
 * verb refuses anyone not keeping the harbor on shift) and what dues are
 * paid at (`Payable`, P13: `pay book`; the office itself answers `pay
 * office` with the same bills).
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { PayableMixin, type Bill } from '@saxonberg/server/mud/lib/banking/Payable';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import Harbor from '../idea/Harbor';

export default class HarborBook extends PayableMixin(Good) {
  /** ⭐ The harbormaster's call is made at the book (P11). */
  static commandContributions: CommandContributions = {
    peers: ['system/transport/cmd/harbor/berth.yaml'],
  };

  static fieldMeta: FieldMeta = {
    harbor: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** ⭐ The book's page, read off the harbor (derived — never written here). */
  static markupAugmenters: MarkupAugmenter[] = [bookAugmenter];

  /** The port whose book this is, by row path. */
  protected harbor: string | null = null;

  public getHarbor(): string | null { return this.harbor; }
  public setHarbor(v: string | null): void { this.harbor = typeof v === 'string' && v !== '' ? v : null; }

  /** Its harbor, loaded (the hail and the bill are uses). */
  public async liveHarbor(): Promise<Harbor | null> {
    if (this.harbor === null) return null;
    const h = await StuffApi.singleton<Stuff>(this.harbor).catch(() => null);
    return h instanceof Harbor ? h : null;
  }

  /** ⭐ What `payer` owes at this office (P13) — the harbor's to say. */
  public override async billsFor(payer: Stuff): Promise<Bill[]> {
    const harbor = await this.liveHarbor();
    return harbor === null ? [] : harbor.billsFor(payer, WorldClockApi.getNow().rawValue());
  }

  public override async onPaid(bill: Bill, _payer: Stuff): Promise<void> {
    const harbor = await this.liveHarbor();
    if (harbor === null) throw new Error(`HarborBook ${this.getTemplatePath()}: paid a bill with no harbor to mark it in`);
    await harbor.onPaid(bill, WorldClockApi.getNow().rawValue());
  }

  /** The book's lines as they stand now, in words — `[]` while the harbor is not loaded. */
  public pageLines(): string[] {
    if (this.harbor === null) return [];
    const harbor = StuffApi.findByTemplatePath<Stuff>(this.harbor);
    if (!(harbor instanceof Harbor)) return [];
    const nowS = WorldClockApi.getNow().rawValue();
    const lines = harbor.getBook(nowS).map((r) => {
      const quay = StuffApi.findByTemplatePath<Stuff>(r.quay)?.getPresentation() ?? r.quay.slice(r.quay.lastIndexOf('/') + 1);
      if ((r.leftAtS ?? null) !== null) return `${r.name}: left ${quay} with dues owing.`;
      if (r.sinceS === null) return `${r.name}: given ${quay}, coming in.`;
      const owed = harbor.duesOwedOn(r.ship, nowS);
      return owed > 0 ? `${r.name}: alongside ${quay}, ${owed} in dues owing.` : `${r.name}: alongside ${quay}, dues paid.`;
    });
    // ⭐ Who was sent to the roads, and why (A2) — the harbormaster names them from here.
    for (const h of harbor.roadsHails(nowS)) lines.push(`${h.name}: sent to the roads — ${h.words}`);
    return lines;
  }
}

/** Today's page: every ship in the book, or that it is empty. */
function bookAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof HarborBook)) return text;
  const lines = host.pageLines();
  const page = lines.length === 0 ? "Today's page is empty." : `Today's page:\n${lines.join('\n')}`;
  return text && text.length > 0 ? `${text}\n\n${page}` : page;
}
