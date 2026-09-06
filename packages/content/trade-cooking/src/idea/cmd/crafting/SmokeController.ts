/**
 * SmokeController — `smoke <cut>`: **hang it in the smoke of a low fire.**
 *
 * Drying by another road, and the third hurdle an author gets for free:
 * it needs a fire but a **cool** one, well under the temperature at which
 * the flora starts dying. So smoking preserves without sterilising — the
 * distinction that makes a smoked ham keep and still, if it was
 * contaminated, still make you ill.
 */

import { PreserveController } from './PreserveController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class SmokeController extends PreserveController {
  protected recipeId(): string {
    return 'smoke-cure';
  }

  protected selfLine(output: Stuff) {
    return Mml.compose`You hang ${Mml.thing(output)} in the smoke and bank the fire down low.`;
  }

  protected peerLine(actor: Stuff, output: Stuff) {
    return Mml.compose`${Mml.actor(actor)} hangs ${Mml.thing(output)} in the smoke.`;
  }
}
