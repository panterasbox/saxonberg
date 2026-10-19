/**
 * Slate — ⭐ **writing under the water** (underwater C5): a white slate
 * with a grease pencil on a string, the way divers talk below where no
 * voice carries. `jot <words> on slate` scratches them on; anyone can
 * `read slate`. Scratched, not inked: the water does not wash it out.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

/** How much a slate holds before you have to wipe it, characters. */
const SLATE_CHARS = 240;

export default class Slate extends MarkedMixin(Good) {
  static commandContributions: CommandContributions = {
    self: [],
    environment: ['trade/diving/cmd/diving/jot.yaml'],
    peers: [],
  };

  /** ⭐ Scratch `words` on the slate, after what is already there. */
  public jot(by: Stuff, words: string): { ok: true; line: string } | { ok: false; reason: string; line: string } {
    const text = words.trim();
    if (text === '') return { ok: false, reason: 'nothing-to-write', line: 'Write what?' };
    if (this.getContainer() !== by) {
      return { ok: false, reason: 'not-holding', line: 'You need the slate in your hand to write on it.' };
    }
    const before = this.getMarkText().trim();
    const next = before === '' ? text : `${before} / ${text}`;
    if (next.length > SLATE_CHARS) {
      return { ok: false, reason: 'slate-full', line: 'The slate is full. Wipe it first.' };
    }
    this.setMarkText(next);
    return { ok: true, line: `You scratch "${text}" on the slate.` };
  }
}
