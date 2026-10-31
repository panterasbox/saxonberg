/**
 * HailableMixin — ⭐ **a place that answers a hail** (harbors P8): a harbor
 * office a ship at the bar can raise on the signal channel, flags by day
 * and a lamp by night, at a range that does not care how high you stand.
 *
 * A hail is a directed act at something in reach of the signal channel,
 * never through MQL (it is not in the room). The frame the craft is in
 * names what answers near her (`Frame.hailables`) — a river the places on
 * its line, the sea through the rivers at its nodes — and `hail <word>`
 * reaches the first whose words it matches before it looks among the sails
 * in sight.
 *
 * ⛔ Not on `Locale`: a kitchen does not answer a hail. A class composes
 * this only when the place keeps a watch on the water and somebody there
 * answers for it.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';

export interface Hailable {
  /** What the craft calls it — `the harbor office`. */
  hailName(): string;
  /** Does `word` (lowercased, the article dropped) name it? */
  answersTo(word: string): boolean;
  /**
   * ⭐ `caller`, aboard `craft`, hails it: the answer, in words, as the
   * caller hears it. Whoever keeps the watch there may be told as well.
   */
  answerHail(craft: Stuff, caller: Stuff): Promise<string>;
}

export function HailableMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HailableMixin extends Base implements Hailable {
    static _mixinName: string = 'HailableMixin';

    /** @hook What a hail calls it. Default: its presentation. */
    public hailName(): string {
      return (this as unknown as Stuff).getPresentation();
    }

    /**
     * Matched against its hail name and its keywords — `hail office`,
     * `hail harbor`, `hail harbor office`.
     */
    public answersTo(word: string): boolean {
      const w = word.trim().toLowerCase().replace(/^the\s+/, '');
      if (w === '') return false;
      if (this.hailName().toLowerCase().includes(w)) return true;
      const self = this as unknown as Stuff;
      const keys = MixinApi.isPerceptible(self) ? self.getKeywords() : [];
      return keys.some((k) => k.toLowerCase() === w);
    }

    /** @hook Override: what the place says back. Default: nobody answers. */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async answerHail(_craft: Stuff, _caller: Stuff): Promise<string> {
      return 'Nobody answers.';
    }
  };
}
