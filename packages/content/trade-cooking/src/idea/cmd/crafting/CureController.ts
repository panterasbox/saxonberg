/**
 * CureController — `cure <cut>`: **pack it in salt.**
 *
 * The salting hurdle. Salt is drawn from a reachable sack and consumed,
 * which is what finally makes it the keystone commodity mining always
 * said it was; the cut comes back with its `solute` raised, keeping far
 * longer at the same temperature.
 *
 * ⚠ Curing **suspends the population; it does not kill it.** Nothing here
 * touches the microbial load or anything living on the meat — a cured cut
 * that was contaminated is a cured cut that is still contaminated, a
 * season later. That is the counterpart to *heat kills the population but
 * not what it made*, and between them they are the curriculum.
 */

import { PreserveController } from './PreserveController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class CureController extends PreserveController {
  protected recipeId(): string {
    return 'salt-cure';
  }

  protected selfLine(output: Stuff) {
    return Mml.compose`You pack ${Mml.thing(output)} down in salt and leave it to take.`;
  }

  protected peerLine(actor: Stuff, output: Stuff) {
    return Mml.compose`${Mml.actor(actor)} packs ${Mml.thing(output)} down in salt.`;
  }
}
