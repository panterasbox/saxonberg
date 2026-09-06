/**
 * DryController — `dry <cut>`: **hang it up and let the air have it.**
 *
 * The drying hurdle: the same lever as salting seen from the other side —
 * take the water away rather than binding it — so the two multiply, and a
 * cut that is both salted and dried keeps better than one that is either.
 *
 * ⚠ And it is the one that **reverses**. Drying costs nothing but time
 * and gives its benefit back in damp air, which is why a dry store is
 * worth building and why hanging a ham in a steamy kitchen is a mistake
 * you make exactly once.
 */

import { PreserveController } from './PreserveController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class DryController extends PreserveController {
  protected recipeId(): string {
    return 'air-dry';
  }

  protected selfLine(output: Stuff) {
    return Mml.compose`You hang ${Mml.thing(output)} up to dry.`;
  }

  protected peerLine(actor: Stuff, output: Stuff) {
    return Mml.compose`${Mml.actor(actor)} hangs ${Mml.thing(output)} up to dry.`;
  }
}
