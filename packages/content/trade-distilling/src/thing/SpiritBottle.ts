/**
 * SpiritBottle — the distilling trade's stock vessel: `Bottle` with the
 * spirits preset. 0.75 L, **sealed** (a capped spirit keeps — the pour
 * verbs ask `isOpen()`), keywords `bottle` + `spirit`. Every floor row in
 * this pack and its annexes (`/corpo/veshko`'s Volk, `/corpo/hollis`'s
 * private labels) is a row over it; a row's `data:` overrides any preset
 * through the ordinary hydrator.
 *
 * Ships at `/trade/distilling/thing/SpiritBottle` (the capability rung —
 * the file IS the path).
 */

import Bottle from '@saxonberg/server/mud/platform/thing/Bottle';

export default class SpiritBottle extends Bottle {
  constructor() {
    super();
    this.setClosure('sealed');
    this.setKeywords(['bottle', 'spirit']);
    this.setPrimaryKeyword('bottle');
  }
}
