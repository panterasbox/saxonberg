/**
 * Frame — ⭐ **a dumb object with one derived sentence**, and that
 * sentence is the reason it exists.
 *
 * *Comb tells you brood.* A frame you pull out of a hive reads back what
 * that hive is doing — brood in the middle, stores at the top, or empty
 * wire waiting to be drawn — and a frame lying on a bench reads as a
 * frame lying on a bench. Nothing is stored on it; the line is read off
 * whatever it is sitting in.
 *
 * ⚠ Not a `Comb`. A frame of brood is not food and nobody eats it; the
 * capped comb you rob is a `Provision` and a different object.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import Hive from './Hive';

export default class Frame extends DetailedMixin(Thing) {
  /**
   * ⭐ The derived line. A frame is the one object in the trade that
   * tells you about its container rather than about itself — which is
   * how a beekeeper actually inspects a colony.
   */
  static markupAugmenters: Array<
    (text: string, host: unknown, viewer: unknown) => string
  > = [
    (text: string, host: unknown): string => {
      const frame = host as Frame;
      const env = (frame as unknown as Stuff & { getContainer?(): Stuff | null })
        .getContainer?.();
      if (!(env instanceof Hive)) return text;
      const line = env.frameReading();
      return line === '' ? text : `${text}\n\n${line}`;
    },
  ];
}
