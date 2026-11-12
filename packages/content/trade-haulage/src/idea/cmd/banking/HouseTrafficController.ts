/**
 * HouseTrafficController — `house traffic` — which corridor segments
 * your loads crossed most, busiest first, counted off the bills (over
 * {@link HouseFreightControllerBase}).
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import {
  HouseFreightControllerBase,
  type FreightModel,
} from './HouseFreightControllerBase';

export default class HouseTrafficController extends HouseFreightControllerBase {
  async execute(model: FreightModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const paper = await this.paperFor(model, context);
    if (!paper) return;
    const { house, registry, query } = paper;
    const traffic = await registry.trafficOf(house, query);
    if (traffic.length === 0) {
      return this.tell(giver, 'Nothing of yours has been on a road yet.');
    }
    // ⭐⭐ Derived, and there is no counter anywhere in the realm to go
    // stale: nobody authors that the valley road is busy — it is busy
    // because the goods go down it, and if the mine closes it stops
    // being busy on its own.
    const lines = traffic.map(
      (t) =>
        `  ${HouseTrafficController.leafOf(t.from)} → ${HouseTrafficController.leafOf(t.to)} — ${t.crossings} ` +
        `${t.crossings === 1 ? 'load' : 'loads'}`,
    );
    return this.tell(
      giver,
      `What your loads have crossed, busiest first:\n${lines.join('\n')}\n\n` +
        `Counted off the bills. Nobody keeps a tally of the road itself.`,
    );
  }
}
