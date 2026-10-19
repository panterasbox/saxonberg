/**
 * RawSilk — a skein of reeled silk, still in its gum, and ⭐ the thread
 * says how it was reeled.
 *
 * `filamentCount` is how many cocoons were reeled together into one
 * thread — the reeler's decision, and the fineness: fewer is finer.
 * `evenness` is how steady the thread runs, and it is the REELER's
 * competence and the reel's control made visible: a master at a basin
 * keeps it even, a novice at a pot does not.
 *
 * It is a `TextileStock` with `yarnCount` 0, so `spin` takes it — that is
 * the throwing, the twist that makes it a yarn — and the material
 * (`raw silk`) carries on down the chain.
 */

import TextileStock from '@saxonberg/content-trade-textiles/src/thing/TextileStock';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';

/** `look skein` — fineness and evenness in words. */
function threadAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof RawSilk)) return text;
  const line = host.threadLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export default class RawSilk extends TextileStock {
  static fieldMeta: FieldMeta = {
    filamentCount: { persistent: true, authorable: true, stackIdentity: true },
    evenness: { persistent: true, authorable: true, stackIdentity: true },
  };

  static markupAugmenters: MarkupAugmenter[] = [threadAugmenter];

  /** Cocoons reeled together into one thread — fewer is finer. */
  public filamentCount = 8;
  /** How steady the thread runs, 0–1. */
  public evenness = 0.5;

  public getFilamentCount(): number {
    return this.filamentCount;
  }
  public setFilamentCount(value: number): void {
    this.filamentCount = Number.isFinite(value) && value > 0 ? Math.round(value) : 8;
  }
  public getEvenness(): number {
    return this.evenness;
  }
  public setEvenness(value: number): void {
    this.evenness = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5;
  }

  /**
   * ⭐ Fineness and evenness in words, never a denier. The count is a
   * thing a reeler says aloud (*six to the thread*), so it may be read.
   */
  public threadLine(): string {
    const n = this.filamentCount;
    const fine = n <= 4 ? 'gossamer-fine' : n <= 7 ? 'fine' : n <= 10 ? 'of a middling weight' : 'coarse';
    const even =
      this.evenness >= 0.75
        ? 'even along its whole length'
        : this.evenness >= 0.55
          ? 'a little uneven in places'
          : 'thick and thin by turns';
    return `A ${fine} thread, ${n} cocoons to it, ${even}.`;
  }
}
