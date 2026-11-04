/**
 * TypeCase — the compositor's case (paper D17): the sorts it holds, counted
 * by glyph. ⭐ Type is CAPITAL: the font is persistent state on the case;
 * setting a document debits it, and the type is not there for the next job
 * until the forme is distributed back.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/** A glyph count. */
export type Font = Record<string, number>;

export default class TypeCase extends Good {
  static fieldMeta: FieldMeta = {
    font: { persistent: true, authorable: true },
  };

  /** Sorts in the case, by glyph (lowercase letters, digits, marks). */
  public font: Font = {};

  public getFont(): Readonly<Font> {
    return this.font;
  }

  /** The glyphs `text` needs, counted. Spaces are quads and never run out. */
  public needFor(text: string): Font {
    const out: Font = {};
    for (const ch of text.toLowerCase()) {
      if (/\s/.test(ch)) continue;
      out[ch] = (out[ch] ?? 0) + 1;
    }
    return out;
  }

  /** The first glyph the case runs short of for `need`, or `null`. */
  public shortOf(need: Font): string | null {
    for (const [g, n] of Object.entries(need)) if ((this.font[g] ?? 0) < n) return g;
    return null;
  }

  /** Take `need` out of the case (the caller checked `shortOf`). */
  public debit(need: Font): void {
    const next = { ...this.font };
    for (const [g, n] of Object.entries(need)) next[g] = Math.max(0, (next[g] ?? 0) - n);
    this.font = next;
  }

  /** Put `back` into the case. */
  public credit(back: Font): void {
    const next = { ...this.font };
    for (const [g, n] of Object.entries(back)) next[g] = (next[g] ?? 0) + n;
    this.font = next;
  }
}
