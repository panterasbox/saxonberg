/**
 * The Jamaica train — ⭐ four copper kettles in a row over ONE long flue
 * and one fire (sugar D17). Built of parts, so it burns better the more of
 * it is sound: the heat a kettle on it takes is the train's
 * `heatTransferFraction`, derived from its bill — 0.8 whole, 0.15 less for
 * every kettle missing or failed. An open kettle over a plain arch takes
 * 0.3. That difference, on the island's bagasse and wood, IS the lesson:
 * the train burns less wood for the same sugar.
 */

import Oven from '@saxonberg/server/mud/platform/thing/Oven';
import { AssembledMixin } from '@saxonberg/server/mud/lib/craft/Assembled';

/** A whole train's share of the fire that reaches its kettles. */
const WHOLE = 0.8;
/** What each missing or failed kettle costs it. */
const PER_KETTLE = 0.15;
const KETTLES = 4;

export default class Train extends AssembledMixin(Oven) {
  public override getHeatTransferFraction(): number {
    const kettles = this.getParts().filter((l) => l.part === 'kettle');
    const sound = kettles.reduce((n, l) => n + Math.max(0, l.count - l.failed), 0);
    const missing = Math.max(0, KETTLES - sound);
    return Math.max(0.05, WHOLE - PER_KETTLE * missing);
  }
}
