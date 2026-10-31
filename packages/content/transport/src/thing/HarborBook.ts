/**
 * HarborBook — ⭐ **the berth book on the harbor office's desk** (harbors
 * P11): who has been given which quay, and since when, read off the
 * harbor it belongs to. `look book` reads it.
 *
 * A fixture. It is where the harbormaster's acts will be afforded (`berth
 * <ship> at <quay>`) and what dues are paid at (`Payable`) — the seams the
 * next waves of the build attach here.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import Harbor from '../idea/Harbor';

export default class HarborBook extends Good {
  static fieldMeta: FieldMeta = {
    harbor: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /** ⭐ The book's page, read off the harbor (derived — never written here). */
  static markupAugmenters: MarkupAugmenter[] = [bookAugmenter];

  /** The port whose book this is, by row path. */
  protected harbor: string | null = null;

  public getHarbor(): string | null { return this.harbor; }
  public setHarbor(v: string | null): void { this.harbor = typeof v === 'string' && v !== '' ? v : null; }

  /** The book's lines as they stand now, in words — `[]` while the harbor is not loaded. */
  public pageLines(): string[] {
    if (this.harbor === null) return [];
    const harbor = StuffApi.findByTemplatePath<Stuff>(this.harbor);
    if (!(harbor instanceof Harbor)) return [];
    const nowS = WorldClockApi.getNow().rawValue();
    return harbor.getBook(nowS).map((r) => {
      const quay = StuffApi.findByTemplatePath<Stuff>(r.quay)?.getPresentation() ?? r.quay.slice(r.quay.lastIndexOf('/') + 1);
      if ((r.leftAtS ?? null) !== null) return `${r.name}: left ${quay} with dues owing.`;
      return r.sinceS === null ? `${r.name}: given ${quay}, coming in.` : `${r.name}: alongside ${quay}.`;
    });
  }
}

/** Today's page: every ship in the book, or that it is empty. */
function bookAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof HarborBook)) return text;
  const lines = host.pageLines();
  const page = lines.length === 0 ? "Today's page is empty." : `Today's page:\n${lines.join('\n')}`;
  return text && text.length > 0 ? `${text}\n\n${page}` : page;
}
