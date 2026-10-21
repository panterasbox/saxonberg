/**
 * SignalBell — ⭐ **a bell you strike under the water** (underwater C5): a
 * diver's way to be heard below where no voice carries. Water carries the
 * note further than air and from no direction you can place (the medium's
 * own sound), so every diver in the column hears it and none can tell
 * where it came from.
 *
 * ⭐ It is rung with the platform's `ring`, which anything with mass
 * affords: the bell only answers how it sounds. One verb per act — tapping
 * a jug to hear a crack and striking a bell to be heard are the same act.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import type { RingSound } from '@saxonberg/server/mud/lib/material/Tangible';

/** A struck bell carries like a shout, and further in water. */
const BELL_DB = 95;

export default class SignalBell extends Good {
  /**
   * @hook ⭐ Struck, it rings loud — and what everybody else hears is the
   * bell, never the hand: under the water the medium carries it to the
   * whole column from no direction anybody can place.
   */
  public override ringSound(): RingSound {
    const base = super.ringSound();
    if (!base.rings) return base;
    return {
      sound: 'a clear note that goes out and out',
      db: BELL_DB,
      rings: true,
      carries: 'A bell rings out, clear and close, from nowhere you can place.',
    };
  }
}
